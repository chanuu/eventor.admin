'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import sharp from 'sharp';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const MAX_DIMENSION = 1920;
const JPEG_QUALITY  = 82;

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

export async function createGallery(jobId: string, studioId: string, formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const title = (formData.get('title') as string)?.trim();
  if (!title) return;

  const shootId = (formData.get('shoot_id') as string) || null;
  const deadlineRaw = formData.get('selection_deadline') as string;
  const selectionDeadline = deadlineRaw ? new Date(deadlineRaw).toISOString() : null;

  const admin = createAdminClient();
  const { data } = await admin
    .from('galleries')
    .insert({ job_id: jobId, shoot_id: shootId || null, title, selection_deadline: selectionDeadline })
    .select('id')
    .single();

  revalidatePath(`/jobs/${jobId}/gallery`);
  redirect(`/jobs/${jobId}/gallery/${(data as { id: string } | null)?.id ?? ''}`);
}

export async function uploadPhotos(
  galleryId: string,
  jobId: string,
  studioId: string,
  formData: FormData,
): Promise<{ error?: string; uploaded: number }> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return { error: 'Unauthorized.', uploaded: 0 };

  const files = formData.getAll('files') as File[];
  const validFiles = files.filter((f) => f.size > 0);
  if (!validFiles.length) return { error: 'Please select at least one image.', uploaded: 0 };

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from('gallery_photos')
    .select('sort_order')
    .eq('gallery_id', galleryId)
    .order('sort_order', { ascending: false })
    .limit(1);

  let sortOrder = ((existing as { sort_order: number }[] | null)?.[0]?.sort_order ?? -1) + 1;
  let uploaded = 0;

  for (const file of validFiles) {
    const rawBuffer = Buffer.from(await file.arrayBuffer());

    // Resize to max 1920px on the longest side and compress to JPEG
    let compressed: Buffer;
    try {
      compressed = await sharp(rawBuffer)
        .rotate()                          // honour EXIF orientation
        .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
        .toBuffer();
    } catch {
      continue; // skip non-image or corrupt files
    }

    const uniqueName = `${randomUUID()}.jpg`;
    const storagePath = `${studioId}/${galleryId}/${uniqueName}`;

    const { error: upErr } = await admin.storage
      .from('gallery-photos')
      .upload(storagePath, compressed, { contentType: 'image/jpeg' });

    if (upErr) continue;

    await admin.from('gallery_photos').insert({
      studio_id: studioId,
      gallery_id: galleryId,
      storage_path: storagePath,
      file_name: file.name,
      sort_order: sortOrder++,
    });

    uploaded++;
  }

  revalidatePath(`/jobs/${jobId}/gallery/${galleryId}`);
  return { uploaded };
}

export async function deletePhoto(
  photoId: string,
  storagePath: string,
  galleryId: string,
  jobId: string,
  studioId: string,
): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const admin = createAdminClient();
  await admin.storage.from('gallery-photos').remove([storagePath]);
  await admin.from('gallery_photos').delete().eq('id', photoId).eq('gallery_id', galleryId);

  revalidatePath(`/jobs/${jobId}/gallery/${galleryId}`);
}

export async function updateGalleryStatus(
  galleryId: string,
  jobId: string,
  studioId: string,
  status: string,
): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const admin = createAdminClient();
  await admin.from('galleries').update({ status }).eq('id', galleryId);

  revalidatePath(`/jobs/${jobId}/gallery/${galleryId}`);
  redirect(`/jobs/${jobId}/gallery/${galleryId}`);
}

export async function updateGallery(
  galleryId: string,
  jobId: string,
  studioId: string,
  formData: FormData,
): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const title = (formData.get('title') as string)?.trim();
  const deadlineRaw = formData.get('selection_deadline') as string;
  const selectionDeadline = deadlineRaw ? new Date(deadlineRaw).toISOString() : null;

  const admin = createAdminClient();
  await admin
    .from('galleries')
    .update({ title, selection_deadline: selectionDeadline })
    .eq('id', galleryId);

  revalidatePath(`/jobs/${jobId}/gallery/${galleryId}`);
  redirect(`/jobs/${jobId}/gallery/${galleryId}?saved=1`);
}
