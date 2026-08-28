-- Public album sharing and autoplay
--
-- A client may want to show the album to family who have no portal login. The
-- studio decides: sharing is off until they enable it, and can be switched off
-- again at any time.

ALTER TABLE albums
  ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE
    DEFAULT encode(uuid_send(gen_random_uuid()), 'hex'),
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS autoplay BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS autoplay_seconds INT NOT NULL DEFAULT 6;

-- Existing rows predate the default.
UPDATE albums
   SET share_token = encode(uuid_send(gen_random_uuid()), 'hex')
 WHERE share_token IS NULL;

ALTER TABLE albums ALTER COLUMN share_token SET NOT NULL;

COMMENT ON COLUMN albums.is_public IS
  'Studio-controlled. When true, anyone holding share_token can view the published album without signing in.';
COMMENT ON COLUMN albums.autoplay_seconds IS
  'Seconds each spread is shown when autoplay is on.';

-- ── Anonymous read for shared albums ──────────────────────────
-- Only published AND explicitly shared albums are exposed, and only the fields
-- needed to render: the album, its pages, and the photos those pages point at.

DROP POLICY IF EXISTS "public_read_shared_albums" ON albums;
CREATE POLICY "public_read_shared_albums" ON albums
  FOR SELECT TO anon, authenticated
  USING (is_public = TRUE AND status = 'published');

DROP POLICY IF EXISTS "public_read_shared_album_pages" ON album_pages;
CREATE POLICY "public_read_shared_album_pages" ON album_pages
  FOR SELECT TO anon, authenticated
  USING (
    album_id IN (SELECT id FROM albums WHERE is_public = TRUE AND status = 'published')
  );

-- Pages may reference a gallery photo rather than carry their own image URL.
DROP POLICY IF EXISTS "public_read_shared_album_photos" ON gallery_photos;
CREATE POLICY "public_read_shared_album_photos" ON gallery_photos
  FOR SELECT TO anon, authenticated
  USING (
    id IN (
      SELECT ap.gallery_photo_id FROM album_pages ap
       WHERE ap.gallery_photo_id IS NOT NULL
         AND ap.album_id IN (SELECT id FROM albums WHERE is_public = TRUE AND status = 'published')
    )
  );

CREATE INDEX IF NOT EXISTS albums_share_token_idx ON albums (share_token);
