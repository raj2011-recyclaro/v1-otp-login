-- Seed 10 demo pickups:
-- 3 New Delhi, 4 Noida, 3 Gurugram.
--
-- Run from host, if your Postgres is exposed on port 5433:
-- psql "postgresql://postgres:postgres@localhost:5433/app_db" -f db/seed_pickups.sql
--
-- Or run inside Docker:
-- docker exec -i firebase-otp-postgres psql -U postgres -d app_db < db/seed_pickups.sql

ALTER TABLE users
ADD COLUMN IF NOT EXISTS full_name VARCHAR(120);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS country VARCHAR(80);

ALTER TABLE users
ADD COLUMN IF NOT EXISTS user_type VARCHAR(20) NOT NULL DEFAULT 'user';

ALTER TABLE users
ADD COLUMN IF NOT EXISTS operating_city VARCHAR(80);

ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_user_type_check;

ALTER TABLE users
ADD CONSTRAINT users_user_type_check
CHECK (user_type IN ('user', 'buyer', 'admin', 'driver'));

ALTER TABLE pickups
DROP CONSTRAINT IF EXISTS pickups_transport_mode_check;

ALTER TABLE pickups
ADD CONSTRAINT pickups_transport_mode_check
CHECK (transport_mode IN ('self_drop', 'pickup'));

WITH demo_user AS (
  INSERT INTO users (phone, user_type, full_name, country, operating_city)
  VALUES ('+910000000001', 'user', 'Demo Pickup Owner', 'India', 'New Delhi')
  ON CONFLICT (phone) DO UPDATE
  SET
    user_type = EXCLUDED.user_type,
    full_name = EXCLUDED.full_name,
    country = EXCLUDED.country,
    operating_city = EXCLUDED.operating_city,
    updated_at = NOW()
  RETURNING id
),
seed_rows AS (
  SELECT *
  FROM (
    VALUES
      ('New Delhi', 'Connaught Place', 'A-11 Inner Circle', 'Near Rajiv Chowk Metro', 'Delhi', '110001', 'Paper', 12.50, 'pickup', CURRENT_DATE + 1, '10:00'::time, 'Office paper scrap'),
      ('New Delhi', 'Karol Bagh', '22 Ajmal Khan Road', 'Block 3', 'Delhi', '110005', 'Plastic', 18.00, 'pickup', CURRENT_DATE + 1, '12:30'::time, 'Mixed plastic pickup'),
      ('New Delhi', 'Saket', 'B-42 Press Enclave Road', 'Gate 2', 'Delhi', '110017', 'Metal', 9.75, 'pickup', CURRENT_DATE + 2, '15:00'::time, 'Small metal items'),

      ('Noida', 'Sector 18', 'C-18 Market Road', 'Near metro station', 'Uttar Pradesh', '201301', 'Paper', 21.00, 'pickup', CURRENT_DATE + 1, '11:00'::time, 'Shop cardboard boxes'),
      ('Noida', 'Sector 62', 'D-88 Industrial Area', 'Tower B', 'Uttar Pradesh', '201309', 'E-Waste', 6.50, 'pickup', CURRENT_DATE + 2, '14:00'::time, 'Old keyboards and cables'),
      ('Noida', 'Sector 137', 'Flat 1204, Paras Tierea', 'Tower 5', 'Uttar Pradesh', '201305', 'Plastic', 13.25, 'pickup', CURRENT_DATE + 3, '09:30'::time, 'Household plastic waste'),
      ('Noida', 'Sector 75', 'A-701 Golf Avenue', 'Main gate', 'Uttar Pradesh', '201301', 'Mixed Scrap', 28.00, 'pickup', CURRENT_DATE + 3, '16:30'::time, 'Mixed household scrap'),

      ('Gurugram', 'Cyber City', 'Building 8, DLF Cyber City', 'Reception desk', 'Haryana', '122002', 'Paper', 35.00, 'pickup', CURRENT_DATE + 1, '13:00'::time, 'Office paper and cartons'),
      ('Gurugram', 'Sector 56', 'House 94, Sector 56', 'Near HUDA market', 'Haryana', '122011', 'Metal', 15.50, 'pickup', CURRENT_DATE + 2, '10:30'::time, 'Old utensils and metal scrap'),
      ('Gurugram', 'Sohna Road', 'JMD Megapolis', 'Tower A loading bay', 'Haryana', '122018', 'E-Waste', 8.00, 'pickup', CURRENT_DATE + 4, '17:00'::time, 'Small e-waste items')
  ) AS rows(city, label, line1, line2, state, pincode, category, weight_kg, transport_mode, pickup_date, pickup_time, notes)
),
inserted_pickups AS (
  INSERT INTO pickups (
    user_id,
    status,
    category,
    weight_kg,
    transport_mode,
    address_snapshot,
    pickup_date,
    pickup_time,
    scheduled_at,
    notes
  )
  SELECT
    demo_user.id,
    'BOOKED',
    seed_rows.category,
    seed_rows.weight_kg,
    seed_rows.transport_mode,
    jsonb_build_object(
      'label', seed_rows.label,
      'line1', seed_rows.line1,
      'line2', seed_rows.line2,
      'city', seed_rows.city,
      'state', seed_rows.state,
      'pincode', seed_rows.pincode,
      'country', 'India'
    ),
    seed_rows.pickup_date,
    seed_rows.pickup_time,
    (seed_rows.pickup_date + seed_rows.pickup_time),
    seed_rows.notes
  FROM seed_rows
  CROSS JOIN demo_user
  RETURNING id
)
INSERT INTO pickup_status_events (pickup_id, status, note, metadata)
SELECT id, 'BOOKED', 'Demo pickup seeded', '{"source":"db/seed_pickups.sql"}'::jsonb
FROM inserted_pickups;
