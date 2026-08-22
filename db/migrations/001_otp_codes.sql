-- Additive migration on top of schema.postgres.sql.
-- Stores phone-based OTP challenges server-side so verification survives
-- a server restart and works across multiple API instances (not viable
-- with an in-process Map). Codes are hashed, never stored in plaintext.

CREATE TABLE otp_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,        -- sha256(code), not the raw code
  attempts    INT NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_otp_codes_phone ON otp_codes(phone, created_at DESC);

-- A phone number can have many historical OTP rows (one per request);
-- only the most recent unconsumed, unexpired one is valid at verify time.
