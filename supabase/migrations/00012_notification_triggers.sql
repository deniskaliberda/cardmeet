-- Trigger: notify session participants on new chat message
CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS TRIGGER AS $$
DECLARE
  sess_title TEXT;
  sender_name TEXT;
  participant RECORD;
BEGIN
  SELECT title INTO sess_title FROM sessions WHERE id = NEW.session_id;
  SELECT username INTO sender_name FROM profiles WHERE id = NEW.user_id;

  -- Notify host (if not sender)
  INSERT INTO notifications (user_id, type, title, body)
  SELECT host_id, 'chat_message',
    sender_name || ' schreibt in deiner Session',
    LEFT(NEW.content, 80)
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
    INSERT INTO notifications (user_id, type, title, body)
    VALUES (
      participant.user_id,
      'chat_message',
      sender_name || ' hat eine Nachricht gesendet',
      LEFT(NEW.content, 80)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_insert ON messages;
CREATE TRIGGER on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_message();
