-- Human job numbers, and profile pictures for staff
--
-- Jobs were identified only by a UUID and a title. With a handful that is fine;
-- with hundreds it is unworkable — nobody can say "look at job
-- 90f10b4d-b7ae-4b0b-bbf0-6a0cdacf02fa" down the phone. Each studio now counts
-- its own jobs from 1, so the numbers stay short and memorable and one studio
-- cannot infer how much work another is doing.

ALTER TABLE jobs  ADD COLUMN IF NOT EXISTS job_no     INT;
ALTER TABLE staff ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Number what already exists, oldest first, per studio.
WITH numbered AS (
  SELECT id, row_number() OVER (PARTITION BY studio_id ORDER BY created_at, id) AS n
    FROM jobs
)
UPDATE jobs j
   SET job_no = numbered.n
  FROM numbered
 WHERE numbered.id = j.id
   AND j.job_no IS NULL;

ALTER TABLE jobs ALTER COLUMN job_no SET NOT NULL;

-- Unique per studio, not globally: studio A and studio B both have a job #1.
CREATE UNIQUE INDEX IF NOT EXISTS jobs_studio_no_idx ON jobs (studio_id, job_no);

/**
 * Assigns the next number for the studio.
 *
 * Takes a transaction-scoped advisory lock keyed on the studio first: two jobs
 * created at the same moment would otherwise both read the same MAX and collide
 * on the unique index. The lock is per studio, so studios never block each other,
 * and it is released automatically when the transaction ends.
 */
CREATE OR REPLACE FUNCTION assign_job_no()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.job_no IS NULL THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.studio_id::text));

    SELECT COALESCE(MAX(job_no), 0) + 1
      INTO NEW.job_no
      FROM jobs
     WHERE studio_id = NEW.studio_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER jobs_assign_no
  BEFORE INSERT ON jobs
  FOR EACH ROW EXECUTE FUNCTION assign_job_no();

COMMENT ON COLUMN jobs.job_no IS
  'Short per-studio reference, shown as #42. Unique within a studio, not globally.';
COMMENT ON COLUMN staff.avatar_url IS
  'Public S3 URL of the profile picture (~400px square). NULL falls back to initials.';
