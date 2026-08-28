'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type StaffCtx = { studio_id: string; role: string };

async function requireAdmin(): Promise<StaffCtx | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('staff').select('studio_id, role').eq('user_id', user.id).single();
  const s = data as StaffCtx | null;
  if (!s || s.role !== 'admin') return null;
  return s;
}

export async function updateStudioSettings(studioId: string, formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  if (!ctx || ctx.studio_id !== studioId) return;

  const supabase = createClient();
  await supabase.from('studios').update({
    name:    (formData.get('name')    as string).trim(),
    address: (formData.get('address') as string | null)?.trim() || null,
    phone: (formData.get('phone')   as string | null)?.trim() || null,
    portal_url: ((formData.get('portal_url') as string) ?? '').trim() || null,
    email:   (formData.get('email')   as string | null)?.trim() || null,
  }).eq('id', studioId);

  redirect('/settings?saved=1');
}

export async function uploadStudioLogo(studioId: string, formData: FormData): Promise<{ error?: string }> {
  const ctx = await requireAdmin();
  if (!ctx || ctx.studio_id !== studioId) return { error: 'Unauthorized' };

  const file = formData.get('logo') as File | null;
  if (!file || file.size === 0) return { error: 'No file selected.' };
  if (!file.type.startsWith('image/'))  return { error: 'Please select an image file.' };
  if (file.size > 2 * 1024 * 1024)     return { error: 'Image must be under 2 MB.' };

  const admin = createAdminClient();
  const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const path = `${studioId}/logo.${ext}`;
  const buf  = await file.arrayBuffer();

  const { error: upErr } = await admin.storage
    .from('studio-assets')
    .upload(path, buf, { contentType: file.type, upsert: true });

  if (upErr) return { error: upErr.message };

  const { data: urlData } = admin.storage.from('studio-assets').getPublicUrl(path);
  await admin.from('studios').update({ logo_url: urlData.publicUrl }).eq('id', studioId);

  revalidatePath('/settings');
  return {};
}
