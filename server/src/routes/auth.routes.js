import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { OAuth2Client } from 'google-auth-library'
import { config } from '../config.js'
import { query } from '../db/pool.js'
import { generateOtpCode, hashOtpCode } from '../lib/otp.js'
import { signAccessToken } from '../lib/jwt.js'
import { sendNotification } from '../notifications/index.js'
import { upsertUserByPhone, upsertUserByGoogle, findUserById, completeOnboarding } from '../services/users.js'
import { requireAuth } from '../middleware/auth.js'
import { ApiError } from '../middleware/errorHandler.js'
import { withTransaction } from '../db/pool.js'

export const authRouter = Router()

const OTP_TTL_MINUTES = 5
const MAX_VERIFY_ATTEMPTS = 5

// Generous enough for normal use, tight enough to blunt brute-forcing a
// 6-digit code or spamming SMS sends to someone else's number.
const otpRequestLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false })
const otpVerifyLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false })

const requestOtpSchema = z.object({ phone: z.string().min(7).max(20) })
const verifyOtpSchema = z.object({ phone: z.string().min(7).max(20), code: z.string().length(6) })
const googleSchema = z.object({ idToken: z.string().min(20) })

authRouter.post('/otp/request', otpRequestLimiter, async (req, res, next) => {
  try {
    const { phone } = requestOtpSchema.parse(req.body)

    const user = await upsertUserByPhone(phone)
    const code = generateOtpCode()
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000)

    await query(
      `INSERT INTO otp_codes (phone, code_hash, expires_at) VALUES ($1, $2, $3)`,
      [phone, hashOtpCode(code), expiresAt],
    )

    await sendNotification({
      recipientId: user.id,
      channel: 'sms',
      toAddress: phone,
      message: `Your Senior Concierge verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
    })

    // Dev convenience only: when NOTIFICATIONS_PROVIDER=console, no real SMS
    // is ever sent (the code only reaches the server's own stdout log), so
    // handing it back in the response here is not a real exposure -- it's
    // already sitting in plaintext wherever the console provider logged it.
    // This MUST stay gated on the console provider: never include this once
    // NOTIFICATIONS_PROVIDER=twilio actually delivers the code to a real phone.
    const devCode = config.notificationsProvider === 'console' ? code : undefined

    res.status(202).json({ message: 'Verification code sent.', devCode })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/otp/verify', otpVerifyLimiter, async (req, res, next) => {
  try {
    const { phone, code } = verifyOtpSchema.parse(req.body)

    const { rows } = await query(
      `SELECT * FROM otp_codes
       WHERE phone = $1 AND consumed_at IS NULL AND expires_at > now()
       ORDER BY created_at DESC LIMIT 1`,
      [phone],
    )
    const otp = rows[0]
    if (!otp) throw new ApiError(400, 'No active verification code for this number. Request a new one.')
    if (otp.attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new ApiError(429, 'Too many attempts. Request a new code.')
    }

    if (otp.code_hash !== hashOtpCode(code)) {
      await query('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = $1', [otp.id])
      throw new ApiError(400, "That code didn't match. Please try again.")
    }

    await query('UPDATE otp_codes SET consumed_at = now() WHERE id = $1', [otp.id])
    const user = await upsertUserByPhone(phone)
    const token = signAccessToken(user)
    res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.full_name,
        phone: user.phone,
        needsOnboarding: user.needs_onboarding,
      },
    })
  } catch (err) {
    next(err)
  }
})

authRouter.post('/google', async (req, res, next) => {
  try {
    if (!config.googleClientId) {
      throw new ApiError(501, 'Google sign-in is not configured (GOOGLE_CLIENT_ID unset).')
    }
    const { idToken } = googleSchema.parse(req.body)

    const client = new OAuth2Client(config.googleClientId)
    const ticket = await client.verifyIdToken({ idToken, audience: config.googleClientId })
    const payload = ticket.getPayload()
    if (!payload?.email) throw new ApiError(400, 'Google token did not include an email address.')

    const user = await upsertUserByGoogle({ email: payload.email, name: payload.name })
    const token = signAccessToken(user)
    res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.full_name,
        email: user.email,
        needsOnboarding: user.needs_onboarding,
      },
    })
  } catch (err) {
    next(err)
  }
})

authRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.user.sub)
    if (!user) throw new ApiError(404, 'User not found.')
    res.json({
      id: user.id,
      role: user.role,
      fullName: user.full_name,
      phone: user.phone,
      email: user.email,
      needsOnboarding: user.needs_onboarding,
    })
  } catch (err) {
    next(err)
  }
})

const completeProfileSchema = z.object({
  fullName: z.string().min(1).max(200),
  role: z.enum(['senior', 'concierge']),
  address: z.string().max(500).optional(),
  conciergeId: z.string().uuid().optional(),
})

// One-time onboarding step for a freshly-provisioned account (see
// db/migrations/002_user_onboarding.sql and ARCHITECTURE.md). Re-issues
// the JWT because the role claim baked into the token at sign-in time
// would otherwise go stale the moment onboarding changes it here --
// requireRole() checks the token's claim, not a fresh DB read.
authRouter.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const body = completeProfileSchema.parse(req.body)
    const user = await withTransaction((client) => completeOnboarding(client, req.user.sub, body))
    const token = signAccessToken(user)
    res.json({
      token,
      user: {
        id: user.id,
        role: user.role,
        fullName: user.full_name,
        phone: user.phone,
        email: user.email,
        needsOnboarding: user.needs_onboarding,
      },
    })
  } catch (err) {
    next(err)
  }
})
