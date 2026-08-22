import { query } from '../db/pool.js'

export async function findUserByPhone(phone) {
  const { rows } = await query('SELECT * FROM users WHERE phone = $1', [phone])
  return rows[0] ?? null
}

export async function findUserByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email])
  return rows[0] ?? null
}

export async function findUserById(id) {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [id])
  return rows[0] ?? null
}

// A first-time sign-in provisions a minimal 'senior' row with
// needs_onboarding = true (see db/migrations/002_user_onboarding.sql).
// The frontend shows a one-time onboarding step (POST-verified via
// PATCH /auth/profile below) to collect the real role/name/concierge
// before letting them into the app -- see ARCHITECTURE.md's "Auth" and
// "Onboarding" sections.
export async function upsertUserByPhone(phone) {
  const existing = await findUserByPhone(phone)
  if (existing) return existing
  const { rows } = await query(
    `INSERT INTO users (role, full_name, phone) VALUES ('senior', $1, $2) RETURNING *`,
    [`New User (${phone})`, phone],
  )
  return rows[0]
}

export async function upsertUserByGoogle({ email, name }) {
  const existing = await findUserByEmail(email)
  if (existing) return existing
  const placeholderPhone = `google:${email}`
  const { rows } = await query(
    `INSERT INTO users (role, full_name, email, phone) VALUES ('senior', $1, $2, $3) RETURNING *`,
    [name || email, email, placeholderPhone],
  )
  return rows[0]
}

export async function listConcierges() {
  const { rows } = await query(
    `SELECT id, full_name FROM users WHERE role = 'concierge' ORDER BY full_name`,
  )
  return rows
}

// Completes the one-time onboarding step: sets the user's real role and
// name, and for a senior, optionally an address and their assigned
// concierge (replacing any prior assignment -- this prototype's data
// model assumes one concierge per senior; see ARCHITECTURE.md).
export async function completeOnboarding(client, userId, { fullName, role, address, conciergeId }) {
  const { rows } = await client.query(
    `UPDATE users SET full_name = $1, role = $2, needs_onboarding = false, updated_at = now()
     WHERE id = $3 RETURNING *`,
    [fullName, role, userId],
  )
  const user = rows[0]

  if (role === 'senior') {
    if (address) {
      await client.query(
        `INSERT INTO senior_profiles (user_id, address_line) VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET address_line = EXCLUDED.address_line`,
        [userId, address],
      )
    }
    if (conciergeId) {
      await client.query('DELETE FROM senior_concierge_assignments WHERE senior_id = $1', [userId])
      await client.query(
        `INSERT INTO senior_concierge_assignments (senior_id, concierge_id, is_primary) VALUES ($1, $2, true)`,
        [userId, conciergeId],
      )
    }
  } else if (role === 'concierge') {
    await client.query(
      `INSERT INTO concierge_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [userId],
    )
  }

  return user
}
