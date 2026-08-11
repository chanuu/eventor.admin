-- Photo proofing: client submits their selection
--
-- Previously the client could tick photos (gallery_photos.is_selected) but the
-- studio had no way to tell "still choosing" from "finished". This adds an
-- explicit submission marker plus an RPC the portal calls to set it.

ALTER TABLE galleries
  ADD COLUMN IF NOT EXISTS selection_submitted_at TIMESTAMPTZ;

COMMENT ON COLUMN galleries.selection_submitted_at IS
  'Set when the client submits their proofing selection. NULL = still choosing.';

-- ── Submit RPC ────────────────────────────────────────────────
-- SECURITY DEFINER so the client can stamp this one column without being given
-- UPDATE on galleries (RLS cannot restrict updates to a single column).
-- Ownership and gallery state are verified inside.
CREATE OR REPLACE FUNCTION submit_gallery_selection(p_gallery_id UUID)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id     UUID;
  v_studio_id  UUID;
  v_status     gallery_status;
  v_title      TEXT;
  v_client     TEXT;
  v_selected   INT;
  v_total      INT;
  v_now        TIMESTAMPTZ := now();
BEGIN
  SELECT g.job_id, g.status, g.title, j.studio_id, c.full_name
    INTO v_job_id, v_status, v_title, v_studio_id, v_client
    FROM galleries g
    JOIN jobs j    ON j.id = g.job_id
    JOIN clients c ON c.id = j.client_id
   WHERE g.id = p_gallery_id
     AND j.client_id = get_my_client_id();

  IF v_job_id IS NULL THEN
    RAISE EXCEPTION 'Gallery not found' USING ERRCODE = 'no_data_found';
  END IF;

  IF v_status <> 'proofing' THEN
    RAISE EXCEPTION 'This gallery is not open for selection' USING ERRCODE = 'check_violation';
  END IF;

  UPDATE galleries
     SET selection_submitted_at = v_now
   WHERE id = p_gallery_id;

  SELECT count(*) FILTER (WHERE is_selected), count(*)
    INTO v_selected, v_total
    FROM gallery_photos
   WHERE gallery_id = p_gallery_id AND is_active = TRUE;

  -- Queue a notification for the studio. sent_at stays NULL until dispatched.
  INSERT INTO notifications (studio_id, job_id, recipient_type, channel, subject, body)
  VALUES (
    v_studio_id, v_job_id, 'staff', 'email',
    'Photo selection submitted — ' || v_title,
    COALESCE(v_client, 'The client') || ' submitted ' || v_selected || ' of ' ||
    v_total || ' photos for "' || v_title || '".'
  );

  RETURN v_now;
END;
$$;

GRANT EXECUTE ON FUNCTION submit_gallery_selection(UUID) TO authenticated;

-- Studios read their own notifications.
DROP POLICY IF EXISTS "staff_select_notifications" ON notifications;
CREATE POLICY "staff_select_notifications" ON notifications
  FOR SELECT USING (studio_id = get_my_studio_id());
