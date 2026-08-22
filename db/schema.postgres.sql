-- Senior Concierge Service — relational schema (PostgreSQL)
-- Portable to MySQL with minor changes (ENUM -> VARCHAR + CHECK, gen_random_uuid() -> UUID()).

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- for gen_random_uuid()

-- ============================================================
-- Identity
-- ============================================================

CREATE TYPE user_role AS ENUM ('senior', 'concierge', 'admin');

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role          user_role NOT NULL,
  full_name     TEXT NOT NULL,
  email         TEXT UNIQUE,
  phone         TEXT NOT NULL UNIQUE,        -- E.164 format, e.g. +14155550100
  password_hash TEXT,                        -- null if auth is via magic link / SSO
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Senior-specific profile fields
CREATE TABLE senior_profiles (
  user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  date_of_birth         DATE,
  address_line          TEXT NOT NULL,
  city                  TEXT,
  state                 TEXT,
  postal_code           TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  care_notes            TEXT                -- allergies, mobility needs, etc.
);

-- Concierge-specific profile fields
CREATE TABLE concierge_profiles (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio           TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  rating_avg    NUMERIC(2,1) DEFAULT 5.0,
  hourly_rate   NUMERIC(8,2)
);

-- Which concierge(s) a senior is normally assigned to (many-to-many, supports care teams)
CREATE TABLE senior_concierge_assignments (
  senior_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  concierge_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (senior_id, concierge_id)
);

-- ============================================================
-- Service catalog
-- ============================================================

CREATE TABLE service_types (
  id          SERIAL PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,    -- 'medicines' | 'doctor-ride' | 'groceries' | 'tech-help'
  label       TEXT NOT NULL,
  description TEXT,
  icon_key    TEXT,                    -- lucide icon name used by frontend
  is_active   BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE time_blocks (
  id          SERIAL PRIMARY KEY,
  code        TEXT UNIQUE NOT NULL,    -- 'morning' | 'afternoon' | 'evening'
  label       TEXT NOT NULL,
  start_time  TIME NOT NULL,
  end_time    TIME NOT NULL
);

-- ============================================================
-- Bookings (the core entity)
-- ============================================================

CREATE TYPE booking_status AS ENUM ('not_started', 'in_progress', 'completed', 'cancelled');

CREATE TABLE bookings (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id        UUID NOT NULL REFERENCES users(id),
  concierge_id     UUID REFERENCES users(id),          -- nullable until assigned
  service_type_id  INT NOT NULL REFERENCES service_types(id),
  requested_date   DATE NOT NULL,
  time_block_id    INT NOT NULL REFERENCES time_blocks(id),
  eta              TIMESTAMPTZ,                          -- concrete arrival estimate once assigned
  status           booking_status NOT NULL DEFAULT 'not_started',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_senior_id    ON bookings(senior_id);
CREATE INDEX idx_bookings_concierge_id ON bookings(concierge_id);
CREATE INDEX idx_bookings_status       ON bookings(status);
CREATE INDEX idx_bookings_date         ON bookings(requested_date);

-- Uploaded photos (e.g. prescription slips) attached to a booking
CREATE TABLE booking_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,        -- S3/GCS object URL
  file_name   TEXT,
  content_type TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit trail of every status transition (drives concierge "hours logged" + reporting)
CREATE TABLE booking_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status      booking_status NOT NULL,
  changed_by  UUID NOT NULL REFERENCES users(id),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_status_history_booking ON booking_status_history(booking_id);

-- ============================================================
-- Wellness check-ins
-- ============================================================

CREATE TYPE wellness_status AS ENUM ('well', 'call_requested');

CREATE TABLE wellness_checkins (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id   UUID NOT NULL REFERENCES users(id),
  status      wellness_status NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wellness_senior_date ON wellness_checkins(senior_id, created_at);

-- ============================================================
-- Chat
-- ============================================================

-- One conversation per senior/concierge pair; bookings reference into it implicitly via participants
CREATE TABLE conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_id     UUID NOT NULL REFERENCES users(id),
  concierge_id  UUID NOT NULL REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (senior_id, concierge_id)
);

CREATE TABLE chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id),
  body            TEXT NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at         TIMESTAMPTZ
);

CREATE INDEX idx_chat_messages_conversation ON chat_messages(conversation_id, sent_at);

-- ============================================================
-- Notifications (SMS / WhatsApp / push alert log)
-- ============================================================

CREATE TYPE notification_channel AS ENUM ('sms', 'whatsapp', 'push', 'email');
CREATE TYPE notification_status  AS ENUM ('queued', 'sent', 'delivered', 'failed');

CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id      UUID NOT NULL REFERENCES users(id),
  channel           notification_channel NOT NULL,
  to_address        TEXT NOT NULL,          -- phone number or email actually dialed/sent to
  message           TEXT NOT NULL,
  related_booking_id UUID REFERENCES bookings(id),
  provider          TEXT,                   -- 'twilio', 'whatsapp_cloud_api', etc.
  provider_message_id TEXT,                 -- external id returned by the provider, for webhook correlation
  status            notification_status NOT NULL DEFAULT 'queued',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at           TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  failed_reason     TEXT
);

CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_booking   ON notifications(related_booking_id);

-- ============================================================
-- Seed data matching the current frontend prototype
-- ============================================================

INSERT INTO service_types (code, label, description, icon_key) VALUES
  ('medicines',   'Get Medicines',            'Prescription pickup & delivery',  'pill'),
  ('doctor-ride', 'Doctor Appointment Ride',   'Transport to & from appointments','stethoscope'),
  ('groceries',   'Groceries',                 'Weekly shopping & essentials',    'shopping-cart'),
  ('tech-help',   'Tech & Computer Help',      'Phone, computer & TV assistance', 'laptop');

INSERT INTO time_blocks (code, label, start_time, end_time) VALUES
  ('morning',   'Morning',   '09:00', '12:00'),
  ('afternoon', 'Afternoon', '14:00', '17:00'),
  ('evening',   'Evening',   '18:00', '20:00');
