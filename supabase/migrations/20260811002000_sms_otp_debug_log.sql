-- TESTING ONLY — OTP capture table
--
-- While no SMS gateway is live, the send-sms-hook writes each generated code
-- here instead of texting it, so testers can read their code from the Supabase
-- table editor.
--
-- SECURITY: these rows are live login credentials. RLS is enabled with NO
-- policies, so anon and authenticated clients can never read the table — only
-- the service role (dashboard / edge function) can. Do not add a policy.
--
-- BEFORE GO-LIVE: set SMS_PROVIDER to a real gateway and run
--   DROP TABLE IF EXISTS sms_otp_debug;

CREATE TABLE IF NOT EXISTS sms_otp_debug (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      TEXT NOT NULL,
  otp        TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE sms_otp_debug ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: service role only.

CREATE INDEX IF NOT EXISTS sms_otp_debug_recent_idx
  ON sms_otp_debug (created_at DESC);

COMMENT ON TABLE sms_otp_debug IS
  'TESTING ONLY. Live OTP codes. Drop before production go-live.';

-- Keeps the table from growing without bound: each insert clears anything older
-- than an hour, which is well past the OTP expiry anyway.
CREATE OR REPLACE FUNCTION prune_sms_otp_debug()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM sms_otp_debug WHERE created_at < now() - INTERVAL '1 hour';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prune_sms_otp_debug_trigger ON sms_otp_debug;
CREATE TRIGGER prune_sms_otp_debug_trigger
  AFTER INSERT ON sms_otp_debug
  FOR EACH STATEMENT EXECUTE FUNCTION prune_sms_otp_debug();
