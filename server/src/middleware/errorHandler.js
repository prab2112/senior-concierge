import { ZodError } from 'zod'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Invalid request', details: err.issues })
  }
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: err.message })
  }
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}
