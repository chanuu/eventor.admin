'use server';

import { requireCapabilityCtx } from '@/lib/staff';
import type { Capability } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';

type StaffCtx = { studio_id: string; role: string };

async function requireStaff(capability: Capability = 'clients.manage'): Promise<StaffCtx | null> {
  const ctx = await requireCapabilityCtx(capability);
  return ctx ? { studio_id: ctx.studio_id, role: ctx.roleName } : null;
}

export async function createClient(formData: FormData) {
  const ctx = await requireStaff();
  if (!ctx) return { error: 'Unauthorized.' };

  const supabase = createSupabaseClient();
  const { error } = await supabase.from('clients').insert({
    studio_id: ctx.studio_id,
    full_name: (formData.get('full_name') as string).trim(),
    email: (formData.get('email') as string).trim() || null,
    phone: (formData.get('phone') as string).trim() || null,
    notes: (formData.get('notes') as string).trim() || null,
  });

  if (error) return { error: error.message };

  revalidatePath('/clients');
  redirect('/clients?created=1');
}

export async function updateClient(id: string, studioId: string, formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const supabase = createSupabaseClient();
  await supabase
    .from('clients')
    .update({
      full_name: (formData.get('full_name') as string).trim(),
      email: (formData.get('email') as string).trim() || null,
      phone: (formData.get('phone') as string).trim() || null,
      notes: (formData.get('notes') as string).trim() || null,
    })
    .eq('id', id)
    .eq('studio_id', ctx.studio_id);

  revalidatePath('/clients');
  redirect(`/clients/${id}/edit?saved=1`);
}
