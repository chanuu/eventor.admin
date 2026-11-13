-- Client comments on a digital album, and albums published from the design tool.
--
-- A client reviewing their album had nowhere to say "please change this page"
-- except WhatsApp, where it is lost by the next wedding. A comment here sits on
-- the page it is about, and the studio resolves it from the album design tool.
--
-- The public share link must never show these: what a couple says to their
-- studio about a draft is not for the family they sent the link to. So anon has
-- no privileges on the table at all, rather than a policy that happens to match
-- nothing, and PublicAlbum does not read it.

-- ─── Pages published from the design tool ───────────────────────────────────
-- The tool's own id for the spread this page shows. Publishing again updates the
-- same row instead of replacing it, which is what keeps comments on their page.
-- NULL for a page uploaded by hand in admin.

ALTER TABLE album_pages
  ADD COLUMN IF NOT EXISTS source_spread_id TEXT;

COMMENT ON COLUMN album_pages.source_spread_id IS
  'The album design tool''s id for this spread, so that publishing again updates '
  'this row and its comments stay attached. NULL when uploaded by hand.';

CREATE UNIQUE INDEX IF NOT EXISTS album_pages_source_spread_idx
  ON album_pages (album_id, source_spread_id)
  WHERE source_spread_id IS NOT NULL;

-- ─── Comments ───────────────────────────────────────────────────────────────

CREATE TABLE album_comments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id     UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  album_id      UUID NOT NULL REFERENCES albums(id)  ON DELETE CASCADE,
  -- Survives the page being removed, because the request may still matter.
  album_page_id UUID          REFERENCES album_pages(id) ON DELETE SET NULL,
  client_id     UUID NOT NULL DEFAULT get_my_client_id() REFERENCES clients(id) ON DELETE CASCADE,
  body          TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ,
  resolved_by   UUID REFERENCES staff(id) ON DELETE SET NULL
);

CREATE INDEX album_comments_album_idx  ON album_comments (album_id, created_at);
CREATE INDEX album_comments_studio_idx ON album_comments (studio_id);
CREATE INDEX album_comments_page_idx   ON album_comments (album_page_id);

COMMENT ON TABLE album_comments IS
  'Clients'' comments on their album. Never visible through the public share link.';

-- The album and studio come from the page, so a client cannot misfile a comment.
CREATE OR REPLACE FUNCTION album_comments_from_page()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  page RECORD;
BEGIN
  SELECT album_id, studio_id INTO page FROM album_pages WHERE id = NEW.album_page_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That page of the album could not be found.';
  END IF;
  NEW.album_id  := page.album_id;
  NEW.studio_id := page.studio_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER album_comments_fill_from_page
  BEFORE INSERT ON album_comments
  FOR EACH ROW EXECUTE FUNCTION album_comments_from_page();

ALTER TABLE album_comments ENABLE ROW LEVEL SECURITY;

-- Supabase grants every new table to anon and authenticated by default. Comments
-- are for signed-in people only, and nobody may rewrite what a client said.
REVOKE ALL ON album_comments FROM anon;
REVOKE UPDATE, DELETE, TRUNCATE ON album_comments FROM authenticated;
GRANT UPDATE (resolved_at, resolved_by) ON album_comments TO authenticated;

CREATE POLICY album_comments_staff_select ON album_comments
  FOR SELECT TO authenticated
  USING (studio_id = get_my_studio_id());

-- Matches who may publish the album in the first place.
CREATE POLICY album_comments_staff_resolve ON album_comments
  FOR UPDATE TO authenticated
  USING (
    studio_id = get_my_studio_id() AND has_permission('album.manage') AND has_feature('album')
  )
  WITH CHECK (
    studio_id = get_my_studio_id() AND has_permission('album.manage') AND has_feature('album')
  );

CREATE POLICY album_comments_client_select ON album_comments
  FOR SELECT TO authenticated
  USING (
    album_id IN (
      SELECT a.id FROM albums a
      JOIN jobs j ON j.id = a.job_id
      WHERE a.status = 'published' AND j.client_id = get_my_client_id()
    )
  );

-- Only on their own published album, only as themselves, and never already resolved.
CREATE POLICY album_comments_client_insert ON album_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = get_my_client_id()
    AND resolved_at IS NULL
    AND resolved_by IS NULL
    AND album_id IN (
      SELECT a.id FROM albums a
      JOIN jobs j ON j.id = a.job_id
      WHERE a.status = 'published' AND j.client_id = get_my_client_id()
    )
  );
