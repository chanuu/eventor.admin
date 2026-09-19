'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { isPlatformAdmin } from '@/lib/platform';

/** Saves a package: name, price, description and exactly which features it includes. */
export async function savePlan(
  planKey: string,
  formData: FormData,
): Promise<{ error?: string } | void> {
  if (!(await isPlatformAdmin())) return { error: 'Not authorised.' };

  const name = ((formData.get('name') as string) ?? '').trim();
  const description = ((formData.get('description') as string) ?? '').trim() || null;
  const price = Number(formData.get('price_lkr') ?? 0);
  const isActive = formData.get('is_active') === 'on';
  const features = formData.getAll('features') as string[];

  if (!name) return { error: 'A package needs a name.' };
  if (!Number.isFinite(price) || price < 0) return { error: 'Enter a valid monthly price.' };
  if (features.length === 0) return { error: 'Include at least one feature.' };

  const admin = createAdminClient();

  const { error: planErr } = await admin
    .from('plans')
    .update({ name, description, price_lkr: Math.round(price), is_active: isActive })
    .eq('key', planKey);

  if (planErr) return { error: planErr.message };

  // Replace the entitlement set wholesale — simpler and idempotent.
  await admin.from('plan_features').delete().eq('plan_key', planKey);
  const { error: featErr } = await admin
    .from('plan_features')
    .insert(features.map((feature_key) => ({ plan_key: planKey, feature_key })));

  if (featErr) return { error: featErr.message };

  // Entitlements change what every studio on this plan can reach.
  revalidatePath('/', 'layout');
}

export async function createPlan(formData: FormData): Promise<{ error?: string } | void> {
  if (!(await isPlatformAdmin())) return { error: 'Not authorised.' };

  const name = ((formData.get('name') as string) ?? '').trim();
  if (!name) return { error: 'A package needs a name.' };

  const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  if (!key) return { error: 'That name cannot be used as a key.' };

  const admin = createAdminClient();

  const { data: clash } = await admin.from('plans').select('key').eq('key', key).maybeSingle();
  if (clash) return { error: 'A package with a similar name already exists.' };

  const { data: last } = await admin
    .from('plans').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  const sortOrder = ((last as { sort_order: number }[] | null)?.[0]?.sort_order ?? 0) + 10;

  const { error } = await admin.from('plans').insert({
    key,
    name,
    price_lkr: Math.round(Number(formData.get('price_lkr') ?? 0)) || 0,
    description: ((formData.get('description') as string) ?? '').trim() || null,
    sort_order: sortOrder,
    is_active: false,   // starts hidden until its features are set
  });

  if (error) return { error: error.message };

  revalidatePath('/platform/plans');
}
