'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';

type StaffCtx = { studio_id: string; role: string };

async function requireStaff(): Promise<StaffCtx | null> {
  const supabase = createSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('staff')
    .select('studio_id, role')
    .eq('user_id', user.id)
    .single();
  return data as StaffCtx | null;
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
  redirect('/clients');
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
