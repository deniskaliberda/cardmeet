-- Add postal_code column to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);

-- Update nearby_sessions RPC to return postal_code
CREATE OR REPLACE FUNCTION nearby_sessions(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 25,
  filter_tcg TEXT DEFAULT NULL,
  filter_format TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  host_id UUID,
  title TEXT,
  description TEXT,
  tcg TEXT,
  format TEXT,
  power_level INTEGER,
  max_players INTEGER,
  current_players INTEGER,
  status TEXT,
  city TEXT,
  location_name TEXT,
  postal_code TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_km DOUBLE PRECISION,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  host_username TEXT,
  host_avatar TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id, s.host_id, s.title, s.description,
    s.tcg, s.format, s.power_level,
    s.max_players, s.current_players, s.status,
    s.city, s.location_name, s.postal_code,
    ST_Y(s.location::geometry) AS lat,
    ST_X(s.location::geometry) AS lng,
    ST_Distance(s.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) / 1000 AS distance_km,
    s.scheduled_at, s.created_at,
    p.username AS host_username,
    p.avatar_url AS host_avatar
  FROM sessions s
  JOIN profiles p ON p.id = s.host_id
  WHERE s.status IN ('open', 'full')
    AND s.scheduled_at > now()
    AND ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography, radius_km * 1000)
    AND (filter_tcg IS NULL OR s.tcg = filter_tcg)
    AND (filter_format IS NULL OR s.format = filter_format)
  ORDER BY s.scheduled_at ASC;
END;
$$ LANGUAGE plpgsql;
