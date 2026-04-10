-- ============================================================
-- SESSION ALERTS
-- Notify users when a new session matching their criteria appears
-- ============================================================
CREATE TABLE session_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tcg TEXT,
  format TEXT,
  radius_km DOUBLE PRECISION NOT NULL DEFAULT 25,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_session_alerts_user ON session_alerts (user_id);
CREATE INDEX idx_session_alerts_active ON session_alerts (active);

-- ============================================================
-- RPC: Find alerts matching a new session
-- Called after a session is created to find users to notify
-- ============================================================
CREATE OR REPLACE FUNCTION get_matching_alerts(session_id UUID)
RETURNS TABLE (
  alert_id UUID,
  user_id UUID
) AS $$
  SELECT sa.id, sa.user_id
  FROM session_alerts sa
  JOIN sessions s ON s.id = session_id
  WHERE sa.active = true
    AND sa.user_id != s.host_id
    AND (sa.tcg IS NULL OR sa.tcg = s.tcg)
    AND (sa.format IS NULL OR sa.format = s.format)
    AND ST_DWithin(
      s.location,
      ST_SetSRID(ST_MakePoint(sa.lng, sa.lat), 4326)::geography,
      sa.radius_km * 1000
    );
$$ LANGUAGE sql STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE session_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON session_alerts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own alerts"
  ON session_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own alerts"
  ON session_alerts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own alerts"
  ON session_alerts FOR DELETE USING (auth.uid() = user_id);
