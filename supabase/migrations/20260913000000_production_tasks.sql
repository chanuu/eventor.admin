-- Production tasks
--
-- Work between the shoot and delivery — cull, colour grade, album page design,
-- print ordering — had nowhere to live. Shoots could be staffed (shoot_staff)
-- and job status advanced on milestones, but there was no way to say "this
-- album is with Sachee for colour grading and it is due Friday."
--
-- Stages are per studio and editable, exactly like roles: a wedding studio and
-- a product studio do not share a pipeline. Each studio is seeded with a
-- sensible default set which it can then rename, reorder, or replace.
--
-- Managing tasks reuses the existing `jobs.write` capability rather than adding
-- a new permission key — a new key would need backfilling into every studio's
-- roles and would silently lock people out until it was. Assignees can always
-- update the tasks they own, whatever their role, which is what lets an Editor
-- (who has no jobs.write) work their own queue.

CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'blocked', 'done');

-- ─── Stages: the studio's pipeline ──────────────────────────────────────────

CREATE TABLE task_stages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id       UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  -- Suggests who the work usually goes to; the assignee is still chosen per task.
  default_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  -- Optional: finishing every task in this stage moves the job to this status.
  advances_job_to job_status,
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX task_stages_studio_idx ON task_stages (studio_id, sort_order);

-- ─── Tasks ──────────────────────────────────────────────────────────────────

CREATE TABLE job_tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id    UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  job_id       UUID NOT NULL REFERENCES jobs(id)    ON DELETE CASCADE,
  stage_id     UUID          REFERENCES task_stages(id) ON DELETE SET NULL,

  title        TEXT NOT NULL,
  notes        TEXT,
  assignee_id  UUID          REFERENCES staff(id) ON DELETE SET NULL,
  status       task_status NOT NULL DEFAULT 'pending',

  -- Optional pointer at the thing the work concerns. A colour-grade task points
  -- at a gallery; an album design task points at the album; a backup task points
  -- at nothing in particular.
  shoot_id     UUID REFERENCES shoots(id)    ON DELETE SET NULL,
  gallery_id   UUID REFERENCES galleries(id) ON DELETE SET NULL,
  album_id     UUID REFERENCES albums(id)    ON DELETE SET NULL,

  due_at       TIMESTAMPTZ,
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sort_order   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX job_tasks_job_idx      ON job_tasks (job_id, sort_order);
CREATE INDEX job_tasks_studio_idx   ON job_tasks (studio_id);
-- Drives the "my work" queue: open tasks for one person, soonest first.
CREATE INDEX job_tasks_assignee_idx ON job_tasks (assignee_id, status, due_at);

-- ─── Who am I? ──────────────────────────────────────────────────────────────

/**
 * The caller's staff row id, or NULL if they are not active staff.
 * Companion to get_my_studio_id(); needed so a policy can say "this task is mine".
 */
CREATE OR REPLACE FUNCTION get_my_staff_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM staff WHERE user_id = auth.uid() AND is_active = TRUE LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_my_staff_id() TO authenticated;

-- ─── Timestamps and job status follow the work ──────────────────────────────

/**
 * Keeps started_at / completed_at honest so nobody has to set them by hand,
 * and lets a stage push the job forward when its last task is done.
 */
CREATE OR REPLACE FUNCTION job_task_progress()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target    job_status;
  v_remaining INT;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'in_progress' AND NEW.started_at IS NULL THEN
      NEW.started_at := now();
    END IF;

    IF NEW.status = 'done' THEN
      NEW.completed_at := COALESCE(NEW.completed_at, now());
    ELSE
      -- Reopening a task clears the completion stamp.
      NEW.completed_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER job_tasks_progress
  BEFORE UPDATE ON job_tasks
  FOR EACH ROW EXECUTE FUNCTION job_task_progress();

/**
 * Advances the job once every task in a stage is done.
 *
 * Runs AFTER so it sees the committed row. advance_job_status() only ever moves
 * forward and never touches an archived job, so this is safe to fire often.
 */
CREATE OR REPLACE FUNCTION job_task_advance_status()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target    job_status;
  v_remaining INT;
BEGIN
  IF NEW.status <> 'done' OR NEW.stage_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT advances_job_to INTO v_target FROM task_stages WHERE id = NEW.stage_id;
  IF v_target IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_remaining
    FROM job_tasks
   WHERE job_id = NEW.job_id AND stage_id = NEW.stage_id AND status <> 'done';

  IF v_remaining = 0 THEN
    PERFORM advance_job_status(NEW.job_id, v_target);
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER job_tasks_advance
  AFTER INSERT OR UPDATE OF status ON job_tasks
  FOR EACH ROW EXECUTE FUNCTION job_task_advance_status();

-- ─── Default pipeline, seeded per studio ────────────────────────────────────

CREATE OR REPLACE FUNCTION seed_default_task_stages(p_studio_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_def RECORD;
BEGIN
  -- Skip studios that already have a pipeline, so this is safe to re-run and
  -- never overwrites a studio's own edits.
  IF EXISTS (SELECT 1 FROM task_stages WHERE studio_id = p_studio_id) THEN
    RETURN;
  END IF;

  FOR v_def IN
    SELECT * FROM (VALUES
      ('Back up & cull',    'Copy cards to storage and remove the rejects.',        'editor', 10, NULL::job_status),
      ('Colour grade',      'Edit and grade the selected frames.',                  'editor', 20, 'editing'::job_status),
      ('Client proofing',   'Publish the gallery and collect the client picks.',    'editor', 30, 'proofing'::job_status),
      ('Album page design', 'Lay out the album spreads and get them approved.',     'editor', 40, NULL::job_status),
      ('Print & deliver',   'Send to the lab and hand over the finished album.',    'admin',  50, 'delivered'::job_status)
    ) AS t(name, description, role_key, sort_order, advances_to)
  LOOP
    INSERT INTO task_stages (studio_id, name, description, default_role_id, sort_order, advances_job_to)
    VALUES (
      p_studio_id,
      v_def.name,
      v_def.description,
      (SELECT id FROM roles WHERE studio_id = p_studio_id AND key = v_def.role_key),
      v_def.sort_order,
      v_def.advances_to
    );
  END LOOP;
END;
$$;

-- Seed every studio that exists today.
DO $$
DECLARE s RECORD;
BEGIN
  FOR s IN SELECT id FROM studios LOOP
    PERFORM seed_default_task_stages(s.id);
  END LOOP;
END $$;

/**
 * New studios get the pipeline automatically. Runs after the roles trigger so
 * default_role_id can resolve — roles are seeded on the same INSERT.
 */
CREATE OR REPLACE FUNCTION seed_task_stages_for_new_studio()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM seed_default_task_stages(NEW.id);
  RETURN NEW;
END;
$$;

-- Name sorts after on_studio_created_seed_roles, so roles exist first.
CREATE TRIGGER zz_on_studio_created_seed_task_stages
  AFTER INSERT ON studios
  FOR EACH ROW EXECUTE FUNCTION seed_task_stages_for_new_studio();

-- ─── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE task_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_tasks   ENABLE ROW LEVEL SECURITY;

-- Everyone in the studio can see the pipeline; changing it is job management.
CREATE POLICY task_stages_select ON task_stages
  FOR SELECT USING (studio_id = get_my_studio_id());

CREATE POLICY task_stages_manage ON task_stages
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('jobs.write'))
  WITH CHECK (studio_id = get_my_studio_id() AND has_permission('jobs.write'));

-- The whole studio can see the board — knowing who holds what is the point.
CREATE POLICY job_tasks_select ON job_tasks
  FOR SELECT USING (studio_id = get_my_studio_id());

CREATE POLICY job_tasks_manage ON job_tasks
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('jobs.write'))
  WITH CHECK (studio_id = get_my_studio_id() AND has_permission('jobs.write'));

-- An assignee can always work their own queue, whatever their role. WITH CHECK
-- repeats assignee_id so they cannot hand a task to someone else this way.
CREATE POLICY job_tasks_update_own ON job_tasks
  FOR UPDATE
  USING      (studio_id = get_my_studio_id() AND assignee_id = get_my_staff_id())
  WITH CHECK (studio_id = get_my_studio_id() AND assignee_id = get_my_staff_id());

COMMENT ON TABLE task_stages IS
  'Per-studio production pipeline. Editable like roles; seeded with defaults on studio creation.';
COMMENT ON TABLE job_tasks IS
  'A unit of production work on a job, optionally pointing at the shoot, gallery or album it concerns.';
COMMENT ON COLUMN task_stages.advances_job_to IS
  'When every task in this stage is done, move the job to this status. NULL = no effect.';
