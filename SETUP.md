# Setup

## Prerequisites

- Node.js 18+
- npm (bundled with Node)
- A Postgres 16 instance (via Docker, a local install, or a managed
  service) — the API won't boot without `DATABASE_URL` pointing to one

## 1. Database

Easiest path is the root `docker-compose.yml`, which starts Postgres
only (the API runs separately in dev so you get hot-reload):

```bash
docker compose up db
```

No Docker available? Point `DATABASE_URL` at any Postgres 16 instance
you already have running — the schema doesn't require any non-default
extensions beyond `pgcrypto`, which the migration installs itself.

## 2. Backend (`server/`)

```bash
cd server
npm install
cp .env.example .env        # defaults work as-is against the docker-compose db
npm run migrate             # applies db/schema.postgres.sql + db/migrations/*.sql
npm run seed:demo           # seeds a demo senior (Ramesh Rao) + concierge (Maria Santos)
npm run dev                 # API on :4000, restarts on file changes
```

See `server/README.md` for the full environment variable reference
(Twilio, Google OAuth, etc.) and API surface.

## 3. Frontend (repo root)

```bash
cd ..                        # back to the repo root
npm install
cp .env.example .env         # VITE_API_URL defaults to http://localhost:4000
npm run dev                  # dev server at http://localhost:5173
```

```bash
npm run build     # production build to dist/
npm run preview   # serve the production build locally
npm run lint      # oxlint
```

## Verifying it works

There's no automated test suite yet (see `HANDOVER.md`). After both
`server` and the frontend are running:

1. Open http://localhost:5173 — you should land on the sign-in screen,
   prefilled with the demo senior's phone number. Tap "Send Code"; since
   no real SMS provider is configured by default, the code appears
   directly on screen. Enter it to sign in as **Ramesh Rao** (senior).
2. Submit a Quick Request — a confirmation screen should appear and the
   new booking should show up in "Your Scheduled Visits." You should
   also see a toast notification and a new entry in the alert-log bell.
3. Sign out, then sign back in with the demo concierge's number
   (`+14155550142`) to test the **Maria Santos** (concierge) view. The
   booking from step 2 should already be in "Schedule & Route" (it may
   take up to ~5 seconds to appear — the frontend polls, it doesn't push).
   Open it and tap "Mark as In Progress" / "Mark as Completed."
4. Sign out and back in as the senior again — the status should show
   as "Completed," and the alert bell should show the SMS notifications
   sent along the way.
5. Sign out and sign in with a phone number you haven't used before
   (any number works — OTP is real but the phone itself isn't) to see
   the onboarding screen: pick a name, "Senior," and Maria Santos as
   your concierge from the dropdown. Submitting should drop you straight
   into a working senior account with that concierge already assigned.

Steps 3-4 need both demo accounts seeded (`npm run seed:demo` in
`server/`); step 5 works with any new number and demonstrates the
onboarding flow described in `ARCHITECTURE.md`.
