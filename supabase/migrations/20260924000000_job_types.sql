-- Job types, configurable per studio
--
-- event_type was a free-text field, so the same shoot arrived as "Wedding",
-- "wedding" and "Wedding " and nothing could be counted reliably. This gives
-- each studio its own list to pick from.
--
-- jobs.event_type stays TEXT and keeps storing the name rather than an id, for
-- the same reason lead_source does: removing a type from the list must never
-- rewrite what past jobs were. A studio stops offering it for new work; the
-- history still reads correctly.

CREATE TABLE IF NOT EXISTS job_types (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id  UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  sort_order INT  NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_types_studio_idx ON job_types (studio_id, sort_order);

-- Case-insensitive, so "Wedding" and "wedding" cannot both be added.
CREATE UNIQUE INDEX IF NOT EXISTS job_types_studio_name_idx
  ON job_types (studio_id, lower(name));

-- ─── Access ─────────────────────────────────────────────────────────────────
-- Anyone in the studio reads them (the new-job form needs the list); changing
-- them is a studio setting, so it follows settings.manage.

ALTER TABLE job_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_select_job_types" ON job_types;
CREATE POLICY "staff_select_job_types" ON job_types
  FOR SELECT USING (studio_id = get_my_studio_id());

DROP POLICY IF EXISTS "settings_manage_job_types" ON job_types;
CREATE POLICY "settings_manage_job_types" ON job_types
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('settings.manage'));

-- ─── Seeding ────────────────────────────────────────────────────────────────

/**
 * Gives a studio a starting list.
 *
 * Whatever the studio has already typed into event_type comes first and keeps
 * its original spelling — those are in use, and a list that omitted them would
 * make existing jobs look invalid. The defaults fill in behind, skipping any
 * that would collide.
 */
CREATE OR REPLACE FUNCTION seed_default_job_types(p_studio_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next INT := 10;
  v_name TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM job_types WHERE studio_id = p_studio_id) THEN
    RETURN;
  END IF;

  -- In use already.
  FOR v_name IN
    SELECT DISTINCT btrim(event_type)
      FROM jobs
     WHERE studio_id = p_studio_id
       AND event_type IS NOT NULL
       AND btrim(event_type) <> ''
     ORDER BY 1
  LOOP
    INSERT INTO job_types (studio_id, name, sort_order)
    VALUES (p_studio_id, v_name, v_next)
    ON CONFLICT DO NOTHING;
    v_next := v_next + 10;
  END LOOP;

  -- Sensible defaults for a Sri Lankan photography studio.
  FOR v_name IN
    SELECT * FROM (VALUES
      ('Wedding'), ('Homecoming'), ('Engagement'), ('Pre-shoot'),
      ('Birthday'), ('Corporate Event'), ('Portrait Session')
    ) AS t(name)
  LOOP
    INSERT INTO job_types (studio_id, name, sort_order)
    VALUES (p_studio_id, v_name, v_next)
    ON CONFLICT DO NOTHING;
    v_next := v_next + 10;
  END LOOP;
END;
$$;

-- Every studio that exists today.
DO $$
DECLARE s RECORD;
BEGIN
  FOR s IN SELECT id FROM studios LOOP
    PERFORM seed_default_job_types(s.id);
  END LOOP;
END $$;

/** New studios get the list automatically. */
CREATE OR REPLACE FUNCTION seed_job_types_for_new_studio()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM seed_default_job_types(NEW.id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS studio_seeds_job_types ON studios;
CREATE TRIGGER studio_seeds_job_types
  AFTER INSERT ON studios
  FOR EACH ROW EXECUTE FUNCTION seed_job_types_for_new_studio();

COMMENT ON TABLE job_types IS
  'Per-studio list of event types offered when creating a job. jobs.event_type '
  'stores the name, not a reference, so removing a type never rewrites history.';
