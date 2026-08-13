import { createClient } from '@supabase/supabase-js';

// Service-role client — bypasses RLS. Server-side only. Never expose to client.
// Intentionally untyped: admin ops are explicit server actions; DB generic
// causes `never` inference due to strict Supabase v2 constraint matching.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
