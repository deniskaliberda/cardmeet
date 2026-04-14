-- Upsert chat notifications: update existing unread instead of spamming new ones
CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS TRIGGER AS $$
DECLARE
  sess_title TEXT;
  sender_name TEXT;
  participant RECORD;
  notif_data JSONB;
  recipient_id UUID;
BEGIN
  SELECT title INTO sess_title FROM sessions WHERE id = NEW.session_id;
  SELECT username INTO sender_name FROM profiles WHERE id = NEW.user_id;

  notif_data := jsonb_build_object('session_id', NEW.session_id);

  -- Helper: upsert for a single recipient
  -- If an unread chat_message notification for this session already exists → update it
  -- Otherwise → insert a new one

  -- Notify host (if not sender)
  SELECT host_id INTO recipient_id FROM sessions
  WHERE id = NEW.session_id AND host_id <> NEW.user_id;

  IF recipient_id IS NOT NULL THEN
    UPDATE notifications
    SET
      title  = sender_name || ' schreibt in ' || COALESCE(sess_title, 'deiner Session'),
      body   = LEFT(NEW.content, 80),
      data   = notif_data,
      read   = false,
      created_at = now()
    WHERE user_id = recipient_id
      AND type    = 'chat_message'
      AND read    = false
      AND data->>'session_id' = NEW.session_id::text;

    IF NOT FOUND THEN
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES (
        recipient_id,
        'chat_message',
        sender_name || ' schreibt in ' || COALESCE(sess_title, 'deiner Session'),
        LEFT(NEW.content, 80),
        notif_data
      );
    END IF;
  END IF;

  -- Notify other joined participants (if not sender)
  FOR participant IN
    SELECT user_id FROM session_participants
    WHERE session_id = NEW.session_id
      AND status    = 'joined'
      AND user_id  <> NEW.user_id
  LOOP
    UPDATE notifications
    SET
      title  = sender_name || ' schreibt in ' || COALESCE(sess_title, 'einer Session'),
      body   = LEFT(NEW.content, 80),
      data   = notif_data,
      read   = false,
      created_at = now()
    WHERE user_id = participant.user_id
      AND type    = 'chat_message'
      AND read    = false
      AND data->>'session_id' = NEW.session_id::text;

    IF NOT FOUND THEN
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES (
        participant.user_id,
        'chat_message',
        sender_name || ' schreibt in ' || COALESCE(sess_title, 'einer Session'),
        LEFT(NEW.content, 80),
        notif_data
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
