-- Final round of REST surface tightening, completes 00033.
--
-- 1. notify_session_invite needs to be callable by signed-in hosts only —
--    no anon role. The function already checks auth.uid() so an anon call
--    would just hit "Only the session host can invite players", but
--    revoking EXECUTE keeps it off the advisor lint list and removes a
--    recon surface.
--
-- 2. PostGIS st_estimatedextent is a library-internal estimator. Nothing
--    in our app calls it via REST; revoke from both anon and authenticated
--    roles so /rest/v1/rpc/st_estimatedextent disappears.

-- PUBLIC has the default post-CREATE-FUNCTION grant, which means anon
-- inherits EXECUTE through PUBLIC even after REVOKE FROM anon. Revoke
-- from PUBLIC; the explicit GRANT TO authenticated from migration
-- 00031 still keeps the RPC callable for signed-in hosts.
REVOKE EXECUTE ON FUNCTION public.notify_session_invite(uuid, uuid[], text, text) FROM PUBLIC, anon;

-- PostGIS st_estimatedextent is owned by supabase_admin; a regular
-- postgres role can't revoke its grants. The advisor will keep
-- flagging these (acl `{=X/supabase_admin, anon=X/supabase_admin,
-- authenticated=X/supabase_admin, ...}`). Documented as accepted in
-- SECURITY.md — same category as spatial_ref_sys.
