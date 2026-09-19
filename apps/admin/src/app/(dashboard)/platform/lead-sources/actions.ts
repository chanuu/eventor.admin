'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { isPlatformAdmin } from '@/lib/platform';

/** The list is shared by every studio, so only the platform may change it. */
export async function createLeadSource(formData: FormData): Promise<{ error?: string } | void> {
  if (!(await isPlatformAdmin())) return { error: 'Not authorised.' };

  const name = ((formData.get('name') as string) ?? '').trim();
  if (!name) return { error: 'Enter a name for the source.' };

  const admin = createAdminClient();

  const { data: clash } = await admin
    .from('lead_sources').select('id').ilike('name', name).maybeSingle();
  if (clash) return { error: `“${name}” is already on the list.` };

  const { data: last } = await admin
    .from('lead_sources').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  const sortOrder = ((last as { sort_order: number }[] | null)?.[0]?.sort_order ?? 0) + 10;

  const { error } = await admin.from('lead_sources').insert({ name, sort_order: sortOrder });
  if (error) return { error: error.message };

  revalidatePath('/platform/lead-sources');
}

export async function toggleLeadSource(id: string, isActive: boolean): Promise<void> {
  if (!(await isPlatformAdmin())) return;

  await createAdminClient().from('lead_sources').update({ is_active: isActive }).eq('id', id);
  revalidatePath('/platform/lead-sources');
}

/**
 * Removes a source from the list. Jobs keep the text they were saved with, so
 * historic reporting is unaffected.
 */
export async function deleteLeadSource(id: string): Promise<void> {
  if (!(await isPlatformAdmin())) return;

  await createAdminClient().from('lead_sources').delete().eq('id', id);
  revalidatePath('/platform/lead-sources');
}
