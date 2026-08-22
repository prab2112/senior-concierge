#!/usr/bin/env node
// Seeds the demo senior/concierge pair from the original frontend
// prototype (src/data/mockData.js) so a fresh backend has someone to
// sign in as and test both roles against. Idempotent: safe to re-run.
import pg from 'pg'

const DEMO_SENIOR = {
  fullName: 'Ramesh Rao',
  phone: '+14155550100',
  address: '42 Willow Creek Lane, Fremont, CA',
}

const DEMO_CONCIERGE = {
  fullName: 'Maria Santos',
  phone: '+14155550142',
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is not set.')
    process.exit(1)
  }
  const client = new pg.Client({ connectionString })
  await client.connect()

  const senior = await upsertUser(client, { role: 'senior', ...DEMO_SENIOR })
  await client.query(
    `INSERT INTO senior_profiles (user_id, address_line)
     VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET address_line = EXCLUDED.address_line`,
    [senior.id, DEMO_SENIOR.address],
  )

  const concierge = await upsertUser(client, { role: 'concierge', ...DEMO_CONCIERGE })
  await client.query(
    `INSERT INTO concierge_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [concierge.id],
  )

  await client.query(
    `INSERT INTO senior_concierge_assignments (senior_id, concierge_id, is_primary)
     VALUES ($1, $2, true)
     ON CONFLICT (senior_id, concierge_id) DO NOTHING`,
    [senior.id, concierge.id],
  )

  console.log('Seeded demo accounts:')
  console.log(`  Senior:    ${DEMO_SENIOR.fullName} (${DEMO_SENIOR.phone})`)
  console.log(`  Concierge: ${DEMO_CONCIERGE.fullName} (${DEMO_CONCIERGE.phone})`)
  console.log('Sign in as either via phone OTP in the app to test that role.')

  await client.end()
}

async function upsertUser(client, { role, fullName, phone }) {
  const existing = await client.query('SELECT * FROM users WHERE phone = $1', [phone])
  if (existing.rows[0]) return existing.rows[0]
  // needs_onboarding = false: these accounts are seeded with a complete
  // profile already, so they should never see the onboarding screen.
  const { rows } = await client.query(
    `INSERT INTO users (role, full_name, phone, needs_onboarding) VALUES ($1, $2, $3, false) RETURNING *`,
    [role, fullName, phone],
  )
  return rows[0]
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
