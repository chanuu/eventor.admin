-- Lead source on enquiries
--
-- Studios need to know which channels bring paying work. Sources are a per-studio
-- list so each can track what matters to them, and the value is stored on the job
-- so reporting survives the list being edited later.

CREATE TABLE IF NOT EXISTS lead_sources (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id  UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (studio_id, name)
);

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS lead_source TEXT;

COMMENT ON COLUMN jobs.lead_source IS
  'Where this enquiry came from. Stored as text so historic reporting is unaffected by later edits to the studio''s source list.';

CREATE INDEX IF NOT EXISTS jobs_lead_source_idx ON jobs (studio_id, lead_source);

-- ── Seeding ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION seed_lead_sources(p_studio_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_names TEXT[] := ARRAY[
    'Referral', 'Instagram', 'Facebook', 'TikTok', 'Google search',
    'Wedding fair', 'Repeat client', 'Walk-in', 'Other'
  ];
  v_i INT;
BEGIN
  FOR v_i IN 1 .. array_length(v_names, 1) LOOP
    INSERT INTO lead_sources (studio_id, name, sort_order)
    VALUES (p_studio_id, v_names[v_i], v_i * 10)
    ON CONFLICT (studio_id, name) DO NOTHING;
  END LOOP;
END;
$$;

DO $$
DECLARE s RECORD;
BEGIN
  FOR s IN SELECT id FROM studios LOOP
    PERFORM seed_lead_sources(s.id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION seed_lead_sources_for_new_studio()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM seed_lead_sources(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_studio_created_seed_lead_sources ON studios;
CREATE TRIGGER on_studio_created_seed_lead_sources
  AFTER INSERT ON studios
  FOR EACH ROW EXECUTE FUNCTION seed_lead_sources_for_new_studio();

-- ── Access ────────────────────────────────────────────────────
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_select_lead_sources" ON lead_sources
  FOR SELECT USING (studio_id = get_my_studio_id());

CREATE POLICY "staff_manage_lead_sources" ON lead_sources
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('settings.manage'));
