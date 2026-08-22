import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { errorHandler } from './middleware/errorHandler.js'
import { authRouter } from './routes/auth.routes.js'
import { bookingsRouter } from './routes/bookings.routes.js'
import { messagesRouter } from './routes/messages.routes.js'
import { wellnessRouter } from './routes/wellness.routes.js'
import { notificationsRouter } from './routes/notifications.routes.js'
import { catalogRouter } from './routes/catalog.routes.js'
import { healthRouter } from './routes/health.routes.js'
import { usersRouter } from './routes/users.routes.js'

export const app = express()

app.use(cors({ origin: config.corsOrigins }))
app.use(express.json())

app.use('/health', healthRouter)
app.use('/auth', authRouter)
app.use('/bookings', bookingsRouter)
app.use('/messages', messagesRouter)
app.use('/wellness-checkins', wellnessRouter)
app.use('/notifications', notificationsRouter)
app.use('/users', usersRouter)
app.use('/', catalogRouter)

app.use((req, res) => res.status(404).json({ error: 'Not found' }))
app.use(errorHandler)
