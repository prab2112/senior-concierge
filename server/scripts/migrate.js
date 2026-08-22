#!/usr/bin/env node
// Applies db/schema.postgres.sql (treated as migration 000) followed by
// every file in db/migrations/*.sql, in filename order, tracking what has
// already run in a `schema_migrations` table so this is safe to re-run.
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbDir = path.join(__dirname, '..', '..', 'db')

function loadMigrations() {
  const migrationsDir = path.join(dbDir, 'migrations')
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
  return [
    { name: '000_schema.postgres.sql', file: path.join(dbDir, 'schema.postgres.sql') },
    ...files.map((f) => ({ name: f, file: path.join(migrationsDir, f) })),
  ]
}

async function main() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    console.error('DATABASE_URL is not set. Copy server/.env.example to server/.env and fill it in.')
    process.exit(1)
  }

  const client = new pg.Client({ connectionString })
  await client.connect()

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)

  const { rows } = await client.query('SELECT name FROM schema_migrations')
  const applied = new Set(rows.map((r) => r.name))

  for (const migration of loadMigrations()) {
    if (applied.has(migration.name)) {
      console.log(`skip  ${migration.name} (already applied)`)
      continue
    }
    const sql = readFileSync(migration.file, 'utf8')
    console.log(`apply ${migration.name}`)
    await client.query('BEGIN')
    try {
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [migration.name])
      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      console.error(`failed applying ${migration.name}:`, err.message)
      await client.end()
      process.exit(1)
    }
  }

  console.log('All migrations applied.')
  await client.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
