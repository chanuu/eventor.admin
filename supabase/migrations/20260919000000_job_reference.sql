-- A job reference you can say out loud
--
-- job_no alone reads as "#1", which looks unfinished next to a real reference
-- and sorts badly in anything that treats it as text. Jobs now carry a stored
-- JB0001-style reference as well.
--
-- GENERATED ... STORED rather than a trigger or an app-side format: it is a real
-- column that can be indexed and searched, and it can never drift from job_no
-- because Postgres recomputes it on every write.

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS job_ref TEXT
  GENERATED ALWAYS AS ('JB' || lpad(job_no::text, 4, '0')) STORED;

-- Searching by reference is the whole point of having one.
CREATE INDEX IF NOT EXISTS jobs_job_ref_idx ON jobs (job_ref);

-- Unique per studio for free, since job_no already is — stated explicitly so the
-- guarantee survives anyone changing how job_no is assigned.
CREATE UNIQUE INDEX IF NOT EXISTS jobs_studio_ref_idx ON jobs (studio_id, job_ref);

COMMENT ON COLUMN jobs.job_ref IS
  'Human reference, JB0001. Derived from job_no, unique per studio. Read-only — set job_no instead.';
