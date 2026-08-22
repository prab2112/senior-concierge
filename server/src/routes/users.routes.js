import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { listConcierges } from '../services/users.js'

export const usersRouter = Router()
usersRouter.use(requireAuth)

// Powers the onboarding screen's "choose your concierge" picker for a
// new senior account. Just names, not full user records.
usersRouter.get('/concierges', async (req, res, next) => {
  try {
    const rows = await listConcierges()
    res.json(rows.map((r) => ({ id: r.id, fullName: r.full_name })))
  } catch (err) {
    next(err)
  }
})
