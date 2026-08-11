-- Digital albums
--
-- Studios build the flip-through album in admin: cover/closing text, music
-- setting, and an ordered list of pages. Clients see it in the portal once
-- published.
--
-- Pages either reference an existing gallery photo or carry their own uploaded
-- image URL, so a studio can use proofing selections or upload album spreads
-- exported from their design tool.

CREATE TYPE album_status AS ENUM ('draft', 'published');

CREATE TABLE IF NOT EXISTS albums (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id          UUID UNIQUE NOT NULL REFERENCES jobs(id)    ON DELETE CASCADE,
  studio_id       UUID NOT NULL        REFERENCES studios(id) ON DELETE CASCADE,
  title           TEXT,
  cover_kicker    TEXT,
  cover_title     TEXT,
  cover_body      TEXT,
  closing_kicker  TEXT NOT NULL DEFAULT 'Thank you',
  closing_title   TEXT,
  closing_body    TEXT,
  music_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  status          album_status NOT NULL DEFAULT 'draft',
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS album_pages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id         UUID NOT NULL REFERENCES albums(id)         ON DELETE CASCADE,
  studio_id        UUID NOT NULL REFERENCES studios(id)        ON DELETE CASCADE,
  gallery_photo_id UUID          REFERENCES gallery_photos(id) ON DELETE SET NULL,
  image_url        TEXT,
  caption          TEXT,
  sort_order       INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- A page must resolve to an image one way or the other.
  CONSTRAINT album_page_has_image CHECK (gallery_photo_id IS NOT NULL OR image_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS album_pages_album_order_idx ON album_pages (album_id, sort_order);

ALTER TABLE albums      ENABLE ROW LEVEL SECURITY;
ALTER TABLE album_pages ENABLE ROW LEVEL SECURITY;

-- ── albums ────────────────────────────────────────────────────
CREATE POLICY "staff_all_albums" ON albums
  FOR ALL USING (studio_id = get_my_studio_id());

-- Clients only ever see a published album.
CREATE POLICY "client_select_published_albums" ON albums
  FOR SELECT USING (
    status = 'published'
    AND job_id IN (SELECT id FROM jobs WHERE client_id = get_my_client_id())
  );

-- ── album_pages ───────────────────────────────────────────────
CREATE POLICY "staff_all_album_pages" ON album_pages
  FOR ALL USING (studio_id = get_my_studio_id());

CREATE POLICY "client_select_published_album_pages" ON album_pages
  FOR SELECT USING (
    album_id IN (
      SELECT a.id FROM albums a
      JOIN jobs j ON j.id = a.job_id
      WHERE a.status = 'published' AND j.client_id = get_my_client_id()
    )
  );
