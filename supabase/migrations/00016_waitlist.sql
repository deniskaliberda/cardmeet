-- Waitlist for full sessions
CREATE TABLE session_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, user_id)
);

CREATE INDEX idx_waitlist_session ON session_waitlist (session_id, created_at);

ALTER TABLE session_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view waitlist of sessions they host or joined"
  ON session_waitlist FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND host_id = auth.uid())
  );

CREATE POLICY "Users can join waitlist"
  ON session_waitlist FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave waitlist"
  ON session_waitlist FOR DELETE USING (auth.uid() = user_id);
