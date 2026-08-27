-- Repair and harden client↔auth linking
--
-- Clients were found linked to the wrong auth user (a staff email account), so
-- signing in with the correct mobile number resolved to no client and the portal
-- showed no events.
--
-- The original trigger only claimed rows WHERE user_id IS NULL, so a row that was
-- already linked — correctly or not — could never be corrected.

-- ── Repair existing rows ──────────────────────────────────────
-- The phone number is the source of truth: if an auth user's phone matches the
-- client's, that user owns the record.
UPDATE clients c
   SET user_id = u.id
  FROM auth.users u
 WHERE normalize_phone(c.phone) IS NOT NULL
   AND normalize_phone(u.phone) = normalize_phone(c.phone)
   AND c.user_id IS DISTINCT FROM u.id;

-- Drop links to users whose phone doesn't match and who therefore cannot be the
-- client — e.g. a staff account attached by mistake.
UPDATE clients c
   SET user_id = NULL
 WHERE c.user_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM auth.users u
      WHERE u.id = c.user_id
        AND normalize_phone(u.phone) = normalize_phone(c.phone)
   );

-- ── Harden the trigger ────────────────────────────────────────
CREATE OR REPLACE FUNCTION link_client_to_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NULL OR normalize_phone(NEW.phone) IS NULL THEN
    RETURN NEW;
  END IF;

  -- Claim any client with this number that is unlinked, or linked to an account
  -- whose phone no longer matches (a stale or mistaken link).
  UPDATE clients c
     SET user_id = NEW.id
   WHERE normalize_phone(c.phone) = normalize_phone(NEW.phone)
     AND (
       c.user_id IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM auth.users u
          WHERE u.id = c.user_id
            AND normalize_phone(u.phone) = normalize_phone(c.phone)
       )
     );

  RETURN NEW;
END;
$$;
