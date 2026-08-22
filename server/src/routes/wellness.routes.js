import { Router } from 'express'
import { z } from 'zod'
import { query } from '../db/pool.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { sendNotification } from '../notifications/index.js'
import { findUserById } from '../services/users.js'
import { findPrimaryConcierge, getOrCreateConversation } from '../services/conversations.js'

export const wellnessRouter = Router()
wellnessRouter.use(requireAuth)

const checkinSchema = z.object({ status: z.enum(['well', 'call_requested']) })

wellnessRouter.get('/', requireRole('senior'), async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT * FROM wellness_checkins WHERE senior_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.user.sub],
    )
    res.json(rows.map((r) => ({ id: r.id, status: r.status, createdAt: r.created_at })))
  } catch (err) {
    next(err)
  }
})

wellnessRouter.post('/', requireRole('senior'), async (req, res, next) => {
  try {
    const { status } = checkinSchema.parse(req.body)
    const { rows } = await query(
      'INSERT INTO wellness_checkins (senior_id, status) VALUES ($1, $2) RETURNING *',
      [req.user.sub, status],
    )

    if (status === 'call_requested') {
      const conciergeId = await findPrimaryConcierge(req.user.sub)
      if (conciergeId) {
        const [senior, concierge] = await Promise.all([
          findUserById(req.user.sub),
          findUserById(conciergeId),
        ])
        const conversation = await getOrCreateConversation(req.user.sub, conciergeId)
        await query(
          `INSERT INTO chat_messages (conversation_id, sender_id, body) VALUES ($1, $2, $3)`,
          [conversation.id, req.user.sub, 'I checked in today and requested a phone call. Could you please call me when you have a moment?'],
        )
        await sendNotification({
          recipientId: conciergeId,
          channel: 'whatsapp',
          toAddress: concierge?.phone,
          message: `⚠️ Wellness alert: ${senior.full_name} checked in and requested a phone call.`,
        })
      }
    }

    const checkin = rows[0]
    res.status(201).json({ id: checkin.id, status: checkin.status, createdAt: checkin.created_at })
  } catch (err) {
    next(err)
  }
})
