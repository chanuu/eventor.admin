-- Subscription plans and feature entitlements
--
-- Two independent questions decide whether a studio member can do something:
--
--   has_permission()  — does this person's role allow it?
--   has_feature()     — has the studio's plan bought it?
--
-- Both must be true. Roles are configured per studio; features come with the
-- plan. This lets an "Album only" plan sell the digital album on its own,
-- without proofing, contracts or payments.

-- ── Feature catalogue ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS features (
  key         TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  description TEXT,
  sort_order  INT  NOT NULL DEFAULT 0
);

INSERT INTO features (key, label, description, sort_order) VALUES
  ('clients',    'Clients',          'Client records and contact details',                 10),
  ('jobs',       'Jobs & events',    'Create events, packages and add-ons',                20),
  ('album',      'Digital album',    'Build and publish flip-through albums',              30),
  ('gallery',    'Galleries',        'Upload and deliver photo galleries',                 40),
  ('proofing',   'Photo proofing',   'Clients choose their album photos',                  50),
  ('contracts',  'Agreements',       'Send and store signed agreements',                   60),
  ('payments',   'Payments',         'Deposits, balances and receipts',                    70),
  ('scheduling', 'Crew scheduling',  'Shoot calendar and crew assignment',                 80),
  ('staff',      'Staff & roles',    'Invite team members and configure roles',            90)
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label, description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

-- ── Plans ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plans (
  key         TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  price_lkr   INT  NOT NULL DEFAULT 0,
  description TEXT,
  sort_order  INT  NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO plans (key, name, price_lkr, description, sort_order) VALUES
  ('album',   'Album Only', 1900,  'Digital albums for your clients — nothing else to learn.', 10),
  ('solo',    'Solo',       2900,  'For a single photographer getting organised.',             20),
  ('studio',  'Studio',     6900,  'For studios with a crew and a full calendar.',             30),
  ('network', 'Network',    14900, 'For multi-branch studios and franchises.',                 40)
ON CONFLICT (key) DO UPDATE
  SET name = EXCLUDED.name, price_lkr = EXCLUDED.price_lkr,
      description = EXCLUDED.description, sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS plan_features (
  plan_key    TEXT NOT NULL REFERENCES plans(key)    ON DELETE CASCADE,
  feature_key TEXT NOT NULL REFERENCES features(key) ON DELETE CASCADE,
  PRIMARY KEY (plan_key, feature_key)
);

-- Album Only: clients and jobs exist purely so an album has somewhere to live.
INSERT INTO plan_features (plan_key, feature_key)
SELECT 'album', k FROM unnest(ARRAY['clients','jobs','album']) AS k
ON CONFLICT DO NOTHING;

INSERT INTO plan_features (plan_key, feature_key)
SELECT 'solo', k FROM unnest(ARRAY['clients','jobs','album','gallery','proofing','contracts','payments']) AS k
ON CONFLICT DO NOTHING;

INSERT INTO plan_features (plan_key, feature_key)
SELECT 'studio', k FROM unnest(ARRAY['clients','jobs','album','gallery','proofing','contracts','payments','scheduling','staff']) AS k
ON CONFLICT DO NOTHING;

INSERT INTO plan_features (plan_key, feature_key)
SELECT 'network', k FROM unnest(ARRAY['clients','jobs','album','gallery','proofing','contracts','payments','scheduling','staff']) AS k
ON CONFLICT DO NOTHING;

-- ── Link subscriptions to a plan ──────────────────────────────
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_key TEXT REFERENCES plans(key);

-- Existing studios keep everything they already use.
UPDATE subscriptions SET plan_key = 'studio' WHERE plan_key IS NULL;

-- Any studio without a subscription row gets one, so entitlement checks never
-- silently return nothing.
INSERT INTO subscriptions (studio_id, plan, status, plan_key)
SELECT s.id, 'basic', 'active', 'studio'
  FROM studios s
 WHERE NOT EXISTS (SELECT 1 FROM subscriptions x WHERE x.studio_id = s.id);

CREATE INDEX IF NOT EXISTS subscriptions_studio_idx ON subscriptions (studio_id);

-- ── Entitlement lookup ────────────────────────────────────────
CREATE OR REPLACE FUNCTION has_feature(p_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM staff st
      JOIN subscriptions sub ON sub.studio_id = st.studio_id
      JOIN plan_features pf  ON pf.plan_key = sub.plan_key
     WHERE st.user_id = auth.uid()
       AND st.is_active = TRUE
       AND sub.status = 'active'
       AND pf.feature_key = p_key
  );
$$;

/** Every feature the caller's studio has, for the app to read in one call. */
CREATE OR REPLACE FUNCTION my_features()
RETURNS TABLE (feature_key TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pf.feature_key
    FROM staff st
    JOIN subscriptions sub ON sub.studio_id = st.studio_id
    JOIN plan_features pf  ON pf.plan_key = sub.plan_key
   WHERE st.user_id = auth.uid()
     AND st.is_active = TRUE
     AND sub.status = 'active';
$$;

GRANT EXECUTE ON FUNCTION has_feature(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION my_features()     TO authenticated;

-- ── Read access ───────────────────────────────────────────────
ALTER TABLE features      ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans         ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

-- The catalogue is public marketing information, not studio data.
CREATE POLICY "read_features"      ON features      FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "read_plans"         ON plans         FOR SELECT TO anon, authenticated USING (TRUE);
CREATE POLICY "read_plan_features" ON plan_features FOR SELECT TO anon, authenticated USING (TRUE);

-- ── Enforce entitlements where the work happens ───────────────
-- Writes now require the plan as well as the role. Reads are left alone so a
-- studio that downgrades can still see its existing data.

DROP POLICY IF EXISTS "album_manage_albums" ON albums;
CREATE POLICY "album_manage_albums" ON albums
  FOR ALL USING (
    studio_id = get_my_studio_id() AND has_permission('album.manage') AND has_feature('album')
  );

DROP POLICY IF EXISTS "album_manage_album_pages" ON album_pages;
CREATE POLICY "album_manage_album_pages" ON album_pages
  FOR ALL USING (
    studio_id = get_my_studio_id() AND has_permission('album.manage') AND has_feature('album')
  );

DROP POLICY IF EXISTS "gallery_manage_galleries" ON galleries;
CREATE POLICY "gallery_manage_galleries" ON galleries
  FOR ALL USING (
    has_permission('gallery.manage') AND has_feature('gallery')
    AND job_id IN (SELECT id FROM jobs WHERE studio_id = get_my_studio_id())
  );

DROP POLICY IF EXISTS "gallery_manage_gallery_photos" ON gallery_photos;
CREATE POLICY "gallery_manage_gallery_photos" ON gallery_photos
  FOR ALL USING (
    studio_id = get_my_studio_id() AND has_permission('gallery.manage') AND has_feature('gallery')
  );

DROP POLICY IF EXISTS "contracts_write_contracts" ON contracts;
CREATE POLICY "contracts_write_contracts" ON contracts
  FOR ALL USING (
    studio_id = get_my_studio_id() AND has_permission('jobs.contracts') AND has_feature('contracts')
  );

DROP POLICY IF EXISTS "payments_write_payments" ON payments;
CREATE POLICY "payments_write_payments" ON payments
  FOR ALL USING (
    studio_id = get_my_studio_id() AND has_permission('jobs.payments') AND has_feature('payments')
  );
