-- Tighten storage.objects policies on the avatars bucket.
--
-- Closes Supabase advisor lint 0025 (public_bucket_allows_listing).
--
-- Before:
--   "Public avatar read"          SELECT to {public}        where bucket_id = 'avatars'
--                                 → anyone (incl. anon) could enumerate every avatar path.
--   "Auth upload 1oj01fe_0..3"    INSERT/UPDATE/SELECT/DELETE to {authenticated}
--                                 with USING true / WITH CHECK true
--                                 → any signed-in user could touch any bucket. Left over
--                                 from the storage UI default and overlapping the
--                                 per-user "User avatar *" policies.
--
-- After:
--   - Per-user INSERT/UPDATE/DELETE policies remain (path-scoped to
--     (storage.foldername(name))[1] = auth.uid()::text).
--   - No SELECT policy. Public read of an avatar still works via the public CDN URL
--     — storage.objects RLS is not consulted on public-bucket object GETs. SDK
--     listing is now blocked, which is what we want.

DROP POLICY IF EXISTS "Public avatar read" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload 1oj01fe_1" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload 1oj01fe_2" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload 1oj01fe_3" ON storage.objects;
