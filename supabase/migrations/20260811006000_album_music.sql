-- Custom album soundtrack
--
-- Studios can upload their own track. When music_url is NULL the album falls
-- back to the built-in generated ambient loop, so music_enabled keeps working
-- with no upload.

ALTER TABLE albums
  ADD COLUMN IF NOT EXISTS music_url  TEXT,
  ADD COLUMN IF NOT EXISTS music_name TEXT;

COMMENT ON COLUMN albums.music_url IS
  'Uploaded soundtrack (S3 URL). NULL = use the built-in generated ambient loop.';
