# Database schema

Two equivalent designs, plus how they're actually used:

- **`schema.postgres.sql`** — relational schema. This is the one that's
  actually implemented: `server/` (Express + Postgres) runs it as-is via
  `server/scripts/migrate.js`, alongside two additive migrations in
  `migrations/`:
  - `001_otp_codes.sql` — server-side hashed OTP challenges (phone auth)
  - `002_user_onboarding.sql` — `users.needs_onboarding`, powering the
    first-time-sign-in setup flow (see `ARCHITECTURE.md`'s "Onboarding")
- **`schema.mongodb.md`** — document-oriented equivalent, with the
  embed-vs-reference reasoning spelled out for each collection. Not
  implemented — `server/` only ever targets Postgres.

## How the frontend maps to this schema

The frontend (`src/`) doesn't hold its own copy of this data anymore —
`src/api/client.js` calls the real API in `server/`, which reads/writes
these tables directly. Roughly:

| Frontend concept | Backend table(s) | API route |
|---|---|---|
| Signed-in user, role, profile | `users` (+ `senior_profiles` / `concierge_profiles`) | `/auth/*`, `/users/concierges` |
| `SERVICES` / `TIME_BLOCKS` (`src/data/mockData.js`) | `service_types` / `time_blocks` | `/service-types`, `/time-blocks` |
| Bookings list, booking modal, status toggle | `bookings` (+ `booking_status_history`, `booking_attachments`) | `/bookings` |
| Live chat | `conversations` + `chat_messages` | `/messages` |
| Wellness check-in | `wellness_checkins` | `/wellness-checkins` |
| Toast stack + alert log bell | `notifications` | `/notifications` |
| Senior↔concierge assignment (onboarding picker) | `senior_concierge_assignments` | set via `PATCH /auth/profile` |

`SERVICES`/`TIME_BLOCKS` are the one exception kept as a frontend
constant rather than fetched live — they're static UI content (icons,
colors) whose `id` values must simply match `service_types.code` /
`time_blocks.code`; see `ARCHITECTURE.md`'s "Frontend structure".

See `server/README.md` for the full route reference and
`PRODUCTION_READINESS.md` for what's verified vs. still untested in
this implementation (e.g. real Twilio/Google credentials).
