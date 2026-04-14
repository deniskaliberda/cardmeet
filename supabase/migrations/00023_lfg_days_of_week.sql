-- Add days_of_week to lfg_posts so one post can cover multiple days
ALTER TABLE lfg_posts ADD COLUMN days_of_week INTEGER[] DEFAULT '{}';

-- Store time-of-day as hours (simpler than full timestamps for recurring availability)
ALTER TABLE lfg_posts ADD COLUMN time_from INTEGER DEFAULT 18;  -- hour of day (0-23)
ALTER TABLE lfg_posts ADD COLUMN time_to INTEGER DEFAULT 22;    -- hour of day (0-23)

-- Update find_lfg_matches to match by overlapping days + time hours
CREATE OR REPLACE FUNCTION find_lfg_matches(new_post_id UUID)
RETURNS TABLE (
  post_id UUID,
  post_user_id UUID,
  post_lat DOUBLE PRECISION,
  post_lng DOUBLE PRECISION,
  post_available_from TIMESTAMPTZ,
  post_available_to TIMESTAMPTZ
) AS $$
DECLARE
  new_post RECORD;
BEGIN
  SELECT * INTO new_post FROM lfg_posts WHERE id = new_post_id;

  RETURN QUERY
  SELECT
    lp.id AS post_id,
    lp.user_id AS post_user_id,
    lp.lat AS post_lat,
    lp.lng AS post_lng,
    lp.available_from AS post_available_from,
    lp.available_to AS post_available_to
  FROM lfg_posts lp
  WHERE lp.status = 'active'
    AND lp.id != new_post_id
    AND lp.user_id != new_post.user_id
    AND lp.tcg = new_post.tcg
    AND (lp.format IS NOT DISTINCT FROM new_post.format)
    -- Days overlap: at least one day in common
    AND (
      lp.days_of_week && new_post.days_of_week
      OR (array_length(lp.days_of_week, 1) IS NULL AND array_length(new_post.days_of_week, 1) IS NULL)
    )
    -- Time overlap: hours overlap
    AND lp.time_from < new_post.time_to
    AND lp.time_to > new_post.time_from
    -- Geographic proximity
    AND ST_DWithin(
      lp.location,
      new_post.location,
      LEAST(lp.max_radius_km, new_post.max_radius_km) * 1000
    );
END;
$$ LANGUAGE plpgsql STABLE;
