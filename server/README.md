# Senior Concierge API

Express + Postgres backend implementing `db/schema.postgres.sql`. The
frontend in `../src/` calls this directly (see `../ARCHITECTURE.md`'s
"Session & auth" and "Data fetching & polling" sections) — see
`../PRODUCTION_READINESS.md` for what's real vs. still simulated/untested.

## Setup

```bash
cd server
npm install
cp .env.example .env   # then fill in DATABASE_URL at minimum
```

You need a Postgres 16 instance reachable at `DATABASE_URL`. Easiest
path is the root `docker-compose.yml`:

```bash
docker compose up db          # Postgres only, on localhost:5432
npm run migrate               # applies db/schema.postgres.sql + db/migrations/*.sql
npm run seed:demo             # creates a demo senior (Ramesh Rao) + concierge (Maria Santos)
npm run dev                   # API on :4000, restarts on file changes
```

`npm run seed:demo` (`scripts/seed-demo.js`) is idempotent and gives the
frontend's sign-in screen two real accounts to test both roles against
— see `../SETUP.md`.

Or run everything (API included) in Docker:

```bash
docker compose up --build
```

## Environment variables

See `.env.example` for the full list with comments. The only one that
must be set for the API to boot at all is `DATABASE_URL`. Everything
else has a safe default:

- `NOTIFICATIONS_PROVIDER` defaults to `console` — OTP codes and
  booking/status/chat alerts are logged to stdout instead of sent for
  real. In this mode, `POST /auth/otp/request` also echoes the code
  back as a `devCode` field in its response so the frontend can display
  it directly (see `SignInScreen.jsx`) instead of requiring you to tail
  server logs — this field is never present once `twilio` is configured,
  since a real provider means the code is only ever visible to whoever
  receives the actual text. Set to `twilio` and fill in `TWILIO_*` to
  send real SMS/WhatsApp.
- `GOOGLE_CLIENT_ID` unset disables `/auth/google` (returns `501`
  rather than silently accepting anything).

## API surface

| Route | Auth | Notes |
|---|---|---|
| `GET /health` | none | checks real DB connectivity |
| `POST /auth/otp/request` | none | rate-limited; body `{ phone }` |
| `POST /auth/otp/verify` | none | rate-limited; body `{ phone, code }` → `{ token, user }` |
| `POST /auth/google` | none | body `{ idToken }` → `{ token, user }`; `501` if unconfigured |
| `GET /auth/me` | bearer | current user profile, incl. `needsOnboarding` |
| `PATCH /auth/profile` | bearer | one-time onboarding: `{ fullName, role, address?, conciergeId? }` → `{ token, user }` (re-issues the JWT since `role` may have changed) |
| `GET /users/concierges` | bearer | `[{ id, fullName }]`, powers the onboarding screen's concierge picker |
| `GET/POST /bookings` | bearer | senior creates, both roles list their own |
| `PATCH /bookings/:id/status` | bearer, concierge | advances one step forward |
| `GET/POST /messages` | bearer | senior resolves counterpart automatically; concierge passes `?counterpartId=` |
| `GET/POST /wellness-checkins` | bearer, senior | `call_requested` also alerts the assigned concierge |
| `GET /notifications` | bearer | the caller's own alert history |
| `GET /service-types`, `GET /time-blocks` | none | read-only catalog |

All authenticated routes expect `Authorization: Bearer <token>` from
`/auth/otp/verify` or `/auth/google`.

## Known gaps

Tracked in detail in `../PRODUCTION_READINESS.md`. The short version: no
refresh tokens/revocation, no delivery-status webhooks, no file upload
endpoint yet, no automated test suite, no admin/approval step for
concierge signups (anyone can pick "Concierge" during onboarding — see
"Onboarding" in `../ARCHITECTURE.md`), and both the Google auth and
Twilio provider code paths are implemented against the real APIs but
have never been run against real credentials in this environment.
