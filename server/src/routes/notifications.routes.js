import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { listNotificationsForUser } from '../notifications/index.js'

export const notificationsRouter = Router()
notificationsRouter.use(requireAuth)

notificationsRouter.get('/', async (req, res, next) => {
  try {
    const rows = await listNotificationsForUser(req.user.sub)
    res.json(
      rows.map((n) => ({
        id: n.id,
        channel: n.channel,
        toName: n.recipient_name,
        toAddress: n.to_address,
        message: n.message,
        status: n.status,
        createdAt: n.created_at,
      })),
    )
  } catch (err) {
    next(err)
  }
})
