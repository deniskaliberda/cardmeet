-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL CHECK (length(username) BETWEEN 3 AND 30),
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT CHECK (length(bio) <= 500),
  preferred_tcgs TEXT[] DEFAULT '{}',
  city TEXT,
  location GEOGRAPHY(POINT, 4326),
  location_privacy TEXT DEFAULT 'fuzzy'
    CHECK (location_privacy IN ('hidden', 'fuzzy', 'city')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_profiles_location ON profiles USING GIST (location);
CREATE INDEX idx_profiles_username ON profiles (username);

-- ============================================================
-- SESSIONS
-- ============================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (length(title) BETWEEN 3 AND 100),
  description TEXT CHECK (length(description) <= 500),
  tcg TEXT NOT NULL,
  format TEXT NOT NULL,
  power_level INTEGER,
  max_players INTEGER NOT NULL CHECK (max_players BETWEEN 2 AND 20),
  current_players INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'full', 'in_progress', 'completed', 'cancelled')),
  city TEXT,
  location_name TEXT,
  location GEOGRAPHY(POINT, 4326),
  scheduled_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sessions_status ON sessions (status);
CREATE INDEX idx_sessions_tcg ON sessions (tcg);
CREATE INDEX idx_sessions_scheduled ON sessions (scheduled_at);
CREATE INDEX idx_sessions_location ON sessions USING GIST (location);
CREATE INDEX idx_sessions_host ON sessions (host_id);

-- ============================================================
-- SESSION PARTICIPANTS
-- ============================================================
CREATE TABLE session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'joined'
    CHECK (status IN ('joined', 'left', 'kicked')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_participants_session ON session_participants (session_id);
CREATE INDEX idx_participants_user ON session_participants (user_id);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_session ON messages (session_id, created_at);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update current_players and status
CREATE OR REPLACE FUNCTION update_session_player_count()
RETURNS TRIGGER AS $$
DECLARE
  player_count INTEGER;
  max_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO player_count
  FROM session_participants
  WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)
    AND status = 'joined';

  SELECT max_players INTO max_count
  FROM sessions
  WHERE id = COALESCE(NEW.session_id, OLD.session_id);

  UPDATE sessions
  SET current_players = player_count + 1, -- +1 for host
      status = CASE
        WHEN player_count + 1 >= max_count THEN 'full'
        WHEN (SELECT status FROM sessions WHERE id = COALESCE(NEW.session_id, OLD.session_id)) = 'full'
             AND player_count + 1 < max_count THEN 'open'
        ELSE (SELECT status FROM sessions WHERE id = COALESCE(NEW.session_id, OLD.session_id))
      END
  WHERE id = COALESCE(NEW.session_id, OLD.session_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER participants_changed
  AFTER INSERT OR UPDATE OR DELETE ON session_participants
  FOR EACH ROW EXECUTE FUNCTION update_session_player_count();

-- ============================================================
-- RPC: Nearby Sessions
-- ============================================================
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
    s.city, s.location_name,
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

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles: everyone can read, only own can update
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Sessions: everyone can read, only host can update/delete
CREATE POLICY "Sessions are viewable by everyone"
  ON sessions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create sessions"
  ON sessions FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update own session"
  ON sessions FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Host can delete own session"
  ON sessions FOR DELETE USING (auth.uid() = host_id);

-- Participants: everyone can read, users manage own participation
CREATE POLICY "Participants are viewable by everyone"
  ON session_participants FOR SELECT USING (true);

CREATE POLICY "Users can join sessions"
  ON session_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own participation"
  ON session_participants FOR UPDATE USING (auth.uid() = user_id);

-- Messages: only session participants can read and write
CREATE POLICY "Session participants can read messages"
  ON messages FOR SELECT USING (
    auth.uid() IN (
      SELECT sp.user_id FROM session_participants sp
      WHERE sp.session_id = messages.session_id AND sp.status = 'joined'
    )
    OR auth.uid() = (SELECT s.host_id FROM sessions s WHERE s.id = messages.session_id)
  );

CREATE POLICY "Session participants can send messages"
  ON messages FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND (
      auth.uid() IN (
        SELECT sp.user_id FROM session_participants sp
        WHERE sp.session_id = messages.session_id AND sp.status = 'joined'
      )
      OR auth.uid() = (SELECT s.host_id FROM sessions s WHERE s.id = messages.session_id)
    )
  );

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE session_participants;
