-- Additive migration on top of schema.postgres.sql + 001_otp_codes.sql.
-- Resolves the "no onboarding" gap: a first-time sign-in used to always
-- silently provision a 'senior' with a placeholder name and no assigned
-- concierge. This flag lets the frontend show a one-time "finish setting
-- up your account" step (pick role, name, and for a senior, a concierge)
-- instead.

ALTER TABLE users ADD COLUMN needs_onboarding BOOLEAN NOT NULL DEFAULT true;

-- Demo/seed accounts are created with full profiles already and should
-- never see the onboarding screen; server/scripts/seed-demo.js sets this
-- explicitly false for the accounts it creates, so no backfill is needed
-- here for a fresh database. On a database that already has real rows
-- from before this migration, treat them as already onboarded:
UPDATE users SET needs_onboarding = false;
