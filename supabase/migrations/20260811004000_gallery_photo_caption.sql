-- Digital album captions
--
-- The album viewer prints a caption under each page ("The first look"). Studios
-- set these per photo; when NULL the page renders without a caption bar.

ALTER TABLE gallery_photos
  ADD COLUMN IF NOT EXISTS caption TEXT;

COMMENT ON COLUMN gallery_photos.caption IS
  'Optional caption shown on the digital album page. NULL = no caption bar.';
