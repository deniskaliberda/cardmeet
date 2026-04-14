-- Add chat_message to the allowed notification types
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
  'chat_message'
));

-- Update trigger to store session_id in the data field
CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS TRIGGER AS $$
DECLARE
  sess_title TEXT;
  sender_name TEXT;
  participant RECORD;
  notif_data JSONB;
BEGIN
  SELECT title INTO sess_title FROM sessions WHERE id = NEW.session_id;
  SELECT username INTO sender_name FROM profiles WHERE id = NEW.user_id;

  notif_data := jsonb_build_object('session_id', NEW.session_id);

  -- Notify host (if not sender)
  INSERT INTO notifications (user_id, type, title, body, data)
  SELECT host_id,
    'chat_message',
    sender_name || ' schreibt in ' || COALESCE(sess_title, 'deiner Session'),
    LEFT(NEW.content, 80),
    notif_data
  FROM sessions
  WHERE id = NEW.session_id
    AND host_id <> NEW.user_id;

  -- Notify other joined participants (if not sender)
  FOR participant IN
    SELECT user_id FROM session_participants
    WHERE session_id = NEW.session_id
      AND status = 'joined'
      AND user_id <> NEW.user_id
  LOOP
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (
      participant.user_id,
      'chat_message',
      sender_name || ' schreibt in ' || COALESCE(sess_title, 'einer Session'),
      LEFT(NEW.content, 80),
      notif_data
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
