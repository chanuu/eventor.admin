-- Task management becomes a sellable feature
--
-- Production tasks shipped switched on for everyone. It is a real differentiator
-- worth pricing, so it joins the feature catalogue and the platform admin can
-- include or exclude it per plan from /platform/plans like any other.

INSERT INTO features (key, label, description, sort_order)
VALUES (
  'tasks',
  'Task management',
  'Job checklists, allocation to staff, deadlines and the production board.',
  95
)
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label, description = EXCLUDED.description;

-- Sensible starting point; the platform admin can change any of it in the UI.
-- Deliberately not on 'album' (Album Only) — a single-purpose plan does not need
-- a production pipeline, and it gives the cheaper tiers somewhere to grow into.
INSERT INTO plan_features (plan_key, feature_key)
SELECT k, 'tasks' FROM (VALUES ('studio'), ('network')) AS t(k)
ON CONFLICT DO NOTHING;

-- ─── Gate the tables on it ──────────────────────────────────────────────────
--
-- Seeding stays ungated on purpose: seed_job_tasks() is SECURITY DEFINER, so a
-- studio without the feature still accumulates its checklist quietly and finds
-- it already populated if they upgrade later. Only reading and changing is gated.

DROP POLICY IF EXISTS task_stages_select ON task_stages;
DROP POLICY IF EXISTS task_stages_manage ON task_stages;

CREATE POLICY task_stages_select ON task_stages
  FOR SELECT USING (studio_id = get_my_studio_id() AND has_feature('tasks'));

CREATE POLICY task_stages_manage ON task_stages
  FOR ALL USING (
    studio_id = get_my_studio_id() AND has_permission('jobs.write') AND has_feature('tasks')
  )
  WITH CHECK (
    studio_id = get_my_studio_id() AND has_permission('jobs.write') AND has_feature('tasks')
  );

DROP POLICY IF EXISTS job_tasks_select ON job_tasks;
DROP POLICY IF EXISTS job_tasks_manage ON job_tasks;
DROP POLICY IF EXISTS job_tasks_update_own ON job_tasks;

CREATE POLICY job_tasks_select ON job_tasks
  FOR SELECT USING (studio_id = get_my_studio_id() AND has_feature('tasks'));

CREATE POLICY job_tasks_manage ON job_tasks
  FOR ALL USING (
    studio_id = get_my_studio_id() AND has_permission('jobs.write') AND has_feature('tasks')
  )
  WITH CHECK (
    studio_id = get_my_studio_id() AND has_permission('jobs.write') AND has_feature('tasks')
  );

CREATE POLICY job_tasks_update_own ON job_tasks
  FOR UPDATE
  USING      (studio_id = get_my_studio_id() AND assignee_id = get_my_staff_id() AND has_feature('tasks'))
  WITH CHECK (studio_id = get_my_studio_id() AND assignee_id = get_my_staff_id() AND has_feature('tasks'));

DROP POLICY IF EXISTS task_comments_select ON task_comments;
DROP POLICY IF EXISTS task_comments_insert ON task_comments;

CREATE POLICY task_comments_select ON task_comments
  FOR SELECT USING (studio_id = get_my_studio_id() AND has_feature('tasks'));

CREATE POLICY task_comments_insert ON task_comments
  FOR INSERT WITH CHECK (
    studio_id = get_my_studio_id()
    AND author_id = get_my_staff_id()
    AND has_feature('tasks')
  );
