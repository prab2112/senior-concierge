# Architecture

## Overview

This is now a real client-server app: a React SPA (`src/`) talking over
HTTP to an Express + Postgres API (`server/`, see `server/README.md` for
its internals). There is no more shared in-memory state trick — the
senior and concierge roles are **two genuinely independent authenticated
sessions**, each with their own JWT, hitting the same backend. A senior
submitting a request and a concierge advancing its status are two
separate HTTP calls from two separate browser sessions; the frontend
picks up the other side's changes by polling (see "Data fetching &
polling" below), not through shared local state.

`db/README.md` documents how the schema maps to this API layer.

## Frontend structure

```
src/
  App.jsx                  # session state, data fetching/polling, all action handlers
  api/
    client.js               # fetch wrapper + localStorage session persistence
    mappers.js               # backend snake_case/enum shapes -> the Title Case shapes the view layer expects
  lib/
    format.js                # formatEta/initialsFromName display helpers
    googleAuth.js            # loads Google Identity Services, requests a real ID token
  data/mockData.js          # SERVICES/TIME_BLOCKS catalog (UI-only: icons/colors) + STATUS_FLOW display labels
  components/
    RoleToggle.jsx           # role indicator + NotificationBell + Sign Out
    auth/SignInScreen.jsx     # Google button + phone/OTP form
    auth/OnboardingScreen.jsx # one-time name/role/concierge setup for first-time sign-ins
    notifications/           # toast stack + alert log dropdown
    senior/, concierge/      # view components (unchanged from the original prototype)
```

The view components (`senior/`, `concierge/`) are almost entirely
**unchanged** from the original local-state prototype. That was a
deliberate constraint while wiring up the API: `api/mappers.js`
translates backend responses into the exact shape those components
already consumed (Title Case status strings, `conciergeInitials`
derived client-side, etc.), so the diff for "add a real backend" is
concentrated in `App.jsx` and `api/`, not spread across every view file.

## Session & auth

`App.jsx` renders `SignInScreen` whenever there's no valid session.
`api/client.js` persists `{ token, user }` in `localStorage` and
rehydrates it on load by calling `GET /auth/me` — if that fails (token
expired/invalid), the stored session is discarded and the user sees the
sign-in screen again.

Two real sign-in paths, both calling the backend in `server/`:

- **Phone OTP** — `handleRequestOtp` calls `POST /auth/otp/request`; the
  backend generates and hashes the code server-side. In local dev
  (`NOTIFICATIONS_PROVIDER=console`), the response includes a `devCode`
  field so `SignInScreen` can display it directly instead of requiring
  you to tail server logs — this field is never present once a real SMS
  provider is configured (see `server/src/routes/auth.routes.js`).
  `handleVerifyOtp` calls `POST /auth/otp/verify` and stores the
  returned JWT + user on success.
- **Google** — `lib/googleAuth.js` loads Google Identity Services and
  requests a real ID token, which `handleGoogleSignIn` sends to
  `POST /auth/google` for server-side verification. Requires
  `VITE_GOOGLE_CLIENT_ID` (frontend) and `GOOGLE_CLIENT_ID` (backend) to
  be set to the same real OAuth client; the button is disabled with an
  explanatory tooltip when unset rather than pretending to sign in.
  **Written but not verified end-to-end** — there's no real Google OAuth
  client configured in this environment (see `PRODUCTION_READINESS.md`).

**Role is now determined by who's signed in, not a free-floating UI
toggle.** `role` is derived directly from `auth.user.role` (set by the
backend's `users.role` column). Clicking the tab that doesn't match your
account's real role doesn't switch views — `handleSetRole` shows a
"Sign out to switch accounts" notice instead. This is a direct
consequence of wiring up real auth: previously the toggle could show
either role because both read the same fake local data; now each role's
data only exists behind that role's own token, so pretending to be the
other role would just mean showing nothing (or a 403). To test both
roles, sign out and sign back in as the other seeded demo account (see
`server/scripts/seed-demo.js`), or self-register a new number and pick
a role during onboarding (below).

## Onboarding

A first-time sign-in (new phone number or new Google account) creates a
`users` row with `needs_onboarding = true` and a placeholder name/role
(`server/src/services/users.js`, `db/migrations/002_user_onboarding.sql`).
Every auth response (`/auth/otp/verify`, `/auth/google`, `/auth/me`)
includes `needsOnboarding`; `App.jsx` renders `OnboardingScreen` instead
of the main app whenever it's `true`.

`OnboardingScreen` collects a real name and a role (Senior or
Concierge). Picking Senior also offers an optional address and a
concierge picked from `GET /users/concierges` (real accounts, not a
hardcoded list). Submitting calls `PATCH /auth/profile`, which:

- updates `full_name`/`role` and flips `needs_onboarding` to `false`,
- for a senior: upserts `senior_profiles.address_line` and replaces any
  prior `senior_concierge_assignments` row with the chosen concierge
  (`is_primary = true`),
- for a concierge: ensures a `concierge_profiles` row exists,
- **re-issues the JWT.** This matters: the token's `role` claim was
  baked in at sign-in time (still the placeholder `'senior'` default),
  and `requireRole()` checks that claim, not a fresh DB read. Without
  re-issuing, a user who onboards as a concierge would still carry a
  stale `role: 'senior'` token and get 403'd on concierge-only routes
  until their next sign-in. `App.jsx`'s `handleCompleteProfile` stores
  the new token exactly like a fresh sign-in (`applySession`).

Seeded demo accounts (`server/scripts/seed-demo.js`) set
`needs_onboarding = false` directly, since they're created with a
complete profile already and should never see this screen.

**Known simplification:** anyone can pick "Concierge" during onboarding
— there's no admin approval, background check, or invitation step. Fine
for a prototype; a real deployment would gate concierge accounts behind
some vetting process before `role = 'concierge'` grants access to
senior data.

## Data fetching & polling

There's no realtime channel (websockets) yet — seeded in
`IMPROVEMENTS.md` as a future improvement. Instead, `App.jsx` polls
every 5 seconds while signed in:

- `GET /bookings` — refreshed on an interval and immediately after any
  action that changes bookings.
- `GET /messages` — same, with `counterpartId` resolved automatically
  for a senior (backend finds their assigned concierge) or derived from
  the concierge's current booking list (`bookings[0]?.seniorId` — this
  prototype only ever seeds one senior per concierge; a real multi-senior
  concierge would need a conversation picker).
- `GET /notifications` — same interval; the **first** fetch after
  sign-in establishes a baseline without generating toasts (otherwise a
  fresh login would toast-storm someone's entire alert history), and
  only IDs not seen before turn into a toast on later polls.

This means a change made in one browser session can take up to ~5s to
appear in another session watching the same data — acceptable for a
prototype, not for production (see `IMPROVEMENTS.md`).

## Component tree

```
App
├─ notifications/NotificationToast      (toast stack, fixed overlay below the header — rendered even signed out)
├─ auth/SignInScreen                    (rendered whenever there's no valid session)
│   └─ auth/GoogleIcon
├─ auth/OnboardingScreen                (rendered once signed in but auth.user.needsOnboarding)
├─ RoleToggle                      (role indicator + NotificationBell + Sign Out — only once signed in and onboarded)
│   └─ notifications/NotificationBell   (alert log dropdown)
├─ senior/SeniorView                    (role === 'senior')
│   ├─ SeniorHeader                     (real signed-in name; "Call Support" → CallSupportModal)
│   ├─ WellnessCheckIn
│   ├─ QuickRequestGrid                 (opens BookingModal per service)
│   ├─ ActiveBookings
│   └─ BookingModal                     (3-step: time block → notes/photo → confirmation)
└─ concierge/ConciergeView              (role === 'concierge')
    ├─ DashboardSummary                 (tasks today / completed / hours logged — derived from fetched bookings, not stored)
    ├─ ScheduleTimeline                 (opens TaskDetailModal per task)
    ├─ TaskDetailModal                  ("Mark as <next status>" button)
    └─ LiveChat                        (seniorName passed dynamically, no longer a hardcoded import)
```

## Notification simulation → real notifications

The backend now owns notification sending (`server/src/notifications/`,
pluggable `console`/`twilio` provider). The frontend no longer fabricates
alerts itself — every toast/log entry comes from `GET /notifications`,
which reflects rows the backend actually created as a side effect of a
real action (booking created, status advanced, chat sent, wellness
call-request). See `server/README.md` for the trigger map.

**Real bugs found and fixed while wiring this up** (worth knowing if you
touch this area again):

- A Postgres parameter-type conflict between an enum column assignment
  and a `CASE WHEN` text comparison in the same query was silently
  marking every notification `failed` even though it had "sent"
  successfully — fixed in `server/src/notifications/index.js` (see its
  inline comment).
- The toast stack was positioned at `top-3`, overlapping the sticky
  header's Sign Out button once more than one or two toasts stacked up
  (which happens easily now that real actions can fire multiple
  notifications in quick succession) — moved to `top-20` (below the
  header) and capped at 4 concurrently visible toasts
  (`components/notifications/NotificationToast.jsx`, `App.jsx`).

## Styling & accessibility

Tailwind v4, configured via `@theme` in `src/index.css` (custom
`navy-*` and `warm-*` color scales — not Tailwind's stock palette).
Accessibility constraints are enforced by convention, not by a lint
rule: body text starts at `text-lg` (18px), headings at `text-2xl`+
(24px+), and every interactive element uses generous padding
(`px-6 py-4` or larger) rather than default Tailwind button sizing. Any
new component should match those minimums rather than falling back to
`text-base`/`text-sm` defaults.

## Known simplifications (by design, for a prototype)

- Onboarding lets anyone self-select "Concierge" with no vetting — see
  "Onboarding" above.
- Photo upload in the booking modal only captures the file's `name`,
  not its bytes — there's no storage backend or upload endpoint yet.
- `eta` is a real timestamp now (computed server-side as the requested
  date + time block start), not a routing/schedule estimate.
- Polling, not realtime — see "Data fetching & polling" above.
