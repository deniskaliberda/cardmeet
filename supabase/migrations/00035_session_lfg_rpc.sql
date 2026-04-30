-- ============================================================
-- Session join + LFG finalization RPCs
--
-- Fixes two production-flow problems:
-- 1. Joining a session inserted/upserted session_participants directly.
--    The participant-count trigger then tried to UPDATE sessions as the
--    joining user, which can be blocked by host-only RLS.
-- 2. LFG matching found candidates in the server action, then tried to
--    insert participants, update other users' lfg_posts, and insert
--    notifications as the current user. RLS correctly blocks that.
-- ============================================================

CREATE OR REPLACE FUNCTION update_session_player_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  target_session_id UUID;
  joined_non_host_count INTEGER;
  session_host_id UUID;
  session_max_players INTEGER;
  previous_status TEXT;
  next_status TEXT;
BEGIN
  target_session_id := CASE
    WHEN TG_OP = 'DELETE' THEN OLD.session_id
    ELSE NEW.session_id
  END;

  SELECT host_id, max_players, status
  INTO session_host_id, session_max_players, previous_status
  FROM sessions
  WHERE id = target_session_id
  FOR UPDATE;

  IF session_host_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO joined_non_host_count
  FROM session_participants
  WHERE session_id = target_session_id
    AND status = 'joined'
    AND user_id <> session_host_id;

  IF previous_status IN ('cancelled', 'completed', 'in_progress', 'paused') THEN
    next_status := previous_status;
  ELSIF joined_non_host_count + 1 >= session_max_players THEN
    next_status := 'full';
  ELSE
    next_status := 'open';
  END IF;

  UPDATE sessions
  SET current_players = joined_non_host_count + 1,
      status = next_status
  WHERE id = target_session_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION update_session_player_count() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION join_session(p_session_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  result_status TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  caller_id UUID := auth.uid();
  sess RECORD;
  existing_status TEXT;
  joined_non_host_count INTEGER;
BEGIN
  IF caller_id IS NULL THEN
    RETURN QUERY SELECT false, 'unauthenticated', 'Nicht angemeldet';
    RETURN;
  END IF;

  SELECT id, host_id, max_players, status
  INTO sess
  FROM sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF sess.id IS NULL THEN
    RETURN QUERY SELECT false, 'not_found', 'Session nicht gefunden';
    RETURN;
  END IF;

  IF caller_id = sess.host_id THEN
    RETURN QUERY SELECT true, 'joined', 'Du bist Host dieser Session';
    RETURN;
  END IF;

  IF sess.status IN ('cancelled', 'completed', 'in_progress', 'paused') THEN
    RETURN QUERY SELECT false, sess.status, 'Diese Session ist nicht offen';
    RETURN;
  END IF;

  SELECT sp.status
  INTO existing_status
  FROM session_participants sp
  WHERE sp.session_id = p_session_id
    AND sp.user_id = caller_id
  FOR UPDATE;

  IF existing_status = 'joined' THEN
    RETURN QUERY SELECT true, 'joined', 'Du bist bereits dabei';
    RETURN;
  END IF;

  IF existing_status = 'kicked' THEN
    RETURN QUERY SELECT false, 'kicked', 'Du wurdest aus dieser Session entfernt';
    RETURN;
  END IF;

  SELECT COUNT(*)
  INTO joined_non_host_count
  FROM session_participants sp
  WHERE sp.session_id = p_session_id
    AND sp.status = 'joined'
    AND sp.user_id <> sess.host_id;

  IF joined_non_host_count + 1 >= sess.max_players THEN
    UPDATE sessions
    SET current_players = joined_non_host_count + 1,
        status = 'full'
    WHERE id = p_session_id;

    RETURN QUERY SELECT false, 'full', 'Diese Session ist voll';
    RETURN;
  END IF;

  IF existing_status IS NULL THEN
    INSERT INTO session_participants (session_id, user_id, status)
    VALUES (p_session_id, caller_id, 'joined');
  ELSE
    UPDATE session_participants
    SET status = 'joined',
        joined_at = now()
    WHERE session_id = p_session_id
      AND user_id = caller_id;
  END IF;

  RETURN QUERY SELECT true, 'joined', 'Du bist der Session beigetreten';
END;
$$;

REVOKE EXECUTE ON FUNCTION join_session(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION join_session(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION leave_session(p_session_id UUID)
RETURNS TABLE (
  success BOOLEAN,
  result_status TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  caller_id UUID := auth.uid();
  session_host_id UUID;
  updated_count INTEGER;
BEGIN
  IF caller_id IS NULL THEN
    RETURN QUERY SELECT false, 'unauthenticated', 'Nicht angemeldet';
    RETURN;
  END IF;

  SELECT host_id
  INTO session_host_id
  FROM sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF session_host_id IS NULL THEN
    RETURN QUERY SELECT false, 'not_found', 'Session nicht gefunden';
    RETURN;
  END IF;

  IF session_host_id = caller_id THEN
    RETURN QUERY SELECT false, 'host', 'Hosts können ihre eigene Session nicht verlassen';
    RETURN;
  END IF;

  UPDATE session_participants
  SET status = 'left'
  WHERE session_id = p_session_id
    AND user_id = caller_id
    AND status = 'joined';

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count = 0 THEN
    RETURN QUERY SELECT false, 'not_joined', 'Du bist nicht in dieser Session angemeldet';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'left', 'Du hast die Session verlassen';
END;
$$;

REVOKE EXECUTE ON FUNCTION leave_session(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION leave_session(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION kick_session_participant(
  p_session_id UUID,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  result_status TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  caller_id UUID := auth.uid();
  session_host_id UUID;
  updated_count INTEGER;
BEGIN
  IF caller_id IS NULL THEN
    RETURN QUERY SELECT false, 'unauthenticated', 'Nicht angemeldet';
    RETURN;
  END IF;

  SELECT host_id
  INTO session_host_id
  FROM sessions
  WHERE id = p_session_id
  FOR UPDATE;

  IF session_host_id IS NULL THEN
    RETURN QUERY SELECT false, 'not_found', 'Session nicht gefunden';
    RETURN;
  END IF;

  IF session_host_id <> caller_id THEN
    RETURN QUERY SELECT false, 'forbidden', 'Nur der Host kann Teilnehmer entfernen';
    RETURN;
  END IF;

  IF p_user_id = session_host_id THEN
    RETURN QUERY SELECT false, 'host', 'Der Host kann nicht entfernt werden';
    RETURN;
  END IF;

  UPDATE session_participants
  SET status = 'kicked'
  WHERE session_id = p_session_id
    AND user_id = p_user_id
    AND status = 'joined';

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count = 0 THEN
    RETURN QUERY SELECT false, 'not_joined', 'Teilnehmer nicht gefunden';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'kicked', 'Teilnehmer wurde entfernt';
END;
$$;

REVOKE EXECUTE ON FUNCTION kick_session_participant(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION kick_session_participant(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION complete_lfg_match(
  p_post_id UUID,
  p_session_title TEXT,
  p_session_format TEXT,
  p_max_players INTEGER
)
RETURNS TABLE (
  success BOOLEAN,
  result_status TEXT,
  lfg_post_id UUID,
  session_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  caller_id UUID := auth.uid();
  new_post lfg_posts%ROWTYPE;
  matched_post lfg_posts%ROWTYPE;
  chosen_day INTEGER;
  overlap_from INTEGER;
  overlap_to INTEGER;
  midpoint_hour INTEGER;
  current_our_day INTEGER;
  day_offset INTEGER;
  scheduled_at_value TIMESTAMPTZ;
  centroid_lat DOUBLE PRECISION;
  centroid_lng DOUBLE PRECISION;
  chosen_shop_id UUID;
  chosen_shop_name TEXT;
  chosen_shop_city TEXT;
  chosen_shop_lat DOUBLE PRECISION;
  chosen_shop_lng DOUBLE PRECISION;
  session_location_lat DOUBLE PRECISION;
  session_location_lng DOUBLE PRECISION;
  created_session_id UUID;
  safe_max_players INTEGER := GREATEST(COALESCE(p_max_players, 2), 2);
  safe_session_format TEXT;
BEGIN
  IF caller_id IS NULL THEN
    RETURN QUERY SELECT false, 'unauthenticated', p_post_id, NULL::UUID, 'Nicht angemeldet';
    RETURN;
  END IF;

  SELECT *
  INTO new_post
  FROM lfg_posts
  WHERE id = p_post_id
  FOR UPDATE;

  IF new_post.id IS NULL THEN
    RETURN QUERY SELECT false, 'not_found', p_post_id, NULL::UUID, 'LFG-Post nicht gefunden';
    RETURN;
  END IF;

  IF new_post.user_id <> caller_id THEN
    RETURN QUERY SELECT false, 'forbidden', p_post_id, NULL::UUID, 'Du kannst nur eigene LFG-Posts matchen';
    RETURN;
  END IF;

  IF new_post.status <> 'active' THEN
    RETURN QUERY SELECT true, new_post.status, p_post_id, new_post.matched_session_id, 'LFG-Post ist nicht aktiv';
    RETURN;
  END IF;

  SELECT lp.*
  INTO matched_post
  FROM lfg_posts lp
  WHERE lp.status = 'active'
    AND lp.id <> new_post.id
    AND lp.user_id <> new_post.user_id
    AND lp.tcg = new_post.tcg
    AND lp.format IS NOT DISTINCT FROM new_post.format
    AND lp.time_from < new_post.time_to
    AND lp.time_to > new_post.time_from
    AND EXISTS (
      SELECT 1
      FROM unnest(new_post.days_of_week) AS wanted_days(day_value)
      WHERE day_value = ANY(lp.days_of_week)
    )
    AND ST_DWithin(
      lp.location,
      new_post.location,
      LEAST(lp.max_radius_km, new_post.max_radius_km) * 1000
    )
  ORDER BY lp.created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF matched_post.id IS NULL THEN
    RETURN QUERY SELECT true, 'waiting', new_post.id, NULL::UUID, 'Noch kein Match gefunden';
    RETURN;
  END IF;

  current_our_day := CASE
    WHEN EXTRACT(DOW FROM now())::INTEGER = 0 THEN 6
    ELSE EXTRACT(DOW FROM now())::INTEGER - 1
  END;

  SELECT day_value
  INTO chosen_day
  FROM unnest(new_post.days_of_week) AS wanted_days(day_value)
  WHERE day_value = ANY(matched_post.days_of_week)
  ORDER BY ((day_value - current_our_day + 7) % 7) ASC
  LIMIT 1;

  overlap_from := GREATEST(new_post.time_from, matched_post.time_from);
  overlap_to := LEAST(new_post.time_to, matched_post.time_to);

  IF chosen_day IS NULL OR overlap_to - overlap_from < 1 THEN
    RETURN QUERY SELECT true, 'waiting', new_post.id, NULL::UUID, 'Noch kein gemeinsames Zeitfenster gefunden';
    RETURN;
  END IF;

  midpoint_hour := FLOOR((overlap_from + overlap_to) / 2.0)::INTEGER;
  day_offset := (chosen_day - current_our_day + 7) % 7;

  IF day_offset = 0 AND midpoint_hour <= EXTRACT(HOUR FROM now())::INTEGER THEN
    day_offset := 7;
  END IF;

  scheduled_at_value := date_trunc('day', now())
    + make_interval(days => day_offset, hours => midpoint_hour);

  centroid_lat := (new_post.lat + matched_post.lat) / 2.0;
  centroid_lng := (new_post.lng + matched_post.lng) / 2.0;

  SELECT
    s.id AS shop_id,
    s.name AS shop_name,
    s.city AS shop_city,
    ST_Y(s.location::geometry) AS shop_lat,
    ST_X(s.location::geometry) AS shop_lng
  INTO chosen_shop_id,
       chosen_shop_name,
       chosen_shop_city,
       chosen_shop_lat,
       chosen_shop_lng
  FROM shops s
  WHERE s.has_play_space = true
    AND new_post.tcg = ANY(s.tcgs)
    AND ST_DWithin(
      s.location,
      ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326)::geography,
      15000
    )
  ORDER BY ST_Distance(
    s.location,
    ST_SetSRID(ST_MakePoint(centroid_lng, centroid_lat), 4326)::geography
  )
  LIMIT 1;

  session_location_lat := COALESCE(chosen_shop_lat, centroid_lat);
  session_location_lng := COALESCE(chosen_shop_lng, centroid_lng);
  safe_session_format := COALESCE(NULLIF(p_session_format, ''), new_post.format, 'casual');

  INSERT INTO sessions (
    host_id,
    title,
    tcg,
    format,
    power_level,
    max_players,
    city,
    location_name,
    location,
    scheduled_at,
    shop_id
  )
  VALUES (
    new_post.user_id,
    COALESCE(NULLIF(p_session_title, ''), 'LFG Match'),
    new_post.tcg,
    safe_session_format,
    new_post.power_level,
    safe_max_players,
    COALESCE(chosen_shop_city, new_post.location_label, 'Berlin'),
    chosen_shop_name,
    ST_SetSRID(ST_MakePoint(session_location_lng, session_location_lat), 4326)::geography,
    scheduled_at_value,
    chosen_shop_id
  )
  RETURNING id INTO created_session_id;

  INSERT INTO session_participants (session_id, user_id, status)
  VALUES (created_session_id, matched_post.user_id, 'joined');

  UPDATE lfg_posts
  SET status = 'matched',
      matched_session_id = created_session_id
  WHERE id IN (new_post.id, matched_post.id);

  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES
    (
      new_post.user_id,
      'lfg_match',
      'Match gefunden!',
      COALESCE(chosen_shop_name, 'Wir haben einen passenden Spieler gefunden.'),
      jsonb_build_object('session_id', created_session_id)
    ),
    (
      matched_post.user_id,
      'lfg_match',
      'Match gefunden!',
      COALESCE(chosen_shop_name, 'Wir haben einen passenden Spieler gefunden.'),
      jsonb_build_object('session_id', created_session_id)
    );

  RETURN QUERY SELECT true, 'matched', new_post.id, created_session_id, 'Match gefunden';
END;
$$;

REVOKE EXECUTE ON FUNCTION complete_lfg_match(UUID, TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION complete_lfg_match(UUID, TEXT, TEXT, INTEGER) TO authenticated;
