-- Update session_alerts to match application code
-- Add status, max_radius_km, days_of_week columns

ALTER TABLE session_alerts
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS max_radius_km DOUBLE PRECISION NOT NULL DEFAULT 25,
  ADD COLUMN IF NOT EXISTS days_of_week INTEGER[] NOT NULL DEFAULT '{}';

-- Migrate existing data from old columns
UPDATE session_alerts SET
  max_radius_km = radius_km,
  status = CASE WHEN active THEN 'active' ELSE 'paused' END;

-- Drop old columns
ALTER TABLE session_alerts DROP COLUMN IF EXISTS active;
ALTER TABLE session_alerts DROP COLUMN IF EXISTS radius_km;

-- Make lat/lng nullable (no longer required for basic alerts)
ALTER TABLE session_alerts ALTER COLUMN lat DROP NOT NULL;
ALTER TABLE session_alerts ALTER COLUMN lng DROP NOT NULL;

-- Add status constraint
ALTER TABLE session_alerts
  ADD CONSTRAINT session_alerts_status_check
  CHECK (status IN ('active', 'paused'));
