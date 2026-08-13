-- Client portal login by mobile OTP
--
-- Clients sign in with their mobile number and a one-time SMS code. Supabase
-- creates the auth.users row on first verification; this migration links that
-- row to the matching clients record so RLS (get_my_client_id) resolves.
--
-- Phone numbers are entered by studios in local format (0771234567) while
-- Supabase stores E.164 (+94771234567), so all matching is done on the last 9
-- significant digits.

-- ── Normalisation ─────────────────────────────────────────────
-- Strips everything but digits and keeps the last 9, which is the subscriber
-- number for Sri Lankan mobiles regardless of 0-prefix or +94 country code.
CREATE OR REPLACE FUNCTION normalize_phone(raw TEXT)
RETURNS TEXT
LANGUAGE sql IMMUTABLE
AS $$
  SELECT NULLIF(RIGHT(REGEXP_REPLACE(COALESCE(raw, ''), '\D', '', 'g'), 9), '');
$$;

-- Matching clients.phone quickly during login and linking.
CREATE INDEX IF NOT EXISTS clients_normalized_phone_idx
  ON clients (normalize_phone(phone));

-- ── Auto-link on first sign-in ────────────────────────────────
-- Runs after Supabase creates or confirms a phone user. Claims only client rows
-- that are not already linked to someone else.
CREATE OR REPLACE FUNCTION link_client_to_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NULL OR normalize_phone(NEW.phone) IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE clients
     SET user_id = NEW.id
   WHERE user_id IS NULL
     AND normalize_phone(phone) = normalize_phone(NEW.phone);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_link_client ON auth.users;
CREATE TRIGGER on_auth_user_created_link_client
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION link_client_to_auth_user();

-- A phone user may be created before the number is confirmed, so re-run when
-- the phone column is populated or changed.
DROP TRIGGER IF EXISTS on_auth_user_phone_changed_link_client ON auth.users;
CREATE TRIGGER on_auth_user_phone_changed_link_client
  AFTER UPDATE OF phone ON auth.users
  FOR EACH ROW
  WHEN (NEW.phone IS DISTINCT FROM OLD.phone)
  EXECUTE FUNCTION link_client_to_auth_user();

-- ── Backfill ──────────────────────────────────────────────────
-- Link any client whose number already belongs to an existing auth user.
UPDATE clients c
   SET user_id = u.id
  FROM auth.users u
 WHERE c.user_id IS NULL
   AND u.phone IS NOT NULL
   AND normalize_phone(c.phone) = normalize_phone(u.phone);

-- ── Pre-flight check for the login screen ─────────────────────
-- Lets the portal confirm a number belongs to a client BEFORE asking Supabase to
-- send an SMS, so unknown numbers never cost an SMS or create a stray account.
-- Returns a boolean only — never client data.
CREATE OR REPLACE FUNCTION client_phone_exists(raw_phone TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM clients
     WHERE normalize_phone(phone) = normalize_phone(raw_phone)
       AND normalize_phone(raw_phone) IS NOT NULL
  );
$$;

GRANT EXECUTE ON FUNCTION client_phone_exists(TEXT) TO anon, authenticated;
