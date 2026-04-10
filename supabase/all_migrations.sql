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
-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reviewed_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (length(comment) <= 500),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(reviewer_id, reviewed_id, session_id),
  CHECK (reviewer_id != reviewed_id)
);

CREATE INDEX idx_reviews_reviewed ON reviews (reviewed_id);
CREATE INDEX idx_reviews_reviewer ON reviews (reviewer_id);
CREATE INDEX idx_reviews_session ON reviews (session_id);

-- ============================================================
-- RPC: Average rating for a profile
-- ============================================================
CREATE OR REPLACE FUNCTION get_profile_rating(profile_id UUID)
RETURNS NUMERIC AS $$
  SELECT ROUND(AVG(rating)::NUMERIC, 1)
  FROM reviews
  WHERE reviewed_id = profile_id;
$$ LANGUAGE sql STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone"
  ON reviews FOR SELECT USING (true);

CREATE POLICY "Authenticated users can write reviews"
  ON reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE USING (auth.uid() = reviewer_id);
-- ============================================================
-- FRIENDSHIPS
-- ============================================================
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

CREATE INDEX idx_friendships_requester ON friendships (requester_id);
CREATE INDEX idx_friendships_addressee ON friendships (addressee_id);
CREATE INDEX idx_friendships_status ON friendships (status);

CREATE TRIGGER friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RPC: Get friends of a user (accepted only)
-- ============================================================
CREATE OR REPLACE FUNCTION get_friends(user_id UUID)
RETURNS TABLE (
  friend_id UUID,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT
) AS $$
  SELECT
    CASE WHEN f.requester_id = user_id THEN f.addressee_id ELSE f.requester_id END AS friend_id,
    p.username,
    p.display_name,
    p.avatar_url
  FROM friendships f
  JOIN profiles p ON p.id = CASE
    WHEN f.requester_id = user_id THEN f.addressee_id
    ELSE f.requester_id
  END
  WHERE (f.requester_id = user_id OR f.addressee_id = user_id)
    AND f.status = 'accepted';
$$ LANGUAGE sql STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own friendships"
  ON friendships FOR SELECT USING (
    auth.uid() = requester_id OR auth.uid() = addressee_id
  );

CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Addressee can respond to requests"
  ON friendships FOR UPDATE USING (
    auth.uid() = addressee_id OR auth.uid() = requester_id
  );

CREATE POLICY "Users can remove own friendships"
  ON friendships FOR DELETE USING (
    auth.uid() = requester_id OR auth.uid() = addressee_id
  );
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
-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'session_invite',
    'session_full',
    'session_cancelled',
    'session_alert',
    'friend_request',
    'friend_accepted',
    'review_received',
    'participant_joined',
    'participant_left'
  )),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  body TEXT CHECK (length(body) <= 300),
  data JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE read = false;

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications as read"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE USING (auth.uid() = user_id);
