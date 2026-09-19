import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Platform administration — operating Eventor itself, rather than a studio.
 *
 * Membership is an explicit allow-list in the database; the cross-tenant
 * functions re-check it themselves, so the UI guard is convenience, not the
 * security boundary.
 */
export const isPlatformAdmin = cache(async (): Promise<boolean> => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  return !!data;
});

export async function requirePlatformAdmin(): Promise<void> {
  if (!(await isPlatformAdmin())) redirect('/dashboard');
}

export type PlatformOverview = {
  studios: number; active_subscriptions: number; staff: number; clients: number;
  jobs: number; shoots: number; galleries: number; photos: number;
  albums: number; published_albums: number; shared_albums: number;
  contracts_signed: number; mrr_lkr: number;
};

export type TenantRow = {
  studio_id: string; name: string; created_at: string;
  plan_key: string | null; plan_name: string | null; price_lkr: number | null; sub_status: string | null;
  staff_count: number; client_count: number; job_count: number;
  album_count: number; published_album_count: number; photo_count: number;
  last_job_at: string | null;
};
