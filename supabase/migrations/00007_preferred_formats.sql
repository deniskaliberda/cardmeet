-- Add preferred_formats column to store per-TCG format preferences
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS preferred_formats jsonb DEFAULT '[]'::jsonb;
