# Senior Concierge Service — NoSQL schema (MongoDB-style)

Document-oriented alternative to `schema.postgres.sql`. Favors embedding
for data that's always read together (a booking's status history, its
attachments) and references for data with independent lifecycles or
unbounded growth (chat messages, notifications).

## `users`

```jsonc
{
  _id: ObjectId,
  role: "senior" | "concierge" | "admin",
  fullName: "Ramesh Rao",
  email: "ramesh.rao@example.com",
  phone: "+14155550100",              // E.164, unique
  passwordHash: "...",                // null if using magic link/SSO
  avatarUrl: null,
  createdAt: ISODate,
  updatedAt: ISODate,

  // present only when role == "senior"
  seniorProfile: {
    dateOfBirth: ISODate,
    address: { line: "42 Willow Creek Lane", city: "Fremont", state: "CA", postalCode: "94538" },
    emergencyContact: { name: "Priya Rao", phone: "+14155550111" },
    careNotes: "Mild mobility limitations, uses a cane.",
    assignedConciergeIds: [ObjectId]  // care team, primary first
  },

  // present only when role == "concierge"
  conciergeProfile: {
    bio: "5 years in home care coordination.",
    isActive: true,
    ratingAvg: 4.9,
    hourlyRate: 28.50
  }
}
```

Indexes: `{ phone: 1 } unique`, `{ role: 1 }`, `{ "seniorProfile.assignedConciergeIds": 1 }`.

## `serviceTypes` (small reference collection, or just an app-level constant)

```jsonc
{ _id: "medicines",   label: "Get Medicines",          description: "Prescription pickup & delivery",   iconKey: "pill" }
{ _id: "doctor-ride",  label: "Doctor Appointment Ride", description: "Transport to & from appointments", iconKey: "stethoscope" }
{ _id: "groceries",    label: "Groceries",               description: "Weekly shopping & essentials",     iconKey: "shopping-cart" }
{ _id: "tech-help",    label: "Tech & Computer Help",     description: "Phone, computer & TV assistance",  iconKey: "laptop" }
```

## `bookings`

The core document. Status history and attachments are embedded — they're
small, bounded, and always fetched with the parent booking.

```jsonc
{
  _id: ObjectId,
  seniorId: ObjectId,
  conciergeId: ObjectId | null,
  serviceTypeId: "medicines",
  requestedDate: ISODate,             // date only, time-of-day carried by timeBlock
  timeBlock: { code: "morning", label: "Morning", range: "9 AM - 12 PM" },
  eta: ISODate | null,
  status: "not_started" | "in_progress" | "completed" | "cancelled",
  notes: "Please pick up prescription from CVS on Main St.",
  attachments: [
    { fileUrl: "s3://.../slip.jpg", fileName: "slip.jpg", contentType: "image/jpeg", uploadedAt: ISODate }
  ],
  statusHistory: [
    { status: "not_started", changedBy: ObjectId, changedAt: ISODate },
    { status: "in_progress",  changedBy: ObjectId, changedAt: ISODate }
  ],
  createdAt: ISODate,
  updatedAt: ISODate
}
```

Indexes: `{ seniorId: 1, createdAt: -1 }`, `{ conciergeId: 1, status: 1 }`,
`{ requestedDate: 1 }`.

Embedding `statusHistory` keeps "hours logged" and audit reads a single
document fetch; if a booking could accumulate unbounded transitions (it
can't — max 4 states) this would instead be a separate collection.

## `wellnessCheckins`

```jsonc
{
  _id: ObjectId,
  seniorId: ObjectId,
  status: "well" | "call_requested",
  createdAt: ISODate
}
```

Index: `{ seniorId: 1, createdAt: -1 }`.

## `conversations` + `messages`

Kept as separate collections (unlike bookings' embedded history) because
message volume per conversation is unbounded over the life of the
relationship.

```jsonc
// conversations
{
  _id: ObjectId,
  seniorId: ObjectId,
  conciergeId: ObjectId,
  createdAt: ISODate
}

// messages
{
  _id: ObjectId,
  conversationId: ObjectId,
  senderId: ObjectId,
  body: "Thank you Maria, I will be ready at the front door.",
  sentAt: ISODate,
  readAt: ISODate | null
}
```

Indexes: `conversations: { seniorId: 1, conciergeId: 1 } unique`;
`messages: { conversationId: 1, sentAt: 1 }`.

## `notifications` (SMS / WhatsApp / push alert log)

```jsonc
{
  _id: ObjectId,
  recipientId: ObjectId,
  channel: "sms" | "whatsapp" | "push" | "email",
  toAddress: "+14155550100",
  message: "Your concierge Maria is on the way for your Doctor Appointment Ride.",
  relatedBookingId: ObjectId | null,
  provider: "twilio" | "whatsapp_cloud_api",
  providerMessageId: "SM123abc...",   // for correlating delivery webhooks
  status: "queued" | "sent" | "delivered" | "failed",
  createdAt: ISODate,
  sentAt: ISODate | null,
  deliveredAt: ISODate | null,
  failedReason: null
}
```

Indexes: `{ recipientId: 1, createdAt: -1 }`, `{ relatedBookingId: 1 }`.

## Embed vs. reference summary

| Data | Choice | Why |
|---|---|---|
| Booking status history | Embed | Bounded (≤4 entries), always read with the booking |
| Booking attachments | Embed | Small, bounded, always read with the booking |
| Chat messages | Reference | Unbounded growth, paginated independently |
| Notifications | Reference | Unbounded, queried on its own (notification center, delivery webhooks) |
| Senior/Concierge profile | Embed in `users` | 1:1, always read together with the account |

## Provider integration notes (either schema)

This flow is actually implemented against the Postgres schema —
`server/src/notifications/index.js`:

1. Inserts a `notifications` row with `status: 'queued'`.
2. Calls a pluggable provider (`consoleProvider.js` for dev, or
   `twilioProvider.js` for real Twilio SMS/WhatsApp), storing the
   returned `providerMessageId`.
3. Updates `status` to `'sent'`/`'delivered'` (or `'failed'` with a
   reason) based on the provider call's outcome.

Not yet implemented: step 3 only reflects whether the *API call to the
provider* succeeded, not the provider's own delivery-status webhook
(Twilio can report `delivered` asynchronously after the fact) — see
`PRODUCTION_READINESS.md`.

The `relatedBookingId` link lets you show "3 alerts sent" on a booking's
detail view without a separate join table — this part is implemented
identically in the Mongo design (a `relatedBookingId` field), even
though the Mongo schema itself isn't.
