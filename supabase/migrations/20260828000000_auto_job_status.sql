-- Job status follows the work
--
-- The stage of a job was maintained by hand, so it drifted out of step with what
-- had actually happened. These triggers advance it as milestones occur, from
-- either app:
--
--   contract sent            → quoted
--   contract signed          → contracted
--   a shoot marked 'shot'    → active
--   a shoot in 'editing'     → editing
--   a gallery in 'proofing'  → proofing
--   album published          → delivered
--
-- Status only ever moves FORWARD. A studio can still set any stage by hand, and
-- a manual move backwards is never undone by a later event at a lower stage.
-- Archived jobs are left alone entirely.

CREATE OR REPLACE FUNCTION job_status_rank(s job_status)
RETURNS INT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE s
    WHEN 'lead'       THEN 1
    WHEN 'quoted'     THEN 2
    WHEN 'contracted' THEN 3
    WHEN 'active'     THEN 4
    WHEN 'editing'    THEN 5
    WHEN 'proofing'   THEN 6
    WHEN 'delivered'  THEN 7
    WHEN 'archived'   THEN 8
  END;
$$;

/**
 * Moves a job forward to p_target, never backwards, and never out of archived.
 */
CREATE OR REPLACE FUNCTION advance_job_status(p_job_id UUID, p_target job_status)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE jobs
     SET status = p_target
   WHERE id = p_job_id
     AND status <> 'archived'
     AND job_status_rank(status) < job_status_rank(p_target);
END;
$$;

-- ── Contracts ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION job_status_from_contract()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'signed' THEN
    PERFORM advance_job_status(NEW.job_id, 'contracted');
  ELSIF NEW.status = 'sent' THEN
    PERFORM advance_job_status(NEW.job_id, 'quoted');
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS contract_advances_job ON contracts;
CREATE TRIGGER contract_advances_job
  AFTER INSERT OR UPDATE OF status ON contracts
  FOR EACH ROW EXECUTE FUNCTION job_status_from_contract();

-- ── Shoots ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION job_status_from_shoot()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('editing', 'done') THEN
    PERFORM advance_job_status(NEW.job_id, 'editing');
  ELSIF NEW.status = 'shot' THEN
    PERFORM advance_job_status(NEW.job_id, 'active');
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS shoot_advances_job ON shoots;
CREATE TRIGGER shoot_advances_job
  AFTER INSERT OR UPDATE OF status ON shoots
  FOR EACH ROW EXECUTE FUNCTION job_status_from_shoot();

-- ── Galleries ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION job_status_from_gallery()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'proofing' THEN
    PERFORM advance_job_status(NEW.job_id, 'proofing');
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS gallery_advances_job ON galleries;
CREATE TRIGGER gallery_advances_job
  AFTER INSERT OR UPDATE OF status ON galleries
  FOR EACH ROW EXECUTE FUNCTION job_status_from_gallery();

-- ── Albums ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION job_status_from_album()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published' THEN
    PERFORM advance_job_status(NEW.job_id, 'delivered');
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS album_advances_job ON albums;
CREATE TRIGGER album_advances_job
  AFTER INSERT OR UPDATE OF status ON albums
  FOR EACH ROW EXECUTE FUNCTION job_status_from_album();

-- ── Backfill ──────────────────────────────────────────────────
-- Bring existing jobs into step with what has already happened.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM jobs WHERE status <> 'archived' LOOP
    PERFORM advance_job_status(r.id, 'quoted')
      FROM contracts c WHERE c.job_id = r.id AND c.status IN ('sent','signed');
    PERFORM advance_job_status(r.id, 'contracted')
      FROM contracts c WHERE c.job_id = r.id AND c.status = 'signed';
    PERFORM advance_job_status(r.id, 'active')
      FROM shoots s WHERE s.job_id = r.id AND s.status = 'shot';
    PERFORM advance_job_status(r.id, 'editing')
      FROM shoots s WHERE s.job_id = r.id AND s.status IN ('editing','done');
    PERFORM advance_job_status(r.id, 'proofing')
      FROM galleries g WHERE g.job_id = r.id AND g.status = 'proofing';
    PERFORM advance_job_status(r.id, 'delivered')
      FROM albums a WHERE a.job_id = r.id AND a.status = 'published';
  END LOOP;
END $$;
