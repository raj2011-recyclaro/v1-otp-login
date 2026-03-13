-- Users table stores the canonical mobile user account by phone number.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pickup_status') THEN
    CREATE TYPE pickup_status AS ENUM (
      'BOOKED',
      'DRIVER_ASSIGNED',
      'DRIVER_EN_ROUTE',
      'ARRIVED',
      'PICKUP_COMPLETED',
      'PAYMENT_CREDITED',
      'CANCELLED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  user_type VARCHAR(20) NOT NULL DEFAULT 'user',
  full_name VARCHAR(120),
  country VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS full_name VARCHAR(120);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS country VARCHAR(80);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) NOT NULL DEFAULT 'user';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_user_type_check'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_user_type_check
    CHECK (user_type IN ('user', 'admin', 'driver'));
  END IF;
END $$;

-- Sessions table stores hashed refresh tokens for secure token rotation.
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label VARCHAR(20) NOT NULL DEFAULT 'home',
  line1 VARCHAR(150) NOT NULL,
  line2 VARCHAR(150),
  city VARCHAR(80) NOT NULL,
  state VARCHAR(80) NOT NULL,
  pincode VARCHAR(20) NOT NULL,
  country VARCHAR(80) NOT NULL DEFAULT 'India',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pickups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status pickup_status NOT NULL DEFAULT 'BOOKED',
  category VARCHAR(80),
  weight_kg NUMERIC(10, 2),
  transport_mode VARCHAR(20),
  address_snapshot JSONB NOT NULL,
  pickup_date DATE,
  pickup_time TIME,
  scheduled_at TIMESTAMPTZ,
  notes VARCHAR(500),
  cancel_reason VARCHAR(300),
  rebooked_from_pickup_id UUID REFERENCES pickups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pickup_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_id UUID NOT NULL REFERENCES pickups(id) ON DELETE CASCADE,
  status pickup_status NOT NULL,
  note VARCHAR(300),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pickup_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_id UUID UNIQUE NOT NULL REFERENCES pickups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review VARCHAR(500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_addresses_default_unique
  ON user_addresses(user_id)
  WHERE is_default = TRUE;
CREATE INDEX IF NOT EXISTS idx_pickups_user_id_created_at ON pickups(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pickups_status ON pickups(status);
CREATE INDEX IF NOT EXISTS idx_pickup_status_events_pickup_id_created_at
  ON pickup_status_events(pickup_id, created_at ASC);

ALTER TABLE pickups
ADD COLUMN IF NOT EXISTS category VARCHAR(80);

ALTER TABLE pickups
ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(10, 2);

ALTER TABLE pickups
ADD COLUMN IF NOT EXISTS transport_mode VARCHAR(20);

ALTER TABLE pickups
ADD COLUMN IF NOT EXISTS pickup_date DATE;

ALTER TABLE pickups
ADD COLUMN IF NOT EXISTS pickup_time TIME;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pickups_transport_mode_check'
  ) THEN
    ALTER TABLE pickups
    ADD CONSTRAINT pickups_transport_mode_check
    CHECK (transport_mode IN ('self_drop', 'pickup'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'pickups_weight_kg_check'
  ) THEN
    ALTER TABLE pickups
    ADD CONSTRAINT pickups_weight_kg_check
    CHECK (weight_kg IS NULL OR weight_kg > 0);
  END IF;
END $$;
