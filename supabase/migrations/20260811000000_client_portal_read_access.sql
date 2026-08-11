-- Client portal read access
--
-- The portal shows the studio's name/logo in the sidebar and the crew assigned to
-- each shoot. Clients had no SELECT policy on studios, staff or shoot_staff, so
-- those reads returned nothing. These policies are read-only and scoped to the
-- signed-in client's own studio and jobs.

-- ── studios ───────────────────────────────────────────────────
CREATE POLICY "client_select_own_studio" ON studios
  FOR SELECT USING (id = get_my_client_studio_id());

-- ── shoot_staff ───────────────────────────────────────────────
-- Only crew rows attached to a shoot on one of the client's own jobs.
CREATE POLICY "client_select_own_shoot_staff" ON shoot_staff
  FOR SELECT USING (
    shoot_id IN (
      SELECT s.id FROM shoots s
      JOIN jobs j ON j.id = s.job_id
      WHERE j.client_id = get_my_client_id()
    )
  );

-- ── staff ─────────────────────────────────────────────────────
-- Name only, and only for staff actually assigned to one of the client's shoots.
CREATE POLICY "client_select_assigned_staff" ON staff
  FOR SELECT USING (
    id IN (
      SELECT ss.staff_id FROM shoot_staff ss
      JOIN shoots s ON s.id = ss.shoot_id
      JOIN jobs j   ON j.id = s.job_id
      WHERE j.client_id = get_my_client_id()
    )
  );
