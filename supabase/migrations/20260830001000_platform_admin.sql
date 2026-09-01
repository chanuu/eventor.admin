-- Platform administration
--
-- Everything so far is scoped to one studio: RLS answers "which studio is this
-- person staff of". Running the platform itself needs the opposite — plan
-- configuration and figures across every tenant.
--
-- That access is deliberately narrow: an explicit allow-list of user ids, and
-- cross-tenant data only through SECURITY DEFINER functions that check it.

CREATE TABLE IF NOT EXISTS platform_admins (
  user_id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION is_platform_admin() TO authenticated;

-- Platform admins can see and manage the allow-list; nobody else can read it.
CREATE POLICY "platform_admin_manage_admins" ON platform_admins
  FOR ALL USING (is_platform_admin());

-- ── Plan configuration ────────────────────────────────────────
-- Everyone may read the catalogue (the landing page prices come from it);
-- only the platform may change it.
CREATE POLICY "platform_admin_write_plans" ON plans
  FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE POLICY "platform_admin_write_features" ON features
  FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

CREATE POLICY "platform_admin_write_plan_features" ON plan_features
  FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- ── Cross-tenant figures ──────────────────────────────────────
-- SECURITY DEFINER bypasses RLS, so each function refuses outright unless the
-- caller is on the allow-list.

CREATE OR REPLACE FUNCTION platform_overview()
RETURNS TABLE (
  studios BIGINT, active_subscriptions BIGINT, staff BIGINT, clients BIGINT,
  jobs BIGINT, shoots BIGINT, galleries BIGINT, photos BIGINT,
  albums BIGINT, published_albums BIGINT, shared_albums BIGINT,
  contracts_signed BIGINT, mrr_lkr BIGINT
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM studios),
    (SELECT count(*) FROM subscriptions WHERE status = 'active'),
    (SELECT count(*) FROM staff WHERE is_active),
    (SELECT count(*) FROM clients),
    (SELECT count(*) FROM jobs),
    (SELECT count(*) FROM shoots),
    (SELECT count(*) FROM galleries),
    (SELECT count(*) FROM gallery_photos WHERE is_active),
    (SELECT count(*) FROM albums),
    (SELECT count(*) FROM albums WHERE status = 'published'),
    (SELECT count(*) FROM albums WHERE is_public),
    (SELECT count(*) FROM contracts WHERE status = 'signed'),
    (SELECT COALESCE(sum(p.price_lkr), 0)::BIGINT
       FROM subscriptions s JOIN plans p ON p.key = s.plan_key
      WHERE s.status = 'active');
END;
$$;

CREATE OR REPLACE FUNCTION platform_tenants()
RETURNS TABLE (
  studio_id UUID, name TEXT, created_at TIMESTAMPTZ,
  plan_key TEXT, plan_name TEXT, price_lkr INT, sub_status TEXT,
  staff_count BIGINT, client_count BIGINT, job_count BIGINT,
  album_count BIGINT, published_album_count BIGINT, photo_count BIGINT,
  last_job_at TIMESTAMPTZ
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN QUERY
  SELECT
    st.id, st.name, st.created_at,
    sub.plan_key, p.name, p.price_lkr, sub.status::TEXT,
    (SELECT count(*) FROM staff x WHERE x.studio_id = st.id AND x.is_active),
    (SELECT count(*) FROM clients c WHERE c.studio_id = st.id),
    (SELECT count(*) FROM jobs j WHERE j.studio_id = st.id),
    (SELECT count(*) FROM albums a WHERE a.studio_id = st.id),
    (SELECT count(*) FROM albums a WHERE a.studio_id = st.id AND a.status = 'published'),
    (SELECT count(*) FROM gallery_photos g WHERE g.studio_id = st.id AND g.is_active),
    (SELECT max(j.created_at) FROM jobs j WHERE j.studio_id = st.id)
  FROM studios st
  LEFT JOIN subscriptions sub ON sub.studio_id = st.id AND sub.status = 'active'
  LEFT JOIN plans p ON p.key = sub.plan_key
  ORDER BY st.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION platform_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION platform_tenants()  TO authenticated;

-- ── Bootstrap ─────────────────────────────────────────────────
-- Seed the founding account so there is a way in; further admins are added from
-- the platform screen.
INSERT INTO platform_admins (user_id, note)
SELECT id, 'Bootstrapped with the platform admin migration'
  FROM auth.users
 WHERE email = 'athapaththuu@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
