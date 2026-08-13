-- No extensions required — gen_random_uuid() and uuid_send() are built-in

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE subscription_plan   AS ENUM ('basic', 'pro');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'cancelled');
CREATE TYPE staff_role          AS ENUM ('admin', 'editor', 'sales', 'coordinator');
CREATE TYPE job_status          AS ENUM ('lead','quoted','contracted','active','editing','proofing','delivered','archived');
CREATE TYPE shoot_status        AS ENUM ('scheduled', 'shot', 'editing', 'done');
CREATE TYPE gallery_mode        AS ENUM ('combined', 'separate');
CREATE TYPE contract_status     AS ENUM ('draft', 'sent', 'signed', 'void');
CREATE TYPE payment_type        AS ENUM ('advance', 'balance', 'addon', 'refund');
CREATE TYPE payment_method      AS ENUM ('cash', 'bank', 'payhere', 'cheque');
CREATE TYPE payment_status      AS ENUM ('pending', 'paid');
CREATE TYPE gallery_status      AS ENUM ('hidden', 'proofing', 'approved');
CREATE TYPE notif_recipient     AS ENUM ('staff', 'client');
CREATE TYPE notif_channel       AS ENUM ('email', 'sms');

-- ============================================================
-- TABLES  (dependency order)
-- ============================================================

-- 1. Studios — one row per tenant
CREATE TABLE studios (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  slug                TEXT UNIQUE NOT NULL,
  logo_url            TEXT,
  primary_color       TEXT NOT NULL DEFAULT '#2563eb',
  phone               TEXT,
  subscription_status subscription_status NOT NULL DEFAULT 'active',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Subscriptions
CREATE TABLE subscriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id           UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  plan                subscription_plan   NOT NULL DEFAULT 'basic',
  status              subscription_status NOT NULL DEFAULT 'active',
  current_period_end  TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Staff  (email/password users)
CREATE TABLE staff (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id  UUID NOT NULL REFERENCES studios(id)    ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       staff_role NOT NULL DEFAULT 'coordinator',
  full_name  TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (studio_id, user_id)
);

-- 4. Clients  (magic-link users)
CREATE TABLE clients (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id  UUID NOT NULL REFERENCES studios(id)    ON DELETE CASCADE,
  user_id    UUID          REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name  TEXT NOT NULL,
  phone      TEXT,
  email      TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Packages
CREATE TABLE packages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id        UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  base_price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  shoots_included  INT NOT NULL DEFAULT 1,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Package add-ons  (menu of options — price frozen at job booking)
CREATE TABLE package_addons (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id  UUID NOT NULL REFERENCES studios(id)   ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES packages(id)  ON DELETE CASCADE,
  name       TEXT NOT NULL,
  description TEXT,
  price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Jobs  (business unit — price, contract, payments live here)
CREATE TABLE jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id   UUID NOT NULL REFERENCES studios(id)  ON DELETE CASCADE,
  client_id   UUID NOT NULL REFERENCES clients(id)  ON DELETE RESTRICT,
  package_id  UUID          REFERENCES packages(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  event_type  TEXT,
  status      job_status NOT NULL DEFAULT 'lead',
  total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Job add-ons  (what was actually booked; price frozen)
CREATE TABLE job_addons (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id        UUID NOT NULL REFERENCES studios(id)       ON DELETE CASCADE,
  job_id           UUID NOT NULL REFERENCES jobs(id)          ON DELETE CASCADE,
  addon_id         UUID NOT NULL REFERENCES package_addons(id) ON DELETE RESTRICT,
  price_at_booking NUMERIC(12,2) NOT NULL,
  quantity         INT NOT NULL DEFAULT 1,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Shoots  (operational unit — date, venue, staff, gallery live here)
CREATE TABLE shoots (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID NOT NULL REFERENCES jobs(id)    ON DELETE CASCADE,
  studio_id    UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  shoot_type   TEXT,
  scheduled_at TIMESTAMPTZ,
  venue        TEXT,
  status       shoot_status NOT NULL DEFAULT 'scheduled',
  gallery_mode gallery_mode NOT NULL DEFAULT 'separate',
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Shoot staff assignments
CREATE TABLE shoot_staff (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id     UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  shoot_id      UUID NOT NULL REFERENCES shoots(id)  ON DELETE CASCADE,
  staff_id      UUID NOT NULL REFERENCES staff(id)   ON DELETE CASCADE,
  role_in_shoot TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shoot_id, staff_id)
);

-- 11. Contracts  (one per job)
CREATE TABLE contracts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id         UUID UNIQUE NOT NULL REFERENCES jobs(id)    ON DELETE CASCADE,
  studio_id      UUID NOT NULL        REFERENCES studios(id) ON DELETE CASCADE,
  content_html   TEXT,
  signed_at      TIMESTAMPTZ,
  signature_data TEXT,
  status         contract_status NOT NULL DEFAULT 'draft',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. Payments
CREATE TABLE payments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id     UUID NOT NULL REFERENCES jobs(id)    ON DELETE CASCADE,
  studio_id  UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  type       payment_type   NOT NULL,
  amount     NUMERIC(12,2)  NOT NULL,
  method     payment_method NOT NULL DEFAULT 'cash',
  status     payment_status NOT NULL DEFAULT 'pending',
  paid_at    TIMESTAMPTZ,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. Galleries
CREATE TABLE galleries (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shoot_id           UUID REFERENCES shoots(id) ON DELETE CASCADE,
  job_id             UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  title              TEXT NOT NULL,
  status             gallery_status NOT NULL DEFAULT 'hidden',
  selection_deadline TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. Gallery photos
CREATE TABLE gallery_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id    UUID NOT NULL REFERENCES studios(id)   ON DELETE CASCADE,
  gallery_id   UUID NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  sort_order   INT NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  is_selected  BOOLEAN NOT NULL DEFAULT FALSE,
  selected_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 15. Flipbooks  (one per job; shared via random token)
CREATE TABLE flipbooks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id       UUID UNIQUE NOT NULL REFERENCES jobs(id)    ON DELETE CASCADE,
  studio_id    UUID NOT NULL        REFERENCES studios(id) ON DELETE CASCADE,
  storage_path TEXT,
  share_token  TEXT UNIQUE NOT NULL DEFAULT encode(uuid_send(gen_random_uuid()), 'hex'),
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 16. Notifications  (audit log of sent emails / SMS)
CREATE TABLE notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id      UUID NOT NULL REFERENCES studios(id)    ON DELETE CASCADE,
  job_id         UUID          REFERENCES jobs(id)       ON DELETE SET NULL,
  recipient_type notif_recipient NOT NULL,
  channel        notif_channel   NOT NULL,
  subject        TEXT,
  body           TEXT,
  sent_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX ON subscriptions  (studio_id);
CREATE INDEX ON staff          (studio_id);
CREATE INDEX ON staff          (user_id);
CREATE INDEX ON clients        (studio_id);
CREATE INDEX ON clients        (user_id);
CREATE INDEX ON packages       (studio_id);
CREATE INDEX ON package_addons (studio_id);
CREATE INDEX ON package_addons (package_id);
CREATE INDEX ON jobs           (studio_id);
CREATE INDEX ON jobs           (client_id);
CREATE INDEX ON jobs           (status);
CREATE INDEX ON job_addons     (studio_id);
CREATE INDEX ON job_addons     (job_id);
CREATE INDEX ON shoots         (studio_id);
CREATE INDEX ON shoots         (job_id);
CREATE INDEX ON shoots         (scheduled_at);
CREATE INDEX ON shoot_staff    (studio_id);
CREATE INDEX ON shoot_staff    (shoot_id);
CREATE INDEX ON contracts      (studio_id);
CREATE INDEX ON payments       (studio_id);
CREATE INDEX ON payments       (job_id);
CREATE INDEX ON galleries      (job_id);
CREATE INDEX ON gallery_photos (studio_id);
CREATE INDEX ON gallery_photos (gallery_id);
CREATE INDEX ON flipbooks      (studio_id);
CREATE INDEX ON flipbooks      (share_token);
CREATE INDEX ON notifications  (studio_id);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE studios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff          ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages       ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_addons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shoots         ENABLE ROW LEVEL SECURITY;
ALTER TABLE shoot_staff    ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE galleries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE flipbooks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS HELPER FUNCTIONS  (SECURITY DEFINER bypasses RLS so
--   these can query the staff/clients tables without recursion)
-- ============================================================

-- Returns studio_id for the authenticated staff member (NULL if not staff)
CREATE OR REPLACE FUNCTION get_my_studio_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT studio_id FROM staff
  WHERE user_id = auth.uid() AND is_active = TRUE
  LIMIT 1;
$$;

-- Returns the role of the authenticated staff member
CREATE OR REPLACE FUNCTION get_my_staff_role()
RETURNS staff_role
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM staff
  WHERE user_id = auth.uid() AND is_active = TRUE
  LIMIT 1;
$$;

-- Returns the clients.id for the authenticated client user
CREATE OR REPLACE FUNCTION get_my_client_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM clients
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Returns studio_id for the authenticated client user
CREATE OR REPLACE FUNCTION get_my_client_studio_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT studio_id FROM clients
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- ── studios ──────────────────────────────────────────────────
CREATE POLICY "staff_select_studio" ON studios
  FOR SELECT USING (id = get_my_studio_id());

CREATE POLICY "admin_update_studio" ON studios
  FOR UPDATE USING (id = get_my_studio_id() AND get_my_staff_role() = 'admin');

-- ── subscriptions ─────────────────────────────────────────────
CREATE POLICY "staff_select_subscription" ON subscriptions
  FOR SELECT USING (studio_id = get_my_studio_id());

CREATE POLICY "admin_all_subscription" ON subscriptions
  FOR ALL USING (studio_id = get_my_studio_id() AND get_my_staff_role() = 'admin');

-- ── staff ─────────────────────────────────────────────────────
-- Own record (needed so middleware can read it before get_my_studio_id is warm)
CREATE POLICY "staff_select_own" ON staff
  FOR SELECT USING (user_id = auth.uid());

-- All staff in same studio can read each other
CREATE POLICY "staff_select_same_studio" ON staff
  FOR SELECT USING (studio_id = get_my_studio_id());

-- Only admin can insert / update / delete staff
CREATE POLICY "admin_all_staff" ON staff
  FOR ALL USING (studio_id = get_my_studio_id() AND get_my_staff_role() = 'admin');

-- ── clients ───────────────────────────────────────────────────
CREATE POLICY "staff_all_clients" ON clients
  FOR ALL USING (studio_id = get_my_studio_id());

CREATE POLICY "client_select_own" ON clients
  FOR SELECT USING (user_id = auth.uid());

-- ── packages ──────────────────────────────────────────────────
CREATE POLICY "staff_select_packages" ON packages
  FOR SELECT USING (studio_id = get_my_studio_id());

CREATE POLICY "admin_sales_all_packages" ON packages
  FOR ALL USING (
    studio_id = get_my_studio_id()
    AND get_my_staff_role() IN ('admin', 'sales')
  );

CREATE POLICY "client_select_active_packages" ON packages
  FOR SELECT USING (
    is_active = TRUE AND studio_id = get_my_client_studio_id()
  );

-- ── package_addons ────────────────────────────────────────────
CREATE POLICY "staff_select_addons" ON package_addons
  FOR SELECT USING (studio_id = get_my_studio_id());

CREATE POLICY "admin_sales_all_addons" ON package_addons
  FOR ALL USING (
    studio_id = get_my_studio_id()
    AND get_my_staff_role() IN ('admin', 'sales')
  );

CREATE POLICY "client_select_active_addons" ON package_addons
  FOR SELECT USING (
    is_active = TRUE AND studio_id = get_my_client_studio_id()
  );

-- ── jobs ──────────────────────────────────────────────────────
CREATE POLICY "staff_select_jobs" ON jobs
  FOR SELECT USING (studio_id = get_my_studio_id());

CREATE POLICY "staff_write_jobs" ON jobs
  FOR ALL USING (
    studio_id = get_my_studio_id()
    AND get_my_staff_role() IN ('admin', 'sales', 'coordinator')
  );

CREATE POLICY "client_select_own_jobs" ON jobs
  FOR SELECT USING (client_id = get_my_client_id());

-- ── job_addons ────────────────────────────────────────────────
CREATE POLICY "staff_select_job_addons" ON job_addons
  FOR SELECT USING (studio_id = get_my_studio_id());

CREATE POLICY "staff_write_job_addons" ON job_addons
  FOR ALL USING (
    studio_id = get_my_studio_id()
    AND get_my_staff_role() IN ('admin', 'sales', 'coordinator')
  );

CREATE POLICY "client_select_own_job_addons" ON job_addons
  FOR SELECT USING (
    job_id IN (SELECT id FROM jobs WHERE client_id = get_my_client_id())
  );

-- ── shoots ────────────────────────────────────────────────────
CREATE POLICY "staff_select_shoots" ON shoots
  FOR SELECT USING (studio_id = get_my_studio_id());

CREATE POLICY "staff_write_shoots" ON shoots
  FOR ALL USING (
    studio_id = get_my_studio_id()
    AND get_my_staff_role() IN ('admin', 'coordinator', 'editor')
  );

CREATE POLICY "client_select_own_shoots" ON shoots
  FOR SELECT USING (
    job_id IN (SELECT id FROM jobs WHERE client_id = get_my_client_id())
  );

-- ── shoot_staff ───────────────────────────────────────────────
CREATE POLICY "staff_select_shoot_staff" ON shoot_staff
  FOR SELECT USING (studio_id = get_my_studio_id());

CREATE POLICY "admin_coordinator_write_shoot_staff" ON shoot_staff
  FOR ALL USING (
    studio_id = get_my_studio_id()
    AND get_my_staff_role() IN ('admin', 'coordinator')
  );

-- ── contracts ─────────────────────────────────────────────────
CREATE POLICY "staff_select_contracts" ON contracts
  FOR SELECT USING (studio_id = get_my_studio_id());

CREATE POLICY "admin_sales_write_contracts" ON contracts
  FOR ALL USING (
    studio_id = get_my_studio_id()
    AND get_my_staff_role() IN ('admin', 'sales')
  );

CREATE POLICY "client_select_own_contracts" ON contracts
  FOR SELECT USING (
    job_id IN (SELECT id FROM jobs WHERE client_id = get_my_client_id())
  );

-- Client signs their own contract (status must be 'sent')
CREATE POLICY "client_sign_contract" ON contracts
  FOR UPDATE USING (
    status = 'sent'
    AND job_id IN (SELECT id FROM jobs WHERE client_id = get_my_client_id())
  )
  WITH CHECK (status = 'signed');

-- ── payments ──────────────────────────────────────────────────
CREATE POLICY "staff_select_payments" ON payments
  FOR SELECT USING (studio_id = get_my_studio_id());

CREATE POLICY "admin_sales_write_payments" ON payments
  FOR ALL USING (
    studio_id = get_my_studio_id()
    AND get_my_staff_role() IN ('admin', 'sales')
  );

CREATE POLICY "client_select_own_payments" ON payments
  FOR SELECT USING (
    job_id IN (SELECT id FROM jobs WHERE client_id = get_my_client_id())
  );

-- ── galleries ─────────────────────────────────────────────────
CREATE POLICY "staff_all_galleries" ON galleries
  FOR ALL USING (
    job_id IN (SELECT id FROM jobs WHERE studio_id = get_my_studio_id())
  );

CREATE POLICY "client_select_visible_galleries" ON galleries
  FOR SELECT USING (
    status <> 'hidden'
    AND job_id IN (SELECT id FROM jobs WHERE client_id = get_my_client_id())
  );

-- ── gallery_photos ────────────────────────────────────────────
CREATE POLICY "staff_all_gallery_photos" ON gallery_photos
  FOR ALL USING (studio_id = get_my_studio_id());

CREATE POLICY "client_select_gallery_photos" ON gallery_photos
  FOR SELECT USING (
    is_active = TRUE
    AND gallery_id IN (
      SELECT g.id FROM galleries g
      JOIN jobs j ON j.id = g.job_id
      WHERE j.client_id = get_my_client_id() AND g.status <> 'hidden'
    )
  );

-- Client selects photos during proofing
CREATE POLICY "client_select_photos_update" ON gallery_photos
  FOR UPDATE USING (
    is_active = TRUE
    AND gallery_id IN (
      SELECT g.id FROM galleries g
      JOIN jobs j ON j.id = g.job_id
      WHERE j.client_id = get_my_client_id() AND g.status = 'proofing'
    )
  )
  WITH CHECK (TRUE);

-- ── flipbooks ─────────────────────────────────────────────────
CREATE POLICY "staff_all_flipbooks" ON flipbooks
  FOR ALL USING (studio_id = get_my_studio_id());

CREATE POLICY "client_select_own_flipbooks" ON flipbooks
  FOR SELECT USING (
    job_id IN (SELECT id FROM jobs WHERE client_id = get_my_client_id())
  );

-- Public: anyone with the share_token URL can view published flipbooks
CREATE POLICY "public_read_published_flipbooks" ON flipbooks
  FOR SELECT TO anon
  USING (published_at IS NOT NULL);

-- ── notifications ─────────────────────────────────────────────
CREATE POLICY "staff_select_notifications" ON notifications
  FOR SELECT USING (studio_id = get_my_studio_id());

CREATE POLICY "admin_coordinator_write_notifications" ON notifications
  FOR ALL USING (
    studio_id = get_my_studio_id()
    AND get_my_staff_role() IN ('admin', 'coordinator')
  );
