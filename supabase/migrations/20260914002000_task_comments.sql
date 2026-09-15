-- Comments on tasks
--
-- Clarifications currently happen on WhatsApp, where they are invisible to
-- everyone else and lost by the next wedding. A thread on the task keeps the
-- question next to the work it is about.
--
-- Note the INSERT policy is deliberately NOT gated on jobs.write: the common
-- case is an editor asking the person who allocated the work what they meant,
-- and an editor has no jobs.write. Anyone active in the studio may comment.

CREATE TABLE task_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id  UUID NOT NULL REFERENCES studios(id)   ON DELETE CASCADE,
  task_id    UUID NOT NULL REFERENCES job_tasks(id) ON DELETE CASCADE,
  -- Keeps the thread readable after someone leaves the studio.
  author_id  UUID          REFERENCES staff(id)     ON DELETE SET NULL,
  body       TEXT NOT NULL CHECK (length(btrim(body)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX task_comments_task_idx ON task_comments (task_id, created_at);

ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- The whole studio can follow a thread; seeing context is the point.
CREATE POLICY task_comments_select ON task_comments
  FOR SELECT USING (studio_id = get_my_studio_id());

-- Anyone active in the studio may add one, but only as themselves.
CREATE POLICY task_comments_insert ON task_comments
  FOR INSERT WITH CHECK (
    studio_id = get_my_studio_id() AND author_id = get_my_staff_id()
  );

-- Only the author may edit or retract their own words.
CREATE POLICY task_comments_modify_own ON task_comments
  FOR UPDATE
  USING      (studio_id = get_my_studio_id() AND author_id = get_my_staff_id())
  WITH CHECK (studio_id = get_my_studio_id() AND author_id = get_my_staff_id());

CREATE POLICY task_comments_delete_own ON task_comments
  FOR DELETE USING (
    studio_id = get_my_studio_id()
    AND (author_id = get_my_staff_id() OR has_permission('jobs.write'))
  );

COMMENT ON TABLE task_comments IS
  'Internal clarifications on a task. Studio-visible; any active staff may post.';
