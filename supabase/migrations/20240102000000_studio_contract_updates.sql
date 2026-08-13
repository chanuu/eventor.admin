-- Add address and email fields to studios (used in contract template)
ALTER TABLE studios ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS email    TEXT;

-- Track when admin sent the contract to the client
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- Storage bucket for studio assets (logo) must be created manually in Supabase dashboard:
-- Name: studio-assets  |  Public: true
