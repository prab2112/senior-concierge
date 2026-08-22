import { Router } from 'express'
import { query } from '../db/pool.js'

export const catalogRouter = Router()

catalogRouter.get('/service-types', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT code, label, description, icon_key FROM service_types WHERE is_active ORDER BY id')
    res.json(rows)
  } catch (err) {
    next(err)
  }
})

catalogRouter.get('/time-blocks', async (req, res, next) => {
  try {
    const { rows } = await query('SELECT code, label, start_time, end_time FROM time_blocks ORDER BY start_time')
    res.json(rows)
  } catch (err) {
    next(err)
  }
})
