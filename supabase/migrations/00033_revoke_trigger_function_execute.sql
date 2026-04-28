-- Revoke EXECUTE on SECURITY DEFINER notification trigger functions from
-- the public REST roles.
--
-- Closes Supabase advisor lints 0028
-- (anon_security_definer_function_executable) and 0029
-- (authenticated_security_definer_function_executable).
--
-- These functions are called only by triggers — letting anon /
-- authenticated reach them at /rest/v1/rpc/<name> would let any caller
-- forge notifications by passing a fake NEW row. They are SECURITY
-- DEFINER specifically because they need to bypass the missing INSERT
-- policy on notifications; the trigger context is the only place that
-- should be able to fire them.
--
-- notify_session_invite is the only RPC that is genuinely meant to be
-- callable by signed-in users (host-only invite fan-out). Its grant
-- from migration 00031 is kept.

REVOKE EXECUTE ON FUNCTION public.notify_on_message()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_direct_message()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_friend_request()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_friend_accepted()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_participant_joined()        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_participant_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_session_deleted()           FROM PUBLIC, anon, authenticated;
