-- Album spreads: a page that is designed across two facing pages.
--
-- Photographers lay out some pages singly and some as a spread — one design
-- running across the fold, meant to be seen at once. Until now every row in
-- album_pages was one page, so a spread could only be added by cutting it in
-- half outside the app and uploading two images that nothing kept together.
--
-- Both stay first-class: `is_spread` defaults to false, so every page that
-- exists today keeps rendering exactly as it does now, and a single-page
-- design remains the default for new uploads.

ALTER TABLE album_pages
  ADD COLUMN IF NOT EXISTS is_spread BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN album_pages.is_spread IS
  'True when this row holds one image designed across two facing pages. The '
  'renderer paints its left half on one page and its right half on the next; '
  'the image is never split in storage, so the halves cannot be separated by '
  'reordering and the original spread stays recoverable.';

-- ─── Page shape ─────────────────────────────────────────────────────────────
-- The flipbook hard-coded a portrait page of 520×640 (0.8125). A spread is
-- designed at exactly twice the page, so a square 12×12 album exports a 2:1
-- spread, which that portrait frame would crop. The shape therefore has to be
-- a property of the album.
--
-- NULL means "what the renderer has always used", so no existing album changes
-- appearance. Only albums a studio explicitly sets become square.

ALTER TABLE albums
  ADD COLUMN IF NOT EXISTS page_aspect NUMERIC(5,4);

COMMENT ON COLUMN albums.page_aspect IS
  'Width / height of a single page. NULL keeps the renderer default (0.8125, '
  'the original 520x640 portrait) so albums created before spreads are '
  'untouched. 1.0 is a square 12x12, whose spread is 2:1.';

-- Guards a typo rather than a design choice: anything outside this range is a
-- mistake, and a zero or negative value would divide by zero in the renderer.
ALTER TABLE albums
  DROP CONSTRAINT IF EXISTS albums_page_aspect_sane;
ALTER TABLE albums
  ADD CONSTRAINT albums_page_aspect_sane
  CHECK (page_aspect IS NULL OR (page_aspect > 0.3 AND page_aspect < 3.0));
