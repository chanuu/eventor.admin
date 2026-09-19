-- Thumbnails for proofing grids.
--
-- Photos were stored at a single size (up to 2 MB) and that same file was used
-- for the 140px grid tiles, so opening a 1000-photo gallery could pull ~2 GB.
-- The browser now produces a small derivative at upload time and stores it here;
-- grids read thumb_path and only the lightbox loads storage_path.
--
-- Nullable because every existing row predates it. Readers must fall back to
-- storage_path when it is null.
ALTER TABLE gallery_photos
  ADD COLUMN IF NOT EXISTS thumb_path text;

COMMENT ON COLUMN gallery_photos.thumb_path IS
  'Public URL of the ~400px derivative used in grids. Null for rows uploaded before thumbnails existed; fall back to storage_path.';

-- Paging a large gallery orders by sort_order within one gallery.
CREATE INDEX IF NOT EXISTS gallery_photos_gallery_sort_idx
  ON gallery_photos (gallery_id, sort_order);

-- album_pages.studio_id was the only hot filter column without an index.
CREATE INDEX IF NOT EXISTS album_pages_studio_id_idx
  ON album_pages (studio_id);
