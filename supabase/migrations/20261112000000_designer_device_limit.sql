-- How many computers a studio may use the album designer on.
--
-- The limit belongs to the plan, so the platform admin can give each plan its own
-- number. NULL means no limit, which every plan starts with: nothing changes for
-- any studio until a number is set.
--
-- The tool identifies a computer by a stable id it derives from the machine, and
-- registers it on every sign-in. A computer already registered always gets in; a
-- new one only while the studio is under its plan's limit. Removing a computer
-- frees its place, and it can be registered again later while there is room.

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS designer_device_limit INT
  CHECK (designer_device_limit IS NULL OR designer_device_limit >= 0);

COMMENT ON COLUMN plans.designer_device_limit IS
  'Computers per studio that may use the album designer. NULL is unlimited.';

CREATE TABLE IF NOT EXISTS designer_devices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id   UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
  device_id   TEXT NOT NULL CHECK (length(device_id) BETWEEN 16 AND 128),
  name        TEXT,
  platform    TEXT,
  first_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Who last signed in on it, so the studio can tell its computers apart.
  last_user   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  removed_at  TIMESTAMPTZ,
  UNIQUE (studio_id, device_id)
);

ALTER TABLE designer_devices ENABLE ROW LEVEL SECURITY;

-- Staff see their own studio's computers. Every write goes through the functions
-- below, so the limit cannot be got around by inserting rows directly.
CREATE POLICY "staff_select_designer_devices" ON designer_devices
  FOR SELECT USING (studio_id = get_my_studio_id());

CREATE POLICY "platform_admin_select_designer_devices" ON designer_devices
  FOR SELECT USING (is_platform_admin());

/**
 * Registers the caller's computer for their studio, or refreshes it if already
 * registered. Returns whether the tool may be used on it, with the count and
 * limit so the tool can explain a refusal.
 */
CREATE OR REPLACE FUNCTION register_designer_device(
  p_device_id TEXT,
  p_name      TEXT DEFAULT NULL,
  p_platform  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_studio UUID;
  v_limit  INT;
  v_used   INT;
  v_row    designer_devices%ROWTYPE;
BEGIN
  SELECT st.studio_id INTO v_studio
    FROM staff st
   WHERE st.user_id = auth.uid() AND st.is_active
   LIMIT 1;
  IF v_studio IS NULL THEN
    RAISE EXCEPTION 'Not a member of a studio' USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF p_device_id IS NULL OR length(p_device_id) NOT BETWEEN 16 AND 128 THEN
    RAISE EXCEPTION 'Invalid device id' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- Two computers signing in at once must not both take the last place.
  PERFORM pg_advisory_xact_lock(hashtext('designer_devices:' || v_studio::TEXT));

  SELECT p.designer_device_limit INTO v_limit
    FROM subscriptions sub JOIN plans p ON p.key = sub.plan_key
   WHERE sub.studio_id = v_studio AND sub.status = 'active'
   LIMIT 1;

  SELECT * INTO v_row
    FROM designer_devices
   WHERE studio_id = v_studio AND device_id = p_device_id;

  SELECT count(*) INTO v_used
    FROM designer_devices
   WHERE studio_id = v_studio AND removed_at IS NULL;

  -- A computer already in use keeps working even if the plan's limit is lowered
  -- below the number registered; only new ones are turned away.
  IF v_row.id IS NULL OR v_row.removed_at IS NOT NULL THEN
    IF v_limit IS NOT NULL AND v_used >= v_limit THEN
      RETURN jsonb_build_object('allowed', FALSE, 'used', v_used, 'limit', v_limit);
    END IF;
    v_used := v_used + 1;
  END IF;

  INSERT INTO designer_devices (studio_id, device_id, name, platform, last_user)
  VALUES (v_studio, p_device_id, left(p_name, 120), left(p_platform, 40), auth.uid())
  ON CONFLICT (studio_id, device_id) DO UPDATE
    SET name       = COALESCE(EXCLUDED.name, designer_devices.name),
        platform   = COALESCE(EXCLUDED.platform, designer_devices.platform),
        last_user  = EXCLUDED.last_user,
        last_seen  = now(),
        removed_at = NULL;

  RETURN jsonb_build_object('allowed', TRUE, 'used', v_used, 'limit', v_limit);
END;
$$;

/** Frees a computer's place. Needs "Manage studio settings". */
CREATE OR REPLACE FUNCTION remove_designer_device(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql VOLATILE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_permission('settings.manage') THEN
    RAISE EXCEPTION 'Not authorised' USING ERRCODE = 'insufficient_privilege';
  END IF;
  UPDATE designer_devices
     SET removed_at = now()
   WHERE id = p_id AND studio_id = get_my_studio_id() AND removed_at IS NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION register_designer_device(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION remove_designer_device(UUID)              FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION register_designer_device(TEXT, TEXT, TEXT) TO authenticated;
GRANT  EXECUTE ON FUNCTION remove_designer_device(UUID)              TO authenticated;
