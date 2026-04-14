-- ============================================================
-- Migration 00022: LFG (Looking for Group) Matchmaking System
-- ============================================================

-- LFG posts table
CREATE TABLE lfg_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tcg TEXT NOT NULL,
  format TEXT,
  power_level INTEGER,
  max_radius_km DOUBLE PRECISION NOT NULL DEFAULT 10,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  location_label TEXT,
  available_from TIMESTAMPTZ NOT NULL,
  available_to TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'matched', 'expired', 'cancelled')),
  matched_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Generated geography column for PostGIS spatial queries
ALTER TABLE lfg_posts ADD COLUMN location GEOGRAPHY(POINT, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED;

-- Indexes
CREATE INDEX idx_lfg_posts_user ON lfg_posts (user_id);
CREATE INDEX idx_lfg_posts_active ON lfg_posts (status) WHERE status = 'active';
CREATE INDEX idx_lfg_posts_tcg ON lfg_posts (tcg);
CREATE INDEX idx_lfg_posts_time ON lfg_posts (available_from, available_to);
CREATE INDEX idx_lfg_posts_location ON lfg_posts USING GIST (location);

-- RLS
ALTER TABLE lfg_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view active LFG posts" ON lfg_posts FOR SELECT USING (
  status = 'active' OR auth.uid() = user_id
);
CREATE POLICY "Users can create own LFG posts" ON lfg_posts FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
CREATE POLICY "Users can update own LFG posts" ON lfg_posts FOR UPDATE USING (
  auth.uid() = user_id
);
CREATE POLICY "Users can delete own LFG posts" ON lfg_posts FOR DELETE USING (
  auth.uid() = user_id
);

-- Add lfg_match to notification types
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
  type IN (
    'session_invite', 'session_full', 'session_cancelled', 'session_alert',
    'friend_request', 'friend_accepted', 'review_received',
    'participant_joined', 'participant_left', 'chat_message',
    'lfg_match'
  )
);

-- RPC: Find matching LFG posts for a new post
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
    -- Time overlap: windows intersect
    AND lp.available_from < new_post.available_to
    AND lp.available_to > new_post.available_from
    -- Geographic proximity: within the smaller radius of both
    AND ST_DWithin(
      lp.location,
      new_post.location,
      LEAST(lp.max_radius_km, new_post.max_radius_km) * 1000
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- RPC: Find nearest shop for LFG session placement
CREATE OR REPLACE FUNCTION find_nearest_shop_for_lfg(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_tcg TEXT,
  p_radius_km DOUBLE PRECISION DEFAULT 15
)
RETURNS TABLE (
  shop_id UUID,
  shop_name TEXT,
  shop_address TEXT,
  shop_city TEXT,
  shop_lat DOUBLE PRECISION,
  shop_lng DOUBLE PRECISION,
  distance_km DOUBLE PRECISION
) AS $$
  SELECT
    s.id AS shop_id,
    s.name AS shop_name,
    s.address AS shop_address,
    s.city AS shop_city,
    ST_Y(s.location::geometry) AS shop_lat,
    ST_X(s.location::geometry) AS shop_lng,
    ST_Distance(s.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) / 1000 AS distance_km
  FROM shops s
  WHERE s.has_play_space = true
    AND p_tcg = ANY(s.tcgs)
    AND ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_km * 1000)
  ORDER BY ST_Distance(s.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography)
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- RPC: Get nearby active LFG posts for map display
CREATE OR REPLACE FUNCTION nearby_lfg_posts(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 25,
  filter_tcg TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  tcg TEXT,
  format TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  location_label TEXT,
  available_from TIMESTAMPTZ,
  available_to TIMESTAMPTZ,
  username TEXT,
  avatar_url TEXT
) AS $$
  SELECT
    lp.id, lp.user_id, lp.tcg, lp.format,
    lp.lat, lp.lng, lp.location_label,
    lp.available_from, lp.available_to,
    p.username, p.avatar_url
  FROM lfg_posts lp
  JOIN profiles p ON p.id = lp.user_id
  WHERE lp.status = 'active'
    AND lp.available_to > now()
    AND ST_DWithin(lp.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, radius_km * 1000)
    AND (filter_tcg IS NULL OR lp.tcg = filter_tcg)
  ORDER BY lp.available_from ASC;
$$ LANGUAGE sql STABLE;

-- Trigger: auto-expire old LFG posts
CREATE OR REPLACE FUNCTION expire_lfg_posts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE lfg_posts SET status = 'expired'
  WHERE status = 'active' AND available_to < now();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lfg_expire_stale
  AFTER INSERT ON lfg_posts
  FOR EACH STATEMENT EXECUTE FUNCTION expire_lfg_posts();
