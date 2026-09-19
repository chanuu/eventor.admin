-- Jobs get their task list automatically
--
-- Creating every task by hand for every job defeats the point of having a
-- pipeline. The pipeline IS the checklist: each active stage becomes one task
-- on the job, created unassigned and with no deadline. Allocating the work and
-- setting dates then happens on the job's Tasks tab, where the context is.

/**
 * Creates any pipeline tasks this job is missing. Returns how many were added.
 *
 * Idempotent by (job_id, stage_id), so it is safe to re-run — which is how a
 * job picks up a stage that was added to the pipeline after it was created.
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

GRANT EXECUTE ON FUNCTION seed_job_tasks(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION seed_tasks_for_new_job()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM seed_job_tasks(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_job_created_seed_tasks
  AFTER INSERT ON jobs
  FOR EACH ROW EXECUTE FUNCTION seed_tasks_for_new_job();

-- Give existing work the checklist too, but skip jobs that are already finished
-- — a delivered job does not need a "back up the cards" task appearing on it.
DO $$
DECLARE j RECORD;
BEGIN
  FOR j IN SELECT id FROM jobs WHERE status NOT IN ('delivered', 'archived') LOOP
    PERFORM seed_job_tasks(j.id);
  END LOOP;
END $$;

COMMENT ON FUNCTION seed_job_tasks(UUID) IS
  'Adds missing pipeline tasks to a job. Idempotent; re-run to pick up new stages.';
