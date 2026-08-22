import { query } from '../db/pool.js'

export async function getOrCreateConversation(seniorId, conciergeId) {
  const existing = await query(
    'SELECT * FROM conversations WHERE senior_id = $1 AND concierge_id = $2',
    [seniorId, conciergeId],
  )
  if (existing.rows[0]) return existing.rows[0]

  const { rows } = await query(
    'INSERT INTO conversations (senior_id, concierge_id) VALUES ($1, $2) RETURNING *',
    [seniorId, conciergeId],
  )
  return rows[0]
}

export async function findPrimaryConcierge(seniorId) {
  const { rows } = await query(
    `SELECT concierge_id FROM senior_concierge_assignments
     WHERE senior_id = $1 ORDER BY is_primary DESC LIMIT 1`,
    [seniorId],
  )
  return rows[0]?.concierge_id ?? null
}
