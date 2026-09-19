-- Lead sources are platform-level
--
-- They were seeded per studio, which made every tenant's list drift apart and
-- cross-tenant reporting meaningless. The platform now owns one shared list;
-- studios choose from it but cannot edit it.

-- Policies reference studio_id, so they must go before the column does.
DROP POLICY IF EXISTS "staff_select_lead_sources" ON lead_sources;
DROP POLICY IF EXISTS "staff_manage_lead_sources" ON lead_sources;

-- Collapse the per-studio rows into a single global list, keeping one row per name.
DELETE FROM lead_sources a
 USING lead_sources b
 WHERE a.name = b.name
   AND a.ctid > b.ctid;

ALTER TABLE lead_sources DROP CONSTRAINT IF EXISTS lead_sources_studio_id_name_key;
ALTER TABLE lead_sources DROP COLUMN IF EXISTS studio_id;
ALTER TABLE lead_sources ADD CONSTRAINT lead_sources_name_key UNIQUE (name);

COMMENT ON TABLE lead_sources IS
  'Shared, platform-managed list of enquiry sources. Every studio selects from the same options so reporting is comparable across tenants.';

-- Per-studio seeding is no longer meaningful.
DROP TRIGGER IF EXISTS on_studio_created_seed_lead_sources ON studios;
DROP FUNCTION IF EXISTS seed_lead_sources_for_new_studio();
DROP FUNCTION IF EXISTS seed_lead_sources(UUID);

-- ── Access ────────────────────────────────────────────────────
-- Any signed-in studio member can read the list to fill the dropdown.
CREATE POLICY "read_lead_sources" ON lead_sources
  FOR SELECT TO authenticated USING (TRUE);

-- Only the platform may change what is on it.
CREATE POLICY "platform_admin_write_lead_sources" ON lead_sources
  FOR ALL USING (is_platform_admin()) WITH CHECK (is_platform_admin());
