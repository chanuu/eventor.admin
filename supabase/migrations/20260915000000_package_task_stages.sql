-- Per-package checklists
--
-- Every job got the studio's whole checklist, which is wrong as soon as a studio
-- sells more than one kind of work: a portrait sitting does not need "Album page
-- design", and a wedding without an album does not either.
--
-- A package may now pin its own subset of the checklist. Packages that pin
-- nothing keep the old behaviour — the full active list — so nothing changes
-- until a studio opts in.

CREATE TABLE package_task_stages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id  UUID NOT NULL REFERENCES studios(id)     ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES packages(id)    ON DELETE CASCADE,
  stage_id   UUID NOT NULL REFERENCES task_stages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (package_id, stage_id)
);

CREATE INDEX package_task_stages_package_idx ON package_task_stages (package_id);

ALTER TABLE package_task_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY package_task_stages_select ON package_task_stages
  FOR SELECT USING (studio_id = get_my_studio_id());

-- Configuring what a package includes is package management.
CREATE POLICY package_task_stages_manage ON package_task_stages
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('packages.manage'))
  WITH CHECK (studio_id = get_my_studio_id() AND has_permission('packages.manage'));

/**
 * Adds missing checklist tasks to a job, from its package where one is pinned.
 *
 * Resolution order:
 *   1. the job's package has pinned stages  → exactly those
 *   2. otherwise                            → every active studio stage
 *
 * Still idempotent on (job_id, stage_id), so re-running picks up additions
 * without duplicating anything.
 */
CREATE OR REPLACE FUNCTION seed_job_tasks(p_job_id UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_added   INT;
  v_pinned  BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM jobs j
      JOIN package_task_stages pts ON pts.package_id = j.package_id
     WHERE j.id = p_job_id
  ) INTO v_pinned;

  INSERT INTO job_tasks (studio_id, job_id, stage_id, title, notes, sort_order)
  SELECT j.studio_id, j.id, s.id, s.name, s.description, s.sort_order
    FROM jobs j
    JOIN task_stages s ON s.studio_id = j.studio_id AND s.is_active
   WHERE j.id = p_job_id
     AND (
       NOT v_pinned
       OR EXISTS (
         SELECT 1 FROM package_task_stages pts
          WHERE pts.package_id = j.package_id AND pts.stage_id = s.id
       )
     )
     AND NOT EXISTS (
       SELECT 1 FROM job_tasks t WHERE t.job_id = j.id AND t.stage_id = s.id
     );

  GET DIAGNOSTICS v_added = ROW_COUNT;
  RETURN v_added;
END;
$$;

COMMENT ON TABLE package_task_stages IS
  'Checklist items a package pins. Empty for a package means "the whole active list".';
