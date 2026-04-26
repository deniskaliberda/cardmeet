-- ============================================================
-- Session-Participation Notifications via SECURITY DEFINER triggers
--
-- Reason: notifications has RLS enabled with no INSERT policy. Every
-- server-action insert against it (joinSession, leaveSession,
-- removeParticipant, cancelSession, inviteToSession) was silently
-- dropped — same root cause that 00029 fixed for direct_messages and
-- friendships. This migration finishes the job for session_participants.
--
-- Also widens the type CHECK so a few previously-unused notification
-- variants (participant_kicked) become valid.
-- ============================================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'session_invite',
  'session_full',
  'session_cancelled',
  'session_alert',
  'friend_request',
  'friend_accepted',
  'review_received',
  'participant_joined',
  'participant_left',
  'participant_kicked',
  'chat_message',
  'lfg_match'
));

-- ----------------------------------------------------------------
-- AFTER INSERT on session_participants: notify host that someone joined
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_on_participant_joined()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  joiner_name TEXT;
  sess RECORD;
BEGIN
  IF NEW.status <> 'joined' THEN
    RETURN NEW;
  END IF;

  SELECT host_id, title INTO sess FROM sessions WHERE id = NEW.session_id;
  IF sess.host_id IS NULL OR sess.host_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  SELECT username INTO joiner_name FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    sess.host_id,
    'participant_joined',
    COALESCE(joiner_name, 'Jemand') || ' ist deiner Session beigetreten',
    sess.title,
    jsonb_build_object('session_id', NEW.session_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS participant_joined_notify ON session_participants;
CREATE TRIGGER participant_joined_notify
  AFTER INSERT ON session_participants
  FOR EACH ROW EXECUTE FUNCTION notify_on_participant_joined();

-- ----------------------------------------------------------------
-- AFTER UPDATE on session_participants: handle status transitions
--   joined -> left   : notify host
--   joined -> kicked : notify the participant
--   anything -> joined (rejoin): notify host (mirrors INSERT path)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_on_participant_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  actor_name TEXT;
  sess RECORD;
BEGIN
  -- No-op if status didn't change
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT host_id, title INTO sess FROM sessions WHERE id = NEW.session_id;
  IF sess.host_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Re-join: route through the joined path
  IF OLD.status <> 'joined' AND NEW.status = 'joined' AND sess.host_id <> NEW.user_id THEN
    SELECT username INTO actor_name FROM profiles WHERE id = NEW.user_id;
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      sess.host_id,
      'participant_joined',
      COALESCE(actor_name, 'Jemand') || ' ist deiner Session beigetreten',
      sess.title,
      jsonb_build_object('session_id', NEW.session_id)
    );
    RETURN NEW;
  END IF;

  -- Voluntary leave: notify host (only if user wasn't the host)
  IF OLD.status = 'joined' AND NEW.status = 'left' AND sess.host_id <> NEW.user_id THEN
    SELECT username INTO actor_name FROM profiles WHERE id = NEW.user_id;
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      sess.host_id,
      'participant_left',
      COALESCE(actor_name, 'Jemand') || ' hat deine Session verlassen',
      sess.title,
      jsonb_build_object('session_id', NEW.session_id)
    );
    RETURN NEW;
  END IF;

  -- Kicked by host: notify the participant
  IF OLD.status = 'joined' AND NEW.status = 'kicked' THEN
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      NEW.user_id,
      'participant_kicked',
      'Du wurdest aus einer Session entfernt',
      sess.title,
      jsonb_build_object('session_id', NEW.session_id)
    );
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS participant_status_change_notify ON session_participants;
CREATE TRIGGER participant_status_change_notify
  AFTER UPDATE ON session_participants
  FOR EACH ROW EXECUTE FUNCTION notify_on_participant_status_change();

-- ----------------------------------------------------------------
-- BEFORE DELETE on sessions: notify all current participants
-- (Cancel = session deleted by host. We can't fire AFTER DELETE for
--  participants because the cascade has already removed them.)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_on_session_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT
    sp.user_id,
    'session_cancelled',
    'Session wurde abgesagt',
    OLD.title,
    jsonb_build_object('session_id', OLD.id)
  FROM session_participants sp
  WHERE sp.session_id = OLD.id
    AND sp.status = 'joined'
    AND sp.user_id <> OLD.host_id;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS session_deleted_notify ON sessions;
CREATE TRIGGER session_deleted_notify
  BEFORE DELETE ON sessions
  FOR EACH ROW EXECUTE FUNCTION notify_on_session_deleted();

-- ----------------------------------------------------------------
-- RPC: bulk-create session_invite notifications. Called from the
-- inviteToSession server action so it can run as the table owner and
-- bypass the missing INSERT policy.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_session_invite(
  p_session_id UUID,
  p_friend_ids UUID[],
  p_sender_name TEXT,
  p_session_title TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  caller_id UUID := auth.uid();
BEGIN
  -- Only the host of the session may invite. This guards the RPC even
  -- though the server action already enforces it.
  IF NOT EXISTS (
    SELECT 1 FROM sessions WHERE id = p_session_id AND host_id = caller_id
  ) THEN
    RAISE EXCEPTION 'Only the session host can invite players';
  END IF;

  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT
    friend_id,
    'session_invite',
    COALESCE(p_sender_name, 'Jemand') || ' lädt dich ein',
    p_session_title,
    jsonb_build_object('session_id', p_session_id)
  FROM unnest(p_friend_ids) AS friend_id
  WHERE friend_id <> caller_id;
END;
$$;

-- Function-level grants — anon/authenticated may call the RPC.
GRANT EXECUTE ON FUNCTION notify_session_invite(UUID, UUID[], TEXT, TEXT) TO authenticated;
