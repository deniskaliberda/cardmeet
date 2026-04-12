-- Replace star ratings with thumbs-up + tags system
-- Only positive recommendations are stored; skipping a review leaves no trace

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS recommended BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Migrate existing ratings: 4-5 stars → recommended, 1-3 → not
UPDATE reviews SET
  recommended = CASE WHEN rating >= 4 THEN true ELSE false END;

-- Drop the old rating column (and its CHECK constraint with it)
ALTER TABLE reviews DROP COLUMN IF EXISTS rating;

-- Update RPC: now returns thumbs-up count instead of average
CREATE OR REPLACE FUNCTION get_profile_rating(profile_id UUID)
RETURNS NUMERIC AS $$
  SELECT COUNT(*)::NUMERIC
  FROM reviews
  WHERE reviewed_id = profile_id AND recommended = true;
$$ LANGUAGE sql STABLE;
