-- The desktop album designer becomes a feature that plans can include.
--
-- It joins the catalogue, so it appears as a tick box on every plan in the platform
-- admin, and access can be changed there without a release. It starts on every plan
-- because it launches free as a promotion: charging for it later only means unticking
-- the plans that should no longer include it.
--
-- A plan's other features still decide what the tool can do with Eventor: publishing
-- needs `album`, and creating a gallery needs `gallery`.

INSERT INTO features (key, label, description, sort_order)
VALUES (
  'album_designer',
  'Album designer tool',
  'The desktop app for designing albums and creating customer selection galleries',
  35
)
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

INSERT INTO plan_features (plan_key, feature_key)
SELECT key, 'album_designer' FROM plans
ON CONFLICT DO NOTHING;

-- ─── Finding a customer's selection on the studio's own disk ────────────────
-- A file name alone is not enough: two cameras can both produce IMG_0001.JPG, and the
-- wrong one would end up in the album. The tool records the original's fingerprint when
-- it uploads a gallery. NULL for photos uploaded through admin, which match by name.

ALTER TABLE gallery_photos
  ADD COLUMN IF NOT EXISTS source_hash TEXT;

COMMENT ON COLUMN gallery_photos.source_hash IS
  'BLAKE3 hash of the original file, set by the album design tool so it can find the '
  'same photo on the studio''s disk. NULL when uploaded through admin.';
