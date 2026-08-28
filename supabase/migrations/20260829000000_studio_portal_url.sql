-- Portal address per studio
--
-- Album share links were built from NEXT_PUBLIC_PORTAL_URL, which Next inlines
-- at build time — so a deploy that lacked it produced links pointing at
-- localhost, and fixing it meant rebuilding. Storing it against the studio makes
-- it editable in Settings and correct immediately.

ALTER TABLE studios
  ADD COLUMN IF NOT EXISTS portal_url TEXT;

COMMENT ON COLUMN studios.portal_url IS
  'Public origin of the client portal, e.g. https://portal.eventor.lk. Used to build album share links.';
