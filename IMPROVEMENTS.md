# Future Improvements

A backlog of ideas beyond the current app, grouped by area. This is a
wishlist, not a commitment — nothing here is scheduled. For the
concrete, ordered list of what's next given where things stand today,
see "Suggested next steps" in `HANDOVER.md`; this file is the broader
set of ideas beyond that immediate list.

## Product & UX

- **Care team support** — more than one concierge per senior (the
  schema already has `senior_concierge_assignments` for this), with a
  way to see who's covering today.
- **Family/caregiver view** — a read-only dashboard for a family member
  (the schema already has `senior_profiles.emergency_contact_name` /
  `emergency_contact_phone`) to see upcoming visits and wellness
  check-in history without full concierge access.
- **Recurring bookings** — "every Tuesday morning" for groceries
  instead of re-submitting the same request weekly.
- **Cancel / reschedule** — bookings currently only move forward
  through the status cycle; there's no way to cancel or change the
  time block after submitting.
- **Post-visit feedback** — a simple rating or comment from the senior
  once a booking is marked Completed.
- **Concierge availability/capacity** — a senior's assigned concierge
  gets every one of their bookings regardless of load; there's no
  concept of a concierge marking themselves unavailable for a time
  block or being at capacity.
- **Distinct emergency/SOS action** — "Call Support" and the wellness
  check-in's "I need a phone call" currently cover similar ground;
  consider a single, unambiguous urgent-help action.

## Accessibility

- **User-adjustable text size** — current sizing (18px+/24px+) is a
  strong fixed baseline, but a senior with low vision may want it
  larger still; a text-size stepper would help.
- **Screen reader pass** — do a full audit with a real screen reader
  (VoiceOver/NVDA), not just semantic HTML, especially for the modals
  and toast stack.
- **Voice input** — for the booking notes field, typing may be harder
  than speaking for some users.
- **Reduced-motion mode** — respect `prefers-reduced-motion` for toast
  slide-ins and modal transitions.

## Notifications

- **Real delivery** — replace the simulation with Twilio (SMS) and the
  WhatsApp Cloud API; see "Provider integration notes" in
  `db/schema.mongodb.md` for the intended flow.
- **Notification preferences** — let a senior/concierge choose SMS vs.
  WhatsApp vs. push, and set quiet hours.
- **Two-way SMS** — let a senior reply to an alert by text without
  opening the app (e.g. reply "YES" to confirm a visit).
- **Push notifications (PWA)** — more reliable than in-app toasts for
  a concierge who isn't actively looking at the app.

## Engineering

- **Automated tests** — nothing is checked into the repo yet; at
  minimum, cover the two live-sync paths (new booking → concierge
  schedule, status change → senior bookings) since those are the
  easiest thing to silently break in a refactor.
- **CI pipeline** — run `npm run lint` and `npm run build` on every PR.
- **TypeScript** — the prop shapes passed between components (booking
  objects, notification entries) are exactly the kind of thing that
  benefits from static types as the component count grows.
- **Error boundaries** — no error boundary exists yet; a thrown error
  anywhere currently blanks the whole app.
- **Real-time sync** — once there's a backend, replace the "same
  in-memory state" trick with WebSockets or polling so two real
  devices (senior's tablet, concierge's phone) stay in sync.

## Security & compliance

- **Verify the real auth providers end-to-end** — phone OTP is real and
  verified (server-hashed codes, rate limited, JWT sessions); Google
  sign-in is implemented against the real API but has never run
  end-to-end (no real OAuth client configured in this environment) —
  see `PRODUCTION_READINESS.md`.
- **Concierge vetting/approval** — onboarding is now self-serve (pick
  your name, role, and concierge — see `ARCHITECTURE.md`), but anyone
  can self-select "Concierge" with no approval, background check, or
  invitation step. This is now the top remaining auth-adjacent blocker
  for anything beyond a prototype.
- **Care-team management UI** — a senior can only pick one concierge
  during onboarding; changing concierges, adding a secondary/backup, or
  an admin reassigning a senior all require a direct DB update today.
- **Multi-factor / trusted devices** — once real auth exists, consider
  "remember this device" so a senior isn't asked for an OTP every visit.
- **PHI-aware handling** — `care_notes`, prescription photos, and
  wellness check-ins are health-adjacent data; a real backend should
  treat them with HIPAA-appropriate storage/access controls, not just
  a plain `TEXT` column and a public S3 bucket.
- **Audit trail beyond status history** — log who *viewed* a senior's
  data, not just who changed a booking's status.

## Performance & scale

- **Pagination** — the chat thread and notification log currently
  render every message/entry ever created; fine for a demo, not for a
  real multi-week history.
- **Optimistic UI + rollback** — once real network calls replace local
  state updates, booking/status actions will need optimistic updates
  with error rollback to keep the current instant-feeling UX.
