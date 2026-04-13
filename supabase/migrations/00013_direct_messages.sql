-- ============================================================
-- DIRECT MESSAGES
-- ============================================================
CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT no_self_message CHECK (sender_id <> receiver_id)
);

CREATE INDEX idx_dm_participants ON direct_messages (
  LEAST(sender_id::text, receiver_id::text),
  GREATEST(sender_id::text, receiver_id::text),
  created_at DESC
);
CREATE INDEX idx_dm_receiver_unread ON direct_messages (receiver_id) WHERE read = false;

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own DMs"
  ON direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send DMs to friends"
  ON direct_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM friendships
      WHERE status = 'accepted' AND (
        (requester_id = auth.uid() AND addressee_id = receiver_id) OR
        (addressee_id = auth.uid() AND requester_id = receiver_id)
      )
    )
  );

CREATE POLICY "Receiver can mark DMs as read"
  ON direct_messages FOR UPDATE
  USING (auth.uid() = receiver_id);

ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;

-- ============================================================
-- ADD chat_message NOTIFICATION TYPE
-- ============================================================
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'session_invite',
    'session_full',
    'session_cancelled',
    'session_alert',
    'friend_request',
    'friend_accepted',
    'review_received',
    'participant_joined',
    'participant_left',
    'chat_message'
  ));
