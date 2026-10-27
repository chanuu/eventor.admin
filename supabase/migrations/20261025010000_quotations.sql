-- Quotations: a priced offer for a job, sent before any contract exists.
--
-- Studios were quoting in WhatsApp and spreadsheets, so nothing recorded what
-- was offered, at what price, or whether the client ever answered — and the
-- `quoted` job status had no way of being reached honestly.
--
-- Shaped like contracts, with one difference: contracts are one per job
-- (`job_id UNIQUE`), quotations are not. A studio revises an offer, and the
-- superseded version has to stay readable — it is what the client was shown.

-- Guarded so the file can be run by hand and then again by `db push` without
-- failing on the type already existing. Everything below already uses
-- IF NOT EXISTS or DROP-then-CREATE; this was the one statement that did not.
DO $$
BEGIN
  CREATE TYPE quotation_status AS ENUM ('draft', 'sent', 'accepted', 'declined', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS quotations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id        UUID NOT NULL REFERENCES jobs(id)     ON DELETE CASCADE,
  studio_id     UUID NOT NULL REFERENCES studios(id)  ON DELETE CASCADE,

  /** Human reference, e.g. Q-2026-014. Shown on the document. */
  reference     TEXT,
  status        quotation_status NOT NULL DEFAULT 'draft',

  /** An offer that never expires is not an offer. Nullable: some never do. */
  valid_until   DATE,

  /** Free text above and below the priced lines. */
  intro         TEXT,
  terms         TEXT,

  /** Money off the subtotal, as an amount rather than a rate — studios
      negotiate "take off 20,000", not "give 7.3%". */
  discount      NUMERIC(12,2) NOT NULL DEFAULT 0,

  sent_at       TIMESTAMPTZ,
  viewed_at     TIMESTAMPTZ,
  responded_at  TIMESTAMPTZ,
  /** Why a client declined, when they say. Worth more than the status alone. */
  response_note TEXT,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT quotation_discount_not_negative CHECK (discount >= 0)
);

CREATE INDEX IF NOT EXISTS quotations_job_idx ON quotations (job_id, created_at DESC);

/**
 * The priced lines.
 *
 * Rows rather than JSON, and copied rather than referenced: a quotation is a
 * snapshot of what was offered. If it pointed at `packages`, raising a package
 * price would silently rewrite every quotation a studio had already sent.
 */
CREATE TABLE IF NOT EXISTS quotation_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  studio_id    UUID NOT NULL REFERENCES studios(id)    ON DELETE CASCADE,
  description  TEXT NOT NULL,
  detail       TEXT,
  quantity     NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price   NUMERIC(12,2) NOT NULL DEFAULT 0,
  sort_order   INT NOT NULL DEFAULT 0,

  CONSTRAINT quotation_item_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX IF NOT EXISTS quotation_items_parent_idx
  ON quotation_items (quotation_id, sort_order);

-- ─── Access ─────────────────────────────────────────────────────────────────

ALTER TABLE quotations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_select_quotations" ON quotations;
CREATE POLICY "staff_select_quotations" ON quotations
  FOR SELECT USING (studio_id = get_my_studio_id());

DROP POLICY IF EXISTS "admin_sales_write_quotations" ON quotations;
CREATE POLICY "admin_sales_write_quotations" ON quotations
  FOR ALL USING (
    studio_id = get_my_studio_id()
    AND get_my_staff_role() IN ('admin', 'sales')
  );

-- A draft is the studio thinking aloud; the client sees an offer only once it
-- has been sent.
DROP POLICY IF EXISTS "client_select_own_quotations" ON quotations;
CREATE POLICY "client_select_own_quotations" ON quotations
  FOR SELECT USING (
    status <> 'draft'
    AND job_id IN (SELECT id FROM jobs WHERE client_id = get_my_client_id())
  );

DROP POLICY IF EXISTS "staff_select_quotation_items" ON quotation_items;
CREATE POLICY "staff_select_quotation_items" ON quotation_items
  FOR SELECT USING (studio_id = get_my_studio_id());

DROP POLICY IF EXISTS "admin_sales_write_quotation_items" ON quotation_items;
CREATE POLICY "admin_sales_write_quotation_items" ON quotation_items
  FOR ALL USING (
    studio_id = get_my_studio_id()
    AND get_my_staff_role() IN ('admin', 'sales')
  );

DROP POLICY IF EXISTS "client_select_own_quotation_items" ON quotation_items;
CREATE POLICY "client_select_own_quotation_items" ON quotation_items
  FOR SELECT USING (
    quotation_id IN (
      SELECT id FROM quotations
       WHERE status <> 'draft'
         AND job_id IN (SELECT id FROM jobs WHERE client_id = get_my_client_id())
    )
  );

-- ─── Responding ─────────────────────────────────────────────────────────────

/**
 * A client accepting or declining their own quotation.
 *
 * An RPC rather than an update policy, because the client may change exactly
 * one thing — the answer — and only from `sent`. A policy permissive enough to
 * allow the status change would also allow editing the price they were quoted.
 */
CREATE OR REPLACE FUNCTION respond_to_quotation(
  p_quotation_id UUID,
  p_accept       BOOLEAN,
  p_note         TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job UUID;
BEGIN
  SELECT q.job_id INTO v_job
    FROM quotations q
    JOIN jobs j ON j.id = q.job_id
   WHERE q.id = p_quotation_id
     AND q.status = 'sent'
     AND j.client_id = get_my_client_id();

  IF v_job IS NULL THEN
    RAISE EXCEPTION 'Quotation not found, or it is not awaiting an answer.';
  END IF;

  UPDATE quotations
     SET status        = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END::quotation_status,
         responded_at  = now(),
         response_note = p_note
   WHERE id = p_quotation_id;
END;
$$;

REVOKE ALL ON FUNCTION respond_to_quotation(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION respond_to_quotation(UUID, BOOLEAN, TEXT) TO authenticated;

-- ─── Job status ─────────────────────────────────────────────────────────────

/**
 * Sending a quotation is what makes a job `quoted`.
 *
 * The stage existed in job_status from the start with nothing able to reach it,
 * so jobs sat in `lead` until a contract jumped them to `contracted`.
 * advance_job_status only ever moves forward, so this cannot drag a job that is
 * already further along back to quoting.
 */
CREATE OR REPLACE FUNCTION quotation_marks_job_quoted()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'sent' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'sent') THEN
    PERFORM advance_job_status(NEW.job_id, 'quoted');
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS quotation_sent_marks_job ON quotations;
CREATE TRIGGER quotation_sent_marks_job
  AFTER INSERT OR UPDATE OF status ON quotations
  FOR EACH ROW EXECUTE FUNCTION quotation_marks_job_quoted();

COMMENT ON TABLE quotations IS
  'A priced offer for a job. Not unique per job: revisions are kept, because a '
  'superseded quotation is still what the client was shown.';
