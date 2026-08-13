import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@eventor/types';

export function createClient(supabaseUrl: string, supabaseAnonKey: string) {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
