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
