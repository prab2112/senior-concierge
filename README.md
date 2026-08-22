# Senior Concierge Service

A responsive web app for a senior concierge platform, with two
role-based views (Senior/Client and Concierge/Provider) backed by a
real Express + Postgres API — real phone-OTP and Google auth, real
persisted bookings/chat/notifications, and a pluggable SMS/WhatsApp
provider (console-logged in dev, real Twilio when configured).

See [`SETUP.md`](./SETUP.md) to run the full stack,
[`ARCHITECTURE.md`](./ARCHITECTURE.md) for how the frontend and backend
fit together, and [`HANDOVER.md`](./HANDOVER.md) for what's done and
what's next. The database design lives in [`db/`](./db/README.md), the
API implementing it lives in [`server/`](./server/README.md), a broader
backlog of ideas lives in [`IMPROVEMENTS.md`](./IMPROVEMENTS.md), and
[`PRODUCTION_READINESS.md`](./PRODUCTION_READINESS.md) tracks exactly
what's real vs. still simulated across the whole repo.

## Features

- Real sign-in: phone number + OTP (server-generated, hashed, rate
  limited) or Google (real ID token verification) — see "Auth" below
- Self-serve onboarding for first-time sign-ins: pick your name, role
  (Senior/Concierge), and — for a senior — a concierge from the real
  list of accounts
- Role toggle in the header reflects your real signed-in account; sign
  out to switch between the seeded demo senior/concierge accounts
- Senior view: wellness check-in, quick-request grid, active bookings
  list, 3-step booking modal
- Concierge view: dashboard metrics, schedule timeline, task detail
  with status toggle, live chat
- Real SMS/WhatsApp alerts (toast popups + a persistent alert log) on
  booking creation, status changes, wellness call-requests, and chat
  messages — console-logged by default, real Twilio delivery when
  configured
- Accessibility-first design: 18px+ body text, 24px+ headings,
  high-contrast navy/teal/warm-white palette, extra-large touch targets

## Tech stack

**Frontend:** React 19 + Vite, Tailwind CSS v4, lucide-react icons.
**Backend:** Express + Postgres (`server/`), JWT sessions, Zod
validation. No router yet on the frontend (single view, gated by auth).

## Auth

The app gates on a `SignInScreen` until you authenticate, via either:

- **Phone number + OTP** — enter a phone number, tap "Send Code." In
  local dev (no real SMS provider configured) the code is shown
  directly on screen instead of arriving by text — a labeled demo-mode
  convenience, not something that ships once a real provider is wired
  up. Enter the code to sign in.
- **"Continue with Google"** — requires `VITE_GOOGLE_CLIENT_ID` /
  `GOOGLE_CLIENT_ID` to be set to a real OAuth client; disabled with an
  explanatory tooltip otherwise. Implemented against the real Google
  Identity Services API but not verified end-to-end in this environment
  (no real OAuth client configured) — see `PRODUCTION_READINESS.md`.

Both methods are real: the backend generates/hashes/expires OTP codes
server-side and verifies Google ID tokens server-side (see
`server/README.md`). See "Session & auth" and "Onboarding" in
`ARCHITECTURE.md` for how the frontend wires into it, including why the
role toggle now reflects your actual signed-in account instead of
freely switching, and why a brand-new phone number lands on a setup
screen instead of straight into the app.

## Setup

See [`SETUP.md`](./SETUP.md) to run Postgres, the API, and the frontend
together, including how to seed the demo senior/concierge accounts.

## Project structure

```
src/
  App.jsx                     # session state, data fetching/polling, action handlers
  api/
    client.js                  # fetch wrapper + localStorage session persistence
    mappers.js                  # backend shapes -> the view layer's expected shapes
  lib/
    format.js                   # display helpers (formatEta, initialsFromName)
    googleAuth.js                # Google Identity Services integration
  data/mockData.js            # SERVICES/TIME_BLOCKS UI catalog + STATUS_FLOW labels
  components/
    RoleToggle.jsx             # header: role indicator + notification bell + sign out
    auth/                      # SignInScreen + OnboardingScreen (first-time name/role/concierge setup)
    notifications/             # toast stack + alert log dropdown
    senior/                    # Senior/Client view and its modals
    concierge/                 # Concierge/Provider view and its modals
db/
  schema.postgres.sql          # relational schema, applied as-is by server/
  schema.mongodb.md            # equivalent document-store schema (not implemented)
  migrations/                  # additive migrations on top of schema.postgres.sql
  README.md                    # maps API state to backend tables/collections
server/
  src/routes/                  # auth, bookings, messages, wellness-checkins, notifications, catalog
  src/notifications/           # pluggable console (dev) / twilio (real) provider
  scripts/migrate.js           # applies db/schema.postgres.sql + db/migrations/*.sql
  scripts/seed-demo.js         # seeds the demo senior + concierge accounts
  README.md                    # setup + API reference
```
