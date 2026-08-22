# Production Readiness Checklist

Status tracker for turning this from a prototype into something real
users (and their health-adjacent data) can rely on. Checked items were
implemented **and verified working** in this repo, not just planned —
each has a pointer to where. Unchecked items are still open; the note
under each says what's blocking it. `[~]` marks something implemented
against the real API/SDK but not yet run end-to-end (usually because
this environment has no real third-party credentials to test against).

This complements, not replaces, the other docs: `ARCHITECTURE.md` for
how things are built, `HANDOVER.md` for session-by-session status, and
`IMPROVEMENTS.md` for the broader product backlog. This file is
specifically "what stands between this and production."

## 1. Backend & data

- [x] **Postgres schema stood up and applied** — `db/schema.postgres.sql`
      runs cleanly against a real Postgres 16 instance with no edits
      needed.
- [x] **Migration tooling** — `server/scripts/migrate.js` applies
      `schema.postgres.sql` plus everything in `db/migrations/*.sql`, in
      order, tracked in a `schema_migrations` table so re-running is
      safe. `db/migrations/001_otp_codes.sql` is the first real additive
      migration on top of the base schema.
- [x] **Real API server** — `server/` (Express) implements auth,
      bookings, messages, wellness check-ins, notifications, and the
      service/time-block catalog against the real schema. Verified with
      live `curl` requests against a running Postgres instance: booking
      creation, status advancement, chat, and wellness check-in all
      persisted and round-tripped correctly.
- [x] **Frontend wired to the API** — `src/App.jsx` no longer holds
      fake local state; `src/api/client.js` calls every endpoint, and
      `src/api/mappers.js` translates responses into the shapes the
      existing view components expect. Verified with two fully
      independent Playwright browser sessions (one signed in as the
      seeded senior, one as the seeded concierge): booking creation,
      cross-session sync via polling, status advancement, chat, session
      persistence across a page reload, and sign-out — 13/13 checks
      passed, zero console errors.
- [ ] **Backups & point-in-time recovery** — not configured; depends on
      wherever this ends up hosted (RDS/Cloud SQL/etc.).
- [ ] **File attachment storage** — `booking_attachments` has a schema
      slot, but there's no upload endpoint or object storage wired up;
      the frontend booking modal still only captures a filename.

## 2. Auth & session

- [x] **Real phone OTP** — `server/src/routes/auth.routes.js`: codes are
      generated server-side, hashed (sha256) before storage in
      `otp_codes`, expire after 5 minutes, and cap at 5 verify attempts
      — all enforced in SQL, not just UI copy. Verified: wrong code
      rejected, correct code issues a JWT, expired/overused codes are
      rejected by the query itself.
- [x] **Real Google ID token verification** — `POST /auth/google` uses
      `google-auth-library` to verify a real Google ID token server-side
      (not a client-side "trust me" flag). Verified the code path
      returns `501` cleanly when `GOOGLE_CLIENT_ID` is unset, so it
      fails safe rather than silently accepting anything.
- [x] **JWT session issuance** — `signAccessToken`/`verifyAccessToken`
      (`server/src/lib/jwt.js`) plus `requireAuth`/`requireRole`
      middleware gate every resource route by real signed tokens, not a
      client-side `auth` flag. Verified: no token → 401, wrong role
      (senior calling a concierge-only route) → 403.
- [x] **Auth determines identity, not just gates access — end to end,
      including the frontend now.** `role` in `App.jsx` is derived from
      `auth.user.role`, not a free-floating toggle; verified in the
      browser that switching the role tab while signed in as a senior
      shows a "sign out to switch accounts" notice instead of silently
      switching (`ARCHITECTURE.md`, "Session & auth").
- [x] **Rate limiting on auth endpoints** — `express-rate-limit` on
      both OTP endpoints (5 requests / 15 min, 20 verifies / 15 min).
- [x] **Session persistence** — `src/api/client.js` stores the JWT +
      user in `localStorage`; `App.jsx` rehydrates it on load via
      `GET /auth/me` and discards it if invalid. Verified: signing in,
      creating a booking, then reloading the page keeps both the
      session and the booking intact.
- [~] **Frontend Google OAuth integration** — `src/lib/googleAuth.js`
      loads real Google Identity Services and requests a real ID token,
      wired into `SignInScreen.jsx` and gated behind
      `VITE_GOOGLE_CLIENT_ID`. Implemented against the real API but
      **never run end-to-end** — no real Google OAuth client is
      configured in this environment, so the full popup → ID token →
      `POST /auth/google` round trip is untested.
- [ ] **Real SMS delivery of the OTP** — verified against the `console`
      provider only (logs to stdout, and in dev is echoed back to the
      frontend as `devCode` so `SignInScreen` can display it inline —
      see `ARCHITECTURE.md`); `twilioProvider.js` is written and ready
      but untested against a real Twilio account (needs `TWILIO_*`
      credentials — see `server/.env.example`).
- [ ] **Refresh tokens / revocation** — sessions are a single
      long-lived JWT with no server-side revocation; a stolen token is
      valid until it expires. No "sign out everywhere" capability.
- [ ] **Trusted-device / remember-me** — every sign-in currently
      requires a fresh OTP or Google verification.

## 3. Notifications

- [x] **Pluggable provider abstraction** — `server/src/notifications/`
      dispatches to `consoleProvider.js` (default, logs + simulates
      "delivered") or `twilioProvider.js` (real SMS/WhatsApp via
      Twilio's SDK) based on `NOTIFICATIONS_PROVIDER`. Swapping providers
      is a one-env-var change, no code change.
- [x] **Real persistence with status tracking** — every notification is
      a row in `notifications` with `queued` → `sent`/`delivered`/
      `failed` states (not just an in-memory toast). Caught and fixed a
      real bug here during verification: a Postgres parameter-type
      conflict between the enum `status` column and a `CASE WHEN` text
      comparison in the same query silently marked every notification
      `failed` even though the console provider "sent" successfully —
      fixed in `notifications/index.js`.
- [~] **Real Twilio provider** — `twilioProvider.js` implements SMS and
      WhatsApp sends against the real Twilio SDK, but has never been run
      against a real Twilio account in this environment (no
      `TWILIO_*` credentials available to test with).
- [ ] **Delivery-status webhooks** — Twilio's actual delivery
      confirmation (vs. just "the API call to Twilio succeeded") isn't
      wired up; `sent`/`delivered` distinction exists in the schema but
      nothing calls back into it yet.
- [ ] **Retry/backoff on provider failures** — a failed send is recorded
      but never retried.

## 4. Compliance & data protection (health-adjacent data)

- [ ] **Encryption at rest** for `care_notes`, prescription photos, and
      wellness check-ins — not configured; depends on hosting choice.
- [ ] **Access-controlled object storage** for attachments — no storage
      is wired up at all yet (see 1. above).
- [ ] **Data retention & deletion policy** — not defined.
- [ ] **Audit log of data access** — `booking_status_history` audits
      status *changes*; nothing logs who *viewed* a senior's data.
- [ ] **Privacy policy / ToS** — not written.

## 5. Security hardening

- [x] **Input validation at the API boundary** — every route validates
      its body with `zod` (`server/src/routes/*.routes.js`); malformed
      requests get a `400` with details, not a raw DB error. Verified
      with an invalid `serviceCode`.
- [x] **Secrets kept out of git** — `server/.env` is gitignored;
      `server/.env.example` is the committed template.
- [ ] **Rate limiting beyond auth** — bookings/messages/notifications
      endpoints have none yet.
- [ ] **Dependency scanning** — `npm audit` currently shows 2 moderate
      transitive vulnerabilities via `google-auth-library` → `gaxios` →
      `uuid`; not yet resolved (forcing the fix risks a breaking
      `google-auth-library` bump, needs a deliberate upgrade + retest,
      not a blind `--force`). No Dependabot/Snyk configured.
- [ ] **HTTPS / secure token storage** — the API is plain HTTP in dev;
      no TLS termination, no secure-cookie or token-storage strategy
      decided for the frontend once it's wired up.

## 6. Testing & CI

- [ ] **Automated backend tests** — the API was verified manually via a
      `curl` walkthrough of every endpoint (documented in this session,
      not checked into the repo as a test suite).
- [ ] **Automated frontend/integration tests** — the full frontend↔backend
      flow (two independent sessions, cross-session sync, sign-in/out,
      session persistence) was verified with a Playwright script during
      this session, but it was a throwaway script in `/tmp`, not
      committed to the repo. Worth turning into a real, checked-in test
      given how easily this class of bug (see `HANDOVER.md`'s gotchas)
      slips through manual testing.
- [ ] **CI pipeline** — `npm run lint`/`npm run build` aren't run
      automatically anywhere yet.

## 7. Observability & ops

- [ ] **Structured logging** — the API uses plain `console.log`/
      `console.error`.
- [ ] **Error tracking** (Sentry or similar) — not configured.
- [ ] **Metrics/dashboards** — not configured.
- [x] **Basic health check** — `GET /health` checks real DB
      connectivity (`SELECT 1`), not just "the process is alive."
      Verified returns `{"status":"ok","db":"up"}`.

## 8. Infra & deployment

- [x] **Containerized backend** — `server/Dockerfile` +
      root `docker-compose.yml` (Postgres + API, with a healthcheck-gated
      migration step on boot). Written and reviewed, not yet run in this
      environment (no Docker daemon available in this sandbox — verified
      the equivalent flow instead by running Postgres and the API
      directly).
- [ ] **Staging/production environment separation** — only "local dev"
      exists.
- [ ] **CDN for static assets/photos** — n/a until attachment storage
      exists.
- [x] **Stateless API, DB-backed OTP** — a specific horizontal-scaling
      trap was designed around deliberately: OTP challenges live in the
      `otp_codes` table, not an in-process `Map`, so multiple API
      instances behind a load balancer all see the same pending codes.

## 9. Accessibility & legal

- [ ] **Screen-reader audit** — not done (frontend concern, see
      `IMPROVEMENTS.md`).
- [ ] **WCAG compliance pass** — not done.
- [ ] **ADA considerations** — not reviewed given the senior user base.

## 10. Multi-tenancy & RBAC

- [x] **Schema supports it** — `senior_concierge_assignments` (many
      seniors, many concierges, primary flag) is real and used by the
      backend (`findPrimaryConcierge`) to route new bookings and chat.
- [x] **Self-serve onboarding + assignment** — `OnboardingScreen` +
      `PATCH /auth/profile` let a new senior pick a real concierge from
      `GET /users/concierges` (not a hardcoded pair); no direct DB insert
      needed anymore for the common case. Verified end-to-end: a
      brand-new senior self-assigned to the seeded concierge and their
      first booking auto-routed there correctly.
- [ ] **No vetting/approval on concierge signup** — anyone can pick
      "Concierge" during onboarding with no admin approval, background
      check, or invitation step (see `ARCHITECTURE.md`'s "Onboarding").
      This is the multi-tenancy gap that actually matters for production.
- [ ] **Admin role capabilities** — `users.role` supports `'admin'` in
      the schema; no admin-facing routes or UI exist (e.g. to approve
      concierge signups, reassign a senior, or manage care teams).

---

## What changed in this session

The frontend (`src/`) was rewired end-to-end to call the real backend
instead of holding local `useState` fixtures: a new `src/api/` layer
(fetch client + response mappers), real OTP/Google auth flows, session
persistence, polling-based data sync, and a role model driven by the
signed-in account instead of a free toggle. `server/scripts/seed-demo.js`
was added so there's something to sign in as. Verified with two fully
independent Playwright browser sessions (real separate JWTs, not shared
state) walking through sign-in, booking creation, cross-session sync,
status advancement, chat, and session persistence across a reload —
13/13 checks passed, zero console errors.

Two real bugs were found and fixed during that verification (both now
documented in `ARCHITECTURE.md` and `HANDOVER.md`'s gotchas):

1. The notification poller would have toast-stormed a fresh sign-in
   with someone's entire alert history before this session's fix
   established a baseline on first fetch.
2. The toast stack's fixed position overlapped the header's Sign Out
   button once enough toasts stacked up (which real, fast-fired backend
   notifications made much more likely than the old single-fake-toast
   flow) — moved below the header and capped at 4 concurrent toasts.

## What changed in the following session

Resolved the onboarding gap called out above: `OnboardingScreen` +
`PATCH /auth/profile` + `GET /users/concierges` (`db/migrations/002_user_onboarding.sql`)
let a first-time sign-in pick a real name, role, and — for a senior — a
concierge chosen from actual accounts, instead of silently becoming a
nameless, unassigned senior. The JWT is re-issued on completion since
its `role` claim would otherwise go stale the moment onboarding changes
it (a real bug this surfaced immediately in manual testing, fixed before
it shipped). Verified end-to-end with two brand-new self-registered
accounts (a senior who picked the seeded concierge and successfully
booked against them, and a concierge) — 7/7 checks passed, zero console
errors.

The single biggest remaining gap is now **no vetting on concierge
signup** — anyone can self-select "Concierge" during onboarding with no
approval step, which is fine for a prototype but not for production
(see section 10 above).

## What a full component-prop audit turned up

Prompted by a user request to check for prop/field mismatches beyond
the `toName` bug above, all 18 frontend components were checked against
what their parent actually passes (not just spot-checked). Found one
more real bug in the same file: `NotificationToast.jsx` hardcoded the
word "delivered" regardless of the notification's actual `status`
(already present on the mapped object) — a failed send would have
silently claimed success. Fixed by rendering the real status word,
styled red for `'failed'`, in both the toast and the bell log. Also
updated stale copy ("Simulated SMS & WhatsApp alerts") in the bell
dropdown left over from before the backend was real. No other
component/prop mismatches found in the full pass.

This is worth internalizing as a standing practice, not a one-time
audit: whenever an API response shape changes, grep every component
that consumes the corresponding mapper's output, not just the one you
were actively editing.
