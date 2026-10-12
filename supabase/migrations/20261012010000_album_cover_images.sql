-- Uploaded front and back covers for the digital album.
--
-- The cover and closing pages were generated from text — a kicker, a title and
-- a paragraph on a cream page. Photographers design a real cover and a real
-- back cover as artwork, and had nowhere to put them: uploading them as
-- ordinary pages placed them after the cover rather than as it.
--
-- Both are optional and independent. An album with neither keeps the generated
-- text pages exactly as before; an album with only a front cover keeps the
-- generated closing page, and vice versa.

ALTER TABLE albums
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS back_image_url  TEXT;

COMMENT ON COLUMN albums.cover_image_url IS
  'Front cover artwork. When set it replaces the generated text cover. Stored '
  'as an absolute URL like album pages, not a storage path.';

COMMENT ON COLUMN albums.back_image_url IS
  'Back cover artwork, shown as the last leaf. When set it replaces the '
  'generated closing page.';
