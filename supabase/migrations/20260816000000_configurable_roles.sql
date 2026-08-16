-- Configurable, per-studio roles and permissions
--
-- Replaces the fixed staff_role enum checks in RLS with a permission lookup, so
-- each studio can define its own roles and choose exactly what each one may do.
--
--   permissions       catalogue of capability keys (global, seeded)
--   roles             per-studio roles; the four defaults are seeded per studio
--   role_permissions  which capabilities a role holds
--   staff.role_id     the role a staff member is assigned
--
-- staff.role (the old enum) is retained for backward compatibility but is no
-- longer consulted by any policy.

-- ── Catalogue ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS permissions (
  key        TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  category   TEXT NOT NULL,
  sort_order INT  NOT NULL DEFAULT 0
);

INSERT INTO permissions (key, label, category, sort_order) VALUES
  ('dashboard.view',  'View dashboard',            'General',  10),
  ('schedule.view',   'View schedule',             'General',  20),
  ('jobs.view',       'View jobs',                 'Jobs',     30),
  ('jobs.write',      'Create and edit jobs',      'Jobs',     40),
  ('jobs.shoots',     'Schedule and update shoots','Jobs',     50),
  ('jobs.payments',   'Record payments',           'Money',    60),
  ('jobs.contracts',  'Manage contracts',          'Money',    70),
  ('gallery.manage',  'Manage galleries & proofing','Delivery',80),
  ('album.manage',    'Build and publish albums',  'Delivery', 90),
  ('clients.manage',  'Manage clients',            'Studio',  100),
  ('packages.manage', 'Manage packages & add-ons', 'Studio',  110),
  ('staff.manage',    'Manage staff and roles',    'Studio',  120),
  ('settings.manage', 'Manage studio settings',    'Studio',  130)
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label, category = EXCLUDED.category, sort_order = EXCLUDED.sort_order;

-- ── Roles ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id   UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  -- System roles may be edited but never deleted, so a studio always has a role
  -- to fall back on.
  is_system   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (studio_id, key)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id        UUID NOT NULL REFERENCES roles(id)       ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);

ALTER TABLE staff ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS staff_role_id_idx ON staff (role_id);

-- ── Seeding ───────────────────────────────────────────────────
-- Creates the four default roles for a studio and grants their permissions.
CREATE OR REPLACE FUNCTION seed_default_roles(p_studio_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role_id UUID;
  v_def     RECORD;
BEGIN
  FOR v_def IN
    SELECT * FROM (VALUES
      ('admin', 'Admin', 'Full access, including staff, packages and studio settings.',
        ARRAY['dashboard.view','schedule.view','jobs.view','jobs.write','jobs.shoots',
              'jobs.payments','jobs.contracts','gallery.manage','album.manage',
              'clients.manage','packages.manage','staff.manage','settings.manage']),
      ('sales', 'Sales', 'Jobs, clients, packages, contracts and payments.',
        ARRAY['dashboard.view','schedule.view','jobs.view','jobs.write',
              'jobs.payments','jobs.contracts','clients.manage','packages.manage']),
      ('coordinator', 'Coordinator', 'Jobs, clients and shoot scheduling. No pricing or contracts.',
        ARRAY['dashboard.view','schedule.view','jobs.view','jobs.write','jobs.shoots','clients.manage']),
      ('editor', 'Editor', 'Shoots, galleries, proofing and albums.',
        ARRAY['dashboard.view','schedule.view','jobs.view','jobs.shoots','gallery.manage','album.manage'])
    ) AS t(key, name, description, perms)
  LOOP
    INSERT INTO roles (studio_id, key, name, description, is_system)
    VALUES (p_studio_id, v_def.key, v_def.name, v_def.description, TRUE)
    ON CONFLICT (studio_id, key) DO UPDATE SET is_system = TRUE
    RETURNING id INTO v_role_id;

    INSERT INTO role_permissions (role_id, permission_key)
    SELECT v_role_id, unnest(v_def.perms)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

-- Seed every existing studio, then link staff to the role matching their enum.
DO $$
DECLARE s RECORD;
BEGIN
  FOR s IN SELECT id FROM studios LOOP
    PERFORM seed_default_roles(s.id);
  END LOOP;
END $$;

UPDATE staff st
   SET role_id = r.id
  FROM roles r
 WHERE r.studio_id = st.studio_id
   AND r.key = st.role::TEXT
   AND st.role_id IS NULL;

-- New studios get the default roles automatically.
CREATE OR REPLACE FUNCTION seed_roles_for_new_studio()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM seed_default_roles(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_studio_created_seed_roles ON studios;
CREATE TRIGGER on_studio_created_seed_roles
  AFTER INSERT ON studios
  FOR EACH ROW EXECUTE FUNCTION seed_roles_for_new_studio();

-- ── Permission lookup ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION has_permission(p_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM staff s
      JOIN role_permissions rp ON rp.role_id = s.role_id
     WHERE s.user_id = auth.uid()
       AND s.is_active = TRUE
       AND rp.permission_key = p_key
  );
$$;

-- Every permission the caller holds — one round trip for the app.
CREATE OR REPLACE FUNCTION my_permissions()
RETURNS TABLE (permission_key TEXT)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rp.permission_key
    FROM staff s
    JOIN role_permissions rp ON rp.role_id = s.role_id
   WHERE s.user_id = auth.uid() AND s.is_active = TRUE;
$$;

GRANT EXECUTE ON FUNCTION has_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION my_permissions()     TO authenticated;

-- ── RLS on the new tables ─────────────────────────────────────
ALTER TABLE permissions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- The catalogue is not sensitive; any signed-in staff member may read it.
CREATE POLICY "authenticated_read_permissions" ON permissions
  FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "staff_select_roles" ON roles
  FOR SELECT USING (studio_id = get_my_studio_id());

CREATE POLICY "staff_manage_roles" ON roles
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('staff.manage'));

CREATE POLICY "staff_select_role_permissions" ON role_permissions
  FOR SELECT USING (
    role_id IN (SELECT id FROM roles WHERE studio_id = get_my_studio_id())
  );

CREATE POLICY "staff_manage_role_permissions" ON role_permissions
  FOR ALL USING (
    has_permission('staff.manage')
    AND role_id IN (SELECT id FROM roles WHERE studio_id = get_my_studio_id())
  );

-- ── Repoint existing policies at permissions ──────────────────

-- studios
DROP POLICY IF EXISTS "admin_update_studio" ON studios;
CREATE POLICY "settings_update_studio" ON studios
  FOR UPDATE USING (id = get_my_studio_id() AND has_permission('settings.manage'));

-- subscriptions
DROP POLICY IF EXISTS "admin_all_subscription" ON subscriptions;
CREATE POLICY "settings_all_subscription" ON subscriptions
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('settings.manage'));

-- staff
DROP POLICY IF EXISTS "admin_all_staff" ON staff;
CREATE POLICY "staff_manage_staff" ON staff
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('staff.manage'));

-- packages
DROP POLICY IF EXISTS "admin_sales_all_packages" ON packages;
CREATE POLICY "packages_manage_packages" ON packages
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('packages.manage'));

DROP POLICY IF EXISTS "admin_sales_all_addons" ON package_addons;
CREATE POLICY "packages_manage_addons" ON package_addons
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('packages.manage'));

-- clients: reading is broad, writing needs the capability
DROP POLICY IF EXISTS "staff_all_clients" ON clients;
CREATE POLICY "staff_select_clients" ON clients
  FOR SELECT USING (studio_id = get_my_studio_id());
CREATE POLICY "clients_manage_clients" ON clients
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('clients.manage'));

-- jobs
DROP POLICY IF EXISTS "staff_write_jobs" ON jobs;
CREATE POLICY "jobs_write_jobs" ON jobs
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('jobs.write'));

DROP POLICY IF EXISTS "staff_write_job_addons" ON job_addons;
CREATE POLICY "jobs_write_job_addons" ON job_addons
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('jobs.write'));

-- shoots
DROP POLICY IF EXISTS "staff_write_shoots" ON shoots;
CREATE POLICY "shoots_write_shoots" ON shoots
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('jobs.shoots'));

DROP POLICY IF EXISTS "admin_coordinator_write_shoot_staff" ON shoot_staff;
CREATE POLICY "shoots_write_shoot_staff" ON shoot_staff
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('jobs.shoots'));

-- contracts
DROP POLICY IF EXISTS "admin_sales_write_contracts" ON contracts;
CREATE POLICY "contracts_write_contracts" ON contracts
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('jobs.contracts'));

-- payments
DROP POLICY IF EXISTS "admin_sales_write_payments" ON payments;
CREATE POLICY "payments_write_payments" ON payments
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('jobs.payments'));

-- galleries: split the blanket staff policy into read + capability-gated write
DROP POLICY IF EXISTS "staff_all_galleries" ON galleries;
CREATE POLICY "staff_select_galleries" ON galleries
  FOR SELECT USING (job_id IN (SELECT id FROM jobs WHERE studio_id = get_my_studio_id()));
CREATE POLICY "gallery_manage_galleries" ON galleries
  FOR ALL USING (
    has_permission('gallery.manage')
    AND job_id IN (SELECT id FROM jobs WHERE studio_id = get_my_studio_id())
  );

DROP POLICY IF EXISTS "staff_all_gallery_photos" ON gallery_photos;
CREATE POLICY "staff_select_gallery_photos_studio" ON gallery_photos
  FOR SELECT USING (studio_id = get_my_studio_id());
CREATE POLICY "gallery_manage_gallery_photos" ON gallery_photos
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('gallery.manage'));

-- flipbooks and albums
DROP POLICY IF EXISTS "staff_all_flipbooks" ON flipbooks;
CREATE POLICY "staff_select_flipbooks" ON flipbooks
  FOR SELECT USING (studio_id = get_my_studio_id());
CREATE POLICY "album_manage_flipbooks" ON flipbooks
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('album.manage'));

DROP POLICY IF EXISTS "staff_all_albums" ON albums;
CREATE POLICY "staff_select_albums" ON albums
  FOR SELECT USING (studio_id = get_my_studio_id());
CREATE POLICY "album_manage_albums" ON albums
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('album.manage'));

DROP POLICY IF EXISTS "staff_all_album_pages" ON album_pages;
CREATE POLICY "staff_select_album_pages" ON album_pages
  FOR SELECT USING (studio_id = get_my_studio_id());
CREATE POLICY "album_manage_album_pages" ON album_pages
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('album.manage'));

-- ── Guard rail ────────────────────────────────────────────────
-- A studio must always retain someone who can manage staff, or it locks itself
-- out permanently. Blocks the last such assignment from being removed.
CREATE OR REPLACE FUNCTION assert_studio_keeps_an_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_studio_id UUID;
  v_remaining INT;
BEGIN
  v_studio_id := COALESCE(NEW.studio_id, OLD.studio_id);

  SELECT count(*) INTO v_remaining
    FROM staff s
    JOIN role_permissions rp ON rp.role_id = s.role_id
   WHERE s.studio_id = v_studio_id
     AND s.is_active = TRUE
     AND rp.permission_key = 'staff.manage';

  IF v_remaining = 0 THEN
    RAISE EXCEPTION 'A studio must keep at least one active member who can manage staff'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS staff_keeps_an_admin ON staff;
CREATE CONSTRAINT TRIGGER staff_keeps_an_admin
  AFTER UPDATE OR DELETE ON staff
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_studio_keeps_an_admin();

-- Same rule from the other direction: revoking staff.manage from the only role
-- that grants it would strand the studio.
CREATE OR REPLACE FUNCTION assert_role_change_keeps_an_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_studio_id UUID;
  v_remaining INT;
BEGIN
  SELECT studio_id INTO v_studio_id FROM roles WHERE id = OLD.role_id;
  IF v_studio_id IS NULL THEN
    RETURN NULL;  -- the role itself was deleted; nothing to protect
  END IF;

  SELECT count(*) INTO v_remaining
    FROM staff s
    JOIN role_permissions rp ON rp.role_id = s.role_id
   WHERE s.studio_id = v_studio_id
     AND s.is_active = TRUE
     AND rp.permission_key = 'staff.manage';

  IF v_remaining = 0 THEN
    RAISE EXCEPTION 'At least one active member must keep the "Manage staff and roles" permission'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS role_permissions_keep_an_admin ON role_permissions;
CREATE CONSTRAINT TRIGGER role_permissions_keep_an_admin
  AFTER DELETE ON role_permissions
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_role_change_keeps_an_admin();
