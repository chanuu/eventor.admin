'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

type StaffCtx = { studio_id: string; role: string };

async function requireStaff(allowed = ['admin', 'editor']): Promise<StaffCtx | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from('staff')
    .select('studio_id, role')
    .eq('user_id', user.id)
    .single();
  const staff = data as StaffCtx | null;
  if (!staff || !allowed.includes(staff.role)) return null;
  return staff;
}

export async function ensureFlipbook(jobId: string, studioId: string): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const admin = createAdminClient();

  // Upsert — insert only if no flipbook exists for this job
  const { data: existing } = await admin
    .from('flipbooks')
    .select('id')
    .eq('job_id', jobId)
    .maybeSingle();

  if (!existing) {
    await admin.from('flipbooks').insert({ job_id: jobId, studio_id: studioId });
  }

  revalidatePath(`/jobs/${jobId}/flipbook`);
  redirect(`/jobs/${jobId}/flipbook`);
}

export async function uploadFlipbook(
  flipbookId: string,
  jobId: string,
  studioId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return { error: 'Unauthorized.' };

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return { error: 'Please select a file.' };

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf';
  const storagePath = `${studioId}/${flipbookId}.${ext}`;
  const buffer = await file.arrayBuffer();

  const admin = createAdminClient();

  const { error: uploadErr } = await admin.storage
    .from('flipbooks')
    .upload(storagePath, buffer, { contentType: file.type || 'application/pdf', upsert: true });

  if (uploadErr) return { error: uploadErr.message };

  await admin
    .from('flipbooks')
    .update({ storage_path: storagePath })
    .eq('id', flipbookId)
    .eq('studio_id', studioId);

  revalidatePath(`/jobs/${jobId}/flipbook`);
  return {};
}

export async function publishFlipbook(flipbookId: string, jobId: string, studioId: string): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const admin = createAdminClient();
  await admin
    .from('flipbooks')
    .update({ published_at: new Date().toISOString() })
    .eq('id', flipbookId)
    .eq('studio_id', studioId);

  revalidatePath(`/jobs/${jobId}/flipbook`);
}

export async function unpublishFlipbook(flipbookId: string, jobId: string, studioId: string): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const admin = createAdminClient();
  await admin
    .from('flipbooks')
    .update({ published_at: null })
    .eq('id', flipbookId)
    .eq('studio_id', studioId);

  revalidatePath(`/jobs/${jobId}/flipbook`);
}
