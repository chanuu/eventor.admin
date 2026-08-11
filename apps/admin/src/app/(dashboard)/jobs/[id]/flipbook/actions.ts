'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadToS3, isS3Configured } from '@/lib/s3';

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

  if (!isS3Configured()) return { error: 'Album storage is not configured. Set the AWS_* environment variables.' };

  const file = formData.get('file') as File | null;
  if (!file || file.size === 0) return { error: 'Please select a file.' };

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf';
  // Stable key per flipbook, so re-uploading replaces the album rather than orphaning it.
  const key = `albums/${studioId}/${flipbookId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  let albumUrl: string;
  try {
    albumUrl = await uploadToS3(key, buffer, file.type || 'application/pdf');
  } catch (err) {
    console.error('[uploadFlipbook] S3 upload failed', err);
    return { error: err instanceof Error ? err.message : 'Upload to S3 failed.' };
  }

  const admin = createAdminClient();
  await admin
    .from('flipbooks')
    .update({ storage_path: albumUrl })
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
