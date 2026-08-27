-- Per-studio agreement terms
--
-- The agreement document is generated from a template. Its clauses were baked
-- into the app, so a studio could not change its own terms without a code
-- change. These columns hold the editable parts; everything else (letterhead,
-- details table, signature block) is still generated.
--
-- NULL means "use the built-in defaults", so existing studios are unaffected.

ALTER TABLE studios
  ADD COLUMN IF NOT EXISTS agreement_intro TEXT,
  ADD COLUMN IF NOT EXISTS agreement_terms TEXT;

COMMENT ON COLUMN studios.agreement_intro IS
  'Optional paragraph shown above the terms. NULL = omit.';
COMMENT ON COLUMN studios.agreement_terms IS
  'Agreement clauses, one per line, rendered as a numbered list. NULL = built-in defaults.';
