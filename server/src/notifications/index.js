import { query } from '../db/pool.js'
import { config } from '../config.js'
import * as consoleProvider from './consoleProvider.js'
import * as twilioProvider from './twilioProvider.js'

const providers = { console: consoleProvider, twilio: twilioProvider }

function getProvider() {
  const provider = providers[config.notificationsProvider]
  if (!provider) {
    throw new Error(`Unknown NOTIFICATIONS_PROVIDER "${config.notificationsProvider}"`)
  }
  return provider
}

// Persists a notification row, attempts to send it via the configured
// provider, and updates the row with the outcome. Mirrors the frontend
// prototype's pushNotification, but backed by the `notifications` table
// instead of in-memory React state, and with a real (or console-logged)
// provider call instead of an instant fake "delivered".
export async function sendNotification({ recipientId, channel, toAddress, message, relatedBookingId }) {
  const insert = await query(
    `INSERT INTO notifications (recipient_id, channel, to_address, message, related_booking_id, provider, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'queued')
     RETURNING *`,
    [recipientId, channel, toAddress, message, relatedBookingId ?? null, config.notificationsProvider],
  )
  const notification = insert.rows[0]

  try {
    const result = await getProvider().send({ channel, to: toAddress, message })
    // $1 is bound to the enum `status` column and $4 is the same value
    // compared as text -- kept as two separate parameters (not reused as
    // $1 in both places) because Postgres's extended query protocol
    // infers one fixed type per parameter number, and an enum-column
    // assignment vs. a text comparison are incompatible inferences for
    // the same placeholder within one prepared statement.
    const updated = await query(
      `UPDATE notifications
       SET status = $1, provider_message_id = $2, sent_at = now(),
           delivered_at = CASE WHEN $4 = 'delivered' THEN now() ELSE NULL END
       WHERE id = $3
       RETURNING *`,
      [result.status, result.providerMessageId, notification.id, result.status],
    )
    return updated.rows[0]
  } catch (err) {
    const updated = await query(
      `UPDATE notifications SET status = 'failed', failed_reason = $1 WHERE id = $2 RETURNING *`,
      [err.message, notification.id],
    )
    return updated.rows[0]
  }
}

export async function listNotificationsForUser(recipientId, limit = 50) {
  // Joins for the recipient's own name -- a notification's recipient_id
  // is always "the current viewer" (this is always queried as one's own
  // alert history), so this reads as "delivered to you," matching how a
  // real phone's notification history shows messages addressed to you.
  const { rows } = await query(
    `SELECT n.*, u.full_name AS recipient_name
     FROM notifications n
     JOIN users u ON u.id = n.recipient_id
     WHERE n.recipient_id = $1
     ORDER BY n.created_at DESC LIMIT $2`,
    [recipientId, limit],
  )
  return rows
}
