-- Pin search_path = public, pg_catalog on every SECURITY DEFINER function
-- in public.* plus the nearby_sessions RPC. Without this an attacker who
-- can create objects in a writable schema that sits in front of public on
-- the calling role's search_path could shadow tables/functions the
-- definer-running trigger calls. Best-practice hardening, no behavior
-- change.
--
-- Closes Supabase advisor lint 0011 (function_search_path_mutable) for:
--   notify_on_message
--   notify_on_direct_message
--   notify_on_friend_request
--   notify_on_friend_accepted
--   nearby_sessions

ALTER FUNCTION public.notify_on_message()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.notify_on_direct_message()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.notify_on_friend_request()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.notify_on_friend_accepted()
  SET search_path = public, pg_catalog;

ALTER FUNCTION public.nearby_sessions(double precision, double precision, double precision, text, text)
  SET search_path = public, pg_catalog;
