-- Update nearby_sessions RPC to include shop_id and shop_name
-- Note: params renamed to p_lat/p_lng to avoid collision with RETURNS columns
DROP FUNCTION IF EXISTS nearby_sessions(double precision, double precision, double precision, text, text);

CREATE FUNCTION nearby_sessions(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
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
  host_avatar TEXT,
  shop_id UUID,
  shop_name TEXT
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
    ST_Distance(s.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) / 1000 AS distance_km,
    s.scheduled_at, s.created_at,
    p.username AS host_username,
    p.avatar_url AS host_avatar,
    s.shop_id,
    sh.name AS shop_name
  FROM sessions s
  JOIN profiles p ON p.id = s.host_id
  LEFT JOIN shops sh ON sh.id = s.shop_id
  WHERE s.status IN ('open', 'full')
    AND s.scheduled_at > now()
    AND ST_DWithin(s.location, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, radius_km * 1000)
    AND (filter_tcg IS NULL OR s.tcg = filter_tcg)
    AND (filter_format IS NULL OR s.format = filter_format)
  ORDER BY s.scheduled_at ASC;
END;
$$ LANGUAGE plpgsql;
