-- The album's real printed size, instead of a guessed page shape.
--
-- `page_aspect` asked studios to pick Square / Portrait / Landscape, which is
-- not how anyone describes an album: they order a 12x30 or an 8x24. The presets
-- were also simply wrong for real work — a studio printing 12x28 exports an
-- 8400x3600 spread, an aspect of 2.33, which none of the three presets matched,
-- so spreads were cropped top and bottom.
--
-- The dimensions are stored as given and `page_aspect` is derived from them, so
-- the renderer keeps reading one number and needs no knowledge of inches.

ALTER TABLE albums
  ADD COLUMN IF NOT EXISTS trim_width  NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS trim_height NUMERIC(6,2),
  -- Whether the width above describes the album open or a single leaf. A
  -- 12x30 is almost always the open book, but studios do quote both, and
  -- guessing wrong halves or doubles every page.
  ADD COLUMN IF NOT EXISTS trim_is_spread BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN albums.trim_width IS
  'Printed album width as the studio quotes it, e.g. 30 in a 12x30. Paired '
  'with trim_is_spread to say whether that is the open book or one page. '
  'page_aspect is derived from these; this column exists so the number can be '
  'shown back unchanged rather than reverse-engineered from a ratio.';

COMMENT ON COLUMN albums.trim_height IS
  'Printed album height, e.g. 12 in a 12x30.';

-- Guards a typo, not a design choice: a zero height would divide by zero when
-- deriving the aspect, and nobody prints a 200 inch album.
ALTER TABLE albums
  DROP CONSTRAINT IF EXISTS albums_trim_sane;
ALTER TABLE albums
  ADD CONSTRAINT albums_trim_sane CHECK (
    (trim_width IS NULL AND trim_height IS NULL)
    OR (trim_width > 0 AND trim_width < 200 AND trim_height > 0 AND trim_height < 200)
  );
