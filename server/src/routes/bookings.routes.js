import { Router } from 'express'
import { z } from 'zod'
import { query, withTransaction } from '../db/pool.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { ApiError } from '../middleware/errorHandler.js'
import { sendNotification } from '../notifications/index.js'
import { findUserById } from '../services/users.js'

export const bookingsRouter = Router()
bookingsRouter.use(requireAuth)

const STATUS_FLOW = ['not_started', 'in_progress', 'completed']
const STATUS_ALERT = {
  in_progress: (b) => `Your concierge is on the way and has started your ${b.service_label} visit.`,
  completed: (b) => `Your concierge has completed your ${b.service_label} visit. Thank you!`,
}

function formatTimeOfDay(hhmmss) {
  const [h, m] = hhmmss.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = h % 12 === 0 ? 12 : h % 12
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

const createBookingSchema = z.object({
  serviceCode: z.string(),
  requestedDate: z.string(), // YYYY-MM-DD
  timeBlockCode: z.enum(['morning', 'afternoon', 'evening']),
  notes: z.string().max(2000).optional(),
})

function bookingRowToApi(row) {
  return {
    id: row.id,
    seniorId: row.senior_id,
    conciergeId: row.concierge_id,
    serviceId: row.service_code,
    serviceLabel: row.service_label,
    status: row.status,
    date: row.requested_date,
    timeBlockId: row.time_block_code,
    timeLabel: `${row.time_block_label}, ${formatTimeOfDay(row.time_block_start)} - ${formatTimeOfDay(row.time_block_end)}`,
    notes: row.notes,
    eta: row.eta, // ISO timestamp or null; frontend formats for display
    seniorName: row.senior_name,
    address: row.senior_address,
    conciergeName: row.concierge_name,
    createdAt: row.created_at,
  }
}

const BOOKING_SELECT = `
  SELECT b.*,
         st.code AS service_code, st.label AS service_label,
         tb.code AS time_block_code, tb.label AS time_block_label,
         tb.start_time AS time_block_start, tb.end_time AS time_block_end,
         su.full_name AS senior_name, sp.address_line AS senior_address,
         cu.full_name AS concierge_name
  FROM bookings b
  JOIN service_types st ON st.id = b.service_type_id
  JOIN time_blocks tb ON tb.id = b.time_block_id
  JOIN users su ON su.id = b.senior_id
  LEFT JOIN senior_profiles sp ON sp.user_id = su.id
  LEFT JOIN users cu ON cu.id = b.concierge_id
`

bookingsRouter.get('/', async (req, res, next) => {
  try {
    const column = req.user.role === 'concierge' ? 'b.concierge_id' : 'b.senior_id'
    const { rows } = await query(
      `${BOOKING_SELECT} WHERE ${column} = $1 ORDER BY b.created_at ASC`,
      [req.user.sub],
    )
    res.json(rows.map(bookingRowToApi))
  } catch (err) {
    next(err)
  }
})

bookingsRouter.post('/', requireRole('senior'), async (req, res, next) => {
  try {
    const body = createBookingSchema.parse(req.body)

    const booking = await withTransaction(async (client) => {
      const service = await client.query('SELECT * FROM service_types WHERE code = $1 AND is_active', [body.serviceCode])
      if (!service.rows[0]) throw new ApiError(400, `Unknown service "${body.serviceCode}"`)

      const timeBlock = await client.query('SELECT * FROM time_blocks WHERE code = $1', [body.timeBlockCode])
      if (!timeBlock.rows[0]) throw new ApiError(400, `Unknown time block "${body.timeBlockCode}"`)

      const assignment = await client.query(
        `SELECT concierge_id FROM senior_concierge_assignments WHERE senior_id = $1 ORDER BY is_primary DESC LIMIT 1`,
        [req.user.sub],
      )
      const conciergeId = assignment.rows[0]?.concierge_id ?? null

      // Placeholder ETA: the start of the requested time block. A real
      // implementation would derive this from the concierge's actual
      // route/schedule (see IMPROVEMENTS.md).
      const eta = new Date(`${body.requestedDate}T${timeBlock.rows[0].start_time}`)

      const inserted = await client.query(
        `INSERT INTO bookings (senior_id, concierge_id, service_type_id, requested_date, time_block_id, status, notes, eta)
         VALUES ($1, $2, $3, $4, $5, 'not_started', $6, $7)
         RETURNING id`,
        [req.user.sub, conciergeId, service.rows[0].id, body.requestedDate, timeBlock.rows[0].id, body.notes ?? null, eta],
      )

      await client.query(
        `INSERT INTO booking_status_history (booking_id, status, changed_by) VALUES ($1, 'not_started', $2)`,
        [inserted.rows[0].id, req.user.sub],
      )

      return { id: inserted.rows[0].id, conciergeId, serviceLabel: service.rows[0].label, timeBlockLabel: timeBlock.rows[0].label }
    })

    const { rows } = await query(`${BOOKING_SELECT} WHERE b.id = $1`, [booking.id])

    if (booking.conciergeId) {
      const [senior, concierge] = await Promise.all([
        findUserById(req.user.sub),
        findUserById(booking.conciergeId),
      ])
      await sendNotification({
        recipientId: booking.conciergeId,
        channel: 'whatsapp',
        toAddress: concierge?.phone,
        message: `New request from ${senior.full_name}: ${booking.serviceLabel} — ${booking.timeBlockLabel}.`,
        relatedBookingId: booking.id,
      })
    }

    res.status(201).json(bookingRowToApi(rows[0]))
  } catch (err) {
    next(err)
  }
})

bookingsRouter.patch('/:id/status', requireRole('concierge'), async (req, res, next) => {
  try {
    const { rows } = await query(`${BOOKING_SELECT} WHERE b.id = $1 AND b.concierge_id = $2`, [req.params.id, req.user.sub])
    const current = rows[0]
    if (!current) throw new ApiError(404, 'Booking not found for this concierge.')

    const currentIndex = STATUS_FLOW.indexOf(current.status)
    const next_ = STATUS_FLOW[currentIndex + 1]
    if (!next_) throw new ApiError(400, `Booking is already "${current.status}" and cannot be advanced further.`)

    await withTransaction(async (client) => {
      await client.query('UPDATE bookings SET status = $1, updated_at = now() WHERE id = $2', [next_, current.id])
      await client.query(
        `INSERT INTO booking_status_history (booking_id, status, changed_by) VALUES ($1, $2, $3)`,
        [current.id, next_, req.user.sub],
      )
    })

    const alertText = STATUS_ALERT[next_]
    if (alertText) {
      const senior = await findUserById(current.senior_id)
      await sendNotification({
        recipientId: current.senior_id,
        channel: 'sms',
        toAddress: senior?.phone,
        message: alertText(current),
        relatedBookingId: current.id,
      })
    }

    const { rows: updatedRows } = await query(`${BOOKING_SELECT} WHERE b.id = $1`, [current.id])
    res.json(bookingRowToApi(updatedRows[0]))
  } catch (err) {
    next(err)
  }
})
