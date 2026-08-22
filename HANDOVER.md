# Handover

Status as of 2026-08-22. This is now a real client-server app: React
frontend + Express/Postgres backend, wired together end-to-end.

## What's done

- **Full frontend** for both roles: role indicator, wellness check-in,
  quick-request grid, 3-step booking modal, active bookings list,
  concierge dashboard/schedule/task-detail/chat, and a sign-in gate
  (Google button + phone/OTP, sign-out from the header). See `README.md`
  for the feature list.
- **Full backend** (`server/`): Express + Postgres, implementing
  `db/schema.postgres.sql` as-is. Real phone-OTP auth (server-hashed,
  expiring, rate-limited codes), real Google ID token verification,
  JWT sessions, role-based route protection, and a pluggable
  SMS/WhatsApp notification provider (console-logged by default, real
  Twilio when configured).
- **Frontend wired to the backend** — `src/App.jsx` no longer holds
  fake local state; every booking/message/wellness-checkin/notification
  is a real HTTP call, persisted in Postgres. Sessions persist in
  `localStorage` and survive a page reload. See `ARCHITECTURE.md`'s
  "Session & auth" and "Data fetching & polling" sections for exactly
  how.
- **Two genuinely independent sessions verified end-to-end**: a senior
  account and a concierge account, signed in via two separate browser
  contexts (not shared state), tested via a full Playwright walkthrough
  — sign-in, booking creation, cross-session sync via polling, status
  advancement, chat, sign-out, and session persistence across a reload.
  13/13 checks passed with zero console errors.
- **Database schema + migrations** (`db/schema.postgres.sql`,
  `db/migrations/`, `server/scripts/migrate.js`) and a demo seed script
  (`server/scripts/seed-demo.js`) that creates the Ramesh Rao (senior) /
  Maria Santos (concierge) pair used throughout testing.
- **Self-serve onboarding** — a first-time sign-in (new phone or Google
  account) now goes through `OnboardingScreen` instead of silently
  becoming a nameless senior: pick your real name, role (Senior or
  Concierge), and for a senior, an address and a concierge chosen from
  `GET /users/concierges` (real accounts). Backend: `needs_onboarding`
  column + `PATCH /auth/profile` (`db/migrations/002_user_onboarding.sql`,
  `server/src/services/users.js`). See "Onboarding" in `ARCHITECTURE.md`.
  Verified end-to-end with a brand-new senior (self-assigned to the
  seeded concierge, then successfully created a booking that auto-routed
  to that concierge) and a brand-new concierge — 7/7 checks passed, zero
  console errors.
- Build (`npm run build`) and lint (`npm run lint`) both pass clean on
  the frontend.

## What's NOT done / explicitly out of scope so far

- **Role is fixed per account, not freely toggleable.** This is a
  deliberate consequence of real auth (see `ARCHITECTURE.md`), but it
  means there's no way to preview both roles from a single signed-in
  session anymore — you sign out and back in as the other seeded
  account. If a single-session dual-role preview is still wanted for
  demos, that would need a product decision (e.g., an admin/impersonation
  mode), not just a frontend tweak.
- **No vetting on concierge signup.** Onboarding is now self-serve, but
  anyone can pick "Concierge" with no approval/background-check step —
  fine for a prototype, not for production (see `ARCHITECTURE.md`'s
  "Onboarding" section and `PRODUCTION_READINESS.md`).
- **Google sign-in is implemented but unverified end-to-end.** The code
  (`src/lib/googleAuth.js`, `POST /auth/google`) is written against the
  real Google Identity Services and `google-auth-library` APIs, but
  there's no real `GOOGLE_CLIENT_ID` configured in this environment to
  test the full round trip against.
- **No real SMS/WhatsApp delivery tested.** `server/src/notifications/twilioProvider.js`
  is written against the real Twilio SDK but has never been run against
  a real Twilio account (no credentials available here).
- **No file upload storage.** The booking modal's photo picker still
  only keeps the filename for display; nothing is persisted or uploaded.
- **No realtime sync.** The frontend polls every 5s
  (`ARCHITECTURE.md`); a change in one session can take up to that long
  to appear in another.
- **No automated test suite checked into the repo.** Verification has
  been manual + ad hoc Playwright scripts run during development (not
  committed).
- **No routing/deep-linking**, no refresh-token rotation/revocation, no
  rate limiting beyond the auth endpoints, no CI. Full list in
  `PRODUCTION_READINESS.md`.

## Suggested next steps, roughly in order

1. **Gate concierge signup** — some form of approval/invitation step
   before `role = 'concierge'` grants access to senior data; right now
   onboarding trusts self-selection entirely.
2. **Verify Google sign-in end-to-end** — get a real Google OAuth client
   ID, set `VITE_GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_ID`, and confirm the
   full popup → ID token → backend verification round trip actually
   works (it's never been run against real credentials).
3. **Verify Twilio delivery end-to-end** — same idea for
   `NOTIFICATIONS_PROVIDER=twilio`; get a Twilio trial account and
   confirm a real SMS/WhatsApp message arrives.
4. **File uploads** — add real object storage (S3/GCS) for booking
   attachments; the schema already has `booking_attachments` ready for it.
5. **Tests** — at minimum, cover the cross-session sync paths, the auth
   gate, and the onboarding flow, since those are the features most
   likely to silently break during a refactor and are currently only
   checked by uncommitted Playwright scripts.
6. **Realtime sync** — replace polling with websockets/SSE once the
   5-second staleness becomes a real problem rather than a documented
   trade-off.

## Gotchas for whoever picks this up

- Tailwind v4 is configured via `@theme` in `src/index.css`, not a
  `tailwind.config.js` — custom colors (`navy-*`, `warm-*`) live there.
- **Postgres enum columns + `CASE WHEN` in the same query**: binding one
  parameter to both an enum-typed column assignment and a text
  comparison in a single prepared statement fails with "inconsistent
  types deduced for parameter" — pass the value twice as separate
  parameters instead. Hit this in `server/src/notifications/index.js`;
  see its inline comment.
- **Don't fire side effects from inside a `setState` functional
  updater** — React's dev-mode StrictMode double-invokes those updaters,
  which silently duplicated a toast earlier in this project's history.
  Less relevant now that state changes go through the backend, but the
  pattern still applies to any remaining local `useState` updaters.
- **JWT claims go stale the moment the underlying DB row changes** —
  `requireRole()` checks the token's `role` claim, not a fresh DB read.
  Any endpoint that changes a user's role (currently only
  `PATCH /auth/profile`) must re-issue the token, or the user gets 403'd
  on their new role's routes until they happen to sign in again. Caught
  this while building onboarding, before it shipped — same class of bug
  as anywhere else a cached/derived value can drift from its source.
- **Check API response field names against every consumer, not just one
  call site.** `GET /notifications` never returned a `toName` field
  (only `toAddress`), but both `NotificationToast.jsx` and
  `NotificationBell.jsx` rendered `{toast.toName}` — the toast/bell
  header silently showed "SMS to" with nothing after it, no error
  anywhere, and it slipped past the frontend-wiring verification pass
  because that pass only checked *that* a toast appeared with the right
  message, not the header's exact text. Fixed by joining the recipient's
  own name server-side (`server/src/notifications/index.js`). Found
  only by re-reading the component/mapper pair side by side while
  answering an unrelated docs-review question — worth doing that kind of
  cross-check again for `messages`/`bookings` if either shape changes.
  The same pass turned up a second bug in the same file: `NotificationToast.jsx`
  hardcoded the word "delivered" instead of reading the notification's
  real `status` (`queued`/`sent`/`delivered`/`failed`, already present on
  the mapped object) — a failed send would have silently claimed
  "delivered." Fixed by rendering `toast.status`, styled red for
  `'failed'`. Did a full pass of all 18 components against their
  parents' props after this to check for more of the same; nothing
  else turned up.
- **The toast stack can overlap the header** if enough toasts stack up
  at once (real actions can now fire several notifications back to
  back) — it's positioned at `top-20` and capped at 4 concurrent toasts
  for this reason (`NotificationToast.jsx`, `App.jsx`). If you change
  the header height, re-check this doesn't regress.
- Accessibility minimums (18px body / 24px headings / oversized touch
  targets) are enforced by convention only, not a lint rule — check new
  components against `ARCHITECTURE.md`'s styling section before merging.
