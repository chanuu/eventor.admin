-- Revert per-package checklists
--
-- 20260915000000 added package_task_stages, letting a studio pin a subset of the
-- checklist to each of its own client-facing packages. That was built from a
-- misreading of the request — the intent was to make task management a
-- subscription feature (20260915001000), which is unrelated.
--
-- Nothing depended on it and no studio had configured one, so it goes cleanly.

DROP TABLE IF EXISTS package_task_stages;

/**
 * Back to resolving purely from the studio's active checklist.
 *
 * Still idempotent on (job_id, stage_id): re-running adds only what is missing,
 * which is what "Sync with checklist" relies on.
 */
CREATE OR REPLACE FUNCTION seed_job_tasks(p_job_id UUID)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_added INT;
BEGIN
  INSERT INTO job_tasks (studio_id, job_id, stage_id, title, notes, sort_order)
  SELECT j.studio_id, j.id, s.id, s.name, s.description, s.sort_order
    FROM jobs j
    JOIN task_stages s ON s.studio_id = j.studio_id AND s.is_active
   WHERE j.id = p_job_id
     AND NOT EXISTS (
       SELECT 1 FROM job_tasks t WHERE t.job_id = j.id AND t.stage_id = s.id
     );

  GET DIAGNOSTICS v_added = ROW_COUNT;
  RETURN v_added;
END;
$$;

COMMENT ON FUNCTION seed_job_tasks(UUID) IS
  'Adds missing checklist tasks to a job. Idempotent; re-run to pick up new stages.';
