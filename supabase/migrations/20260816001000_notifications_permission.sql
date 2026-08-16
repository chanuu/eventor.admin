-- The notifications write policy was the last one still checking the old
-- staff_role enum. Repoint it at the permission model like the rest.

DROP POLICY IF EXISTS "admin_coordinator_write_notifications" ON notifications;

CREATE POLICY "jobs_write_notifications" ON notifications
  FOR ALL USING (studio_id = get_my_studio_id() AND has_permission('jobs.write'));
