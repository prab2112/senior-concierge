import { Router } from 'express'
import { pool } from '../db/pool.js'

export const healthRouter = Router()

healthRouter.get('/', async (req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', db: 'up' })
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'down', error: err.message })
  }
})
