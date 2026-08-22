import { Router } from 'express'
import { z } from 'zod'
import { query } from '../db/pool.js'
import { requireAuth } from '../middleware/auth.js'
import { ApiError } from '../middleware/errorHandler.js'
import { sendNotification } from '../notifications/index.js'
import { findUserById } from '../services/users.js'
import { getOrCreateConversation, findPrimaryConcierge } from '../services/conversations.js'

export const messagesRouter = Router()
messagesRouter.use(requireAuth)

const sendMessageSchema = z.object({
  body: z.string().min(1).max(4000),
  counterpartId: z.string().uuid().optional(), // required for concierge senders
})

async function resolveCounterpartId(req) {
  if (req.user.role === 'concierge') {
    const counterpartId = req.query.counterpartId || req.body?.counterpartId
    if (!counterpartId) throw new ApiError(400, 'counterpartId (the senior) is required for a concierge.')
    return counterpartId
  }
  const conciergeId = await findPrimaryConcierge(req.user.sub)
  if (!conciergeId) throw new ApiError(400, 'No concierge is assigned to this senior yet.')
  return conciergeId
}

messagesRouter.get('/', async (req, res, next) => {
  try {
    const counterpartId = await resolveCounterpartId(req)
    const [seniorId, conciergeId] = req.user.role === 'concierge'
      ? [counterpartId, req.user.sub]
      : [req.user.sub, counterpartId]

    const conversation = await getOrCreateConversation(seniorId, conciergeId)
    const { rows } = await query(
      'SELECT * FROM chat_messages WHERE conversation_id = $1 ORDER BY sent_at ASC',
      [conversation.id],
    )
    res.json(rows.map((m) => ({ id: m.id, senderId: m.sender_id, body: m.body, sentAt: m.sent_at })))
  } catch (err) {
    next(err)
  }
})

messagesRouter.post('/', async (req, res, next) => {
  try {
    const body = sendMessageSchema.parse(req.body)
    const counterpartId = await resolveCounterpartId(req)
    const [seniorId, conciergeId] = req.user.role === 'concierge'
      ? [counterpartId, req.user.sub]
      : [req.user.sub, counterpartId]

    const conversation = await getOrCreateConversation(seniorId, conciergeId)
    const { rows } = await query(
      `INSERT INTO chat_messages (conversation_id, sender_id, body) VALUES ($1, $2, $3) RETURNING *`,
      [conversation.id, req.user.sub, body.body],
    )

    // Mirrors the frontend prototype: a concierge's chat message is also
    // sent as a WhatsApp alert to the senior. Senior-authored messages
    // don't trigger a duplicate alert.
    if (req.user.role === 'concierge') {
      const senior = await findUserById(seniorId)
      await sendNotification({
        recipientId: seniorId,
        channel: 'whatsapp',
        toAddress: senior?.phone,
        message: body.body,
      })
    }

    const saved = rows[0]
    res.status(201).json({ id: saved.id, senderId: saved.sender_id, body: saved.body, sentAt: saved.sent_at })
  } catch (err) {
    next(err)
  }
})
