'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCapabilityCtx } from '@/lib/staff';

/**
 * Switches the studio's plan.
 *
 * No payment provider is wired up yet, so this changes the entitlement directly.
 * When billing goes live this becomes the callback from the provider rather than
 * something the studio can call on its own.
 */
export async function changePlan(planKey: string): Promise<{ error?: string } | void> {
  const ctx = await requireCapabilityCtx('settings.manage');
  if (!ctx) return { error: 'Only someone who can manage studio settings may change the plan.' };

  const admin = createAdminClient();

  const { data: plan } = await admin
    .from('plans')
    .select('key, is_active')
    .eq('key', planKey)
    .maybeSingle();

  if (!plan || !(plan as { is_active: boolean }).is_active) {
    return { error: 'That plan is not available.' };
  }

  const { data: existing } = await admin
    .from('subscriptions')
    .select('id')
    .eq('studio_id', ctx.studio_id)
    .maybeSingle();

  const { error } = existing
    ? await admin
        .from('subscriptions')
        .update({ plan_key: planKey, status: 'active' })
        .eq('id', (existing as { id: string }).id)
    : await admin
        .from('subscriptions')
        .insert({ studio_id: ctx.studio_id, plan: 'basic', status: 'active', plan_key: planKey });

  if (error) return { error: error.message };

  // Entitlements affect the whole app, so refresh everything.
  revalidatePath('/', 'layout');
  redirect('/billing?saved=1');
}
