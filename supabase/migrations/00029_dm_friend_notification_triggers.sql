-- ============================================================
-- TRIGGER-BASED NOTIFICATIONS (replaces failing server-action inserts)
--
-- Context: notifications table has RLS enabled but no INSERT policy,
-- so every `supabase.from("notifications").insert(...)` from a server
-- action with the anon key was silently dropped. Move creation into
-- SECURITY DEFINER triggers that run under the table owner and bypass
-- RLS, matching the pattern established in 00027_notification_chat_fix.
-- ============================================================

-- ----------------------------------------------------------------
-- Direct-message notifications
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_on_direct_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
BEGIN
  SELECT username INTO sender_name FROM profiles WHERE id = NEW.sender_id;

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    NEW.receiver_id,
    'chat_message',
    COALESCE(sender_name, 'Jemand'),
    LEFT(NEW.content, 100),
    jsonb_build_object('sender_id', NEW.sender_id)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS direct_message_notify ON direct_messages;
CREATE TRIGGER direct_message_notify
  AFTER INSERT ON direct_messages
  FOR EACH ROW EXECUTE FUNCTION notify_on_direct_message();

-- ----------------------------------------------------------------
-- Friend-request notifications (fires on INSERT of pending row)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_on_friend_request()
RETURNS TRIGGER AS $$
DECLARE
  requester_name TEXT;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT username INTO requester_name FROM profiles WHERE id = NEW.requester_id;

  INSERT INTO notifications (user_id, type, title, body)
  VALUES (
    NEW.addressee_id,
    'friend_request',
    COALESCE(requester_name, 'Jemand') || ' möchte dein Freund sein',
    NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS friendship_request_notify ON friendships;
CREATE TRIGGER friendship_request_notify
  AFTER INSERT ON friendships
  FOR EACH ROW EXECUTE FUNCTION notify_on_friend_request();

-- ----------------------------------------------------------------
-- Friend-accepted notifications (fires on status pending -> accepted)
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_on_friend_accepted()
RETURNS TRIGGER AS $$
DECLARE
  accepter_name TEXT;
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'accepted' THEN
    SELECT username INTO accepter_name FROM profiles WHERE id = NEW.addressee_id;

    INSERT INTO notifications (user_id, type, title, body)
    VALUES (
      NEW.requester_id,
      'friend_accepted',
      COALESCE(accepter_name, 'Jemand') || ' hat deine Freundschaftsanfrage angenommen',
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS friendship_accepted_notify ON friendships;
CREATE TRIGGER friendship_accepted_notify
  AFTER UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION notify_on_friend_accepted();
