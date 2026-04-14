-- Local Game Store (LGS) flag on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_venue BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS venue_name TEXT,
  ADD COLUMN IF NOT EXISTS venue_website TEXT;
