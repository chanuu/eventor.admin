-- Storage policies for the studio-assets bucket.
--
-- The Next app uploaded studio logos with the service role, because there was
-- no policy letting anyone else write. A browser-only client cannot do that —
-- the service role must never ship to a browser — so the rule moves into the
-- database, where it belongs anyway.
--
-- The path is `{studio_id}/logo.{ext}`, so the first path segment is the
-- ownership claim and is checked against the caller's own studio. Reads stay
-- open: the bucket is public, and the logo is printed on agreements clients
-- open from their portal.

DROP POLICY IF EXISTS "studio_assets_read" ON storage.objects;
CREATE POLICY "studio_assets_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'studio-assets');

DROP POLICY IF EXISTS "studio_assets_insert" ON storage.objects;
CREATE POLICY "studio_assets_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'studio-assets'
    AND (storage.foldername(name))[1] = get_my_studio_id()::text
    AND has_permission('settings.manage')
  );

-- Re-uploading a logo overwrites the same key, which is an update, not an insert.
DROP POLICY IF EXISTS "studio_assets_update" ON storage.objects;
CREATE POLICY "studio_assets_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'studio-assets'
    AND (storage.foldername(name))[1] = get_my_studio_id()::text
    AND has_permission('settings.manage')
  );

DROP POLICY IF EXISTS "studio_assets_delete" ON storage.objects;
CREATE POLICY "studio_assets_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'studio-assets'
    AND (storage.foldername(name))[1] = get_my_studio_id()::text
    AND has_permission('settings.manage')
  );
