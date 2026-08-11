'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import sharp from 'sharp';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadToS3, deleteFromS3, isS3Url, isS3Configured } from '@/lib/s3';

/** Hard ceiling for a stored proofing photo. */
const MAX_STORED_BYTES = 2 * 1024 * 1024; // 2 MB
/** Largest original we will accept from the browser, before compression. */
const MAX_UPLOAD_BYTES = 40 * 1024 * 1024; // 40 MB

/**
 * Compression ladder. We start at full proofing quality and only step down if the
 * result is still over 2 MB, so ordinary photos keep their quality and only the
 * very large ones get reduced.
 */
const COMPRESSION_STEPS = [
  { dimension: 1920, quality: 82 },
  { dimension: 1920, quality: 72 },
  { dimension: 1600, quality: 68 },
  { dimension: 1400, quality: 62 },
  { dimension: 1200, quality: 55 },
] as const;

/**
 * Resizes and compresses to JPEG, stepping the ladder down until the output fits
 * under MAX_STORED_BYTES. Returns null if the buffer isn't a readable image.
 */
async function compressWithinLimit(raw: Buffer): Promise<Buffer | null> {
  let smallest: Buffer | null = null;

  for (const { dimension, quality } of COMPRESSION_STEPS) {
    let out: Buffer;
    try {
      out = await sharp(raw)
        .rotate()                        // honour EXIF orientation
        .resize(dimension, dimension, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
    } catch {
      return null;                       // not an image, or corrupt
    }
    if (out.byteLength <= MAX_STORED_BYTES) return out;
    if (!smallest || out.byteLength < smallest.byteLength) smallest = out;
  }

  // Every step was still over the limit — keep the smallest we produced.
  return smallest;
}

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

  if (!isS3Configured()) return { error: 'Photo storage is not configured. Set the AWS_* environment variables.', uploaded: 0 };

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
  let uploadError = '';

  const skipped: string[] = [];

  for (const file of validFiles) {
    if (file.type && !file.type.startsWith('image/')) {
      skipped.push(`${file.name} is not an image`);
      continue;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      skipped.push(`${file.name} is over ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB`);
      continue;
    }

    const rawBuffer = Buffer.from(await file.arrayBuffer());

    const compressed = await compressWithinLimit(rawBuffer);
    if (!compressed) {
      skipped.push(`${file.name} could not be read as an image`);
      continue;
    }

    const key = `galleries/${studioId}/${galleryId}/${randomUUID()}.jpg`;

    // Photos live in S3; Supabase stores only the resulting public URL.
    let photoUrl: string;
    try {
      photoUrl = await uploadToS3(key, compressed, 'image/jpeg');
    } catch (err) {
      console.error('[uploadPhotos] S3 upload failed', err);
      uploadError = err instanceof Error ? err.message : 'Upload to S3 failed.';
      continue;
    }

    await admin.from('gallery_photos').insert({
      studio_id: studioId,
      gallery_id: galleryId,
      storage_path: photoUrl,
      file_name: file.name,
      sort_order: sortOrder++,
    });

    uploaded++;
  }

  revalidatePath(`/jobs/${jobId}/gallery/${galleryId}`);

  if (uploaded === 0) {
    return { error: uploadError || skipped.join('; ') || 'No images could be processed.', uploaded: 0 };
  }
  // Some succeeded — report the rest so nothing disappears silently.
  return skipped.length ? { uploaded, error: `Skipped: ${skipped.join('; ')}` } : { uploaded };
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
  // New photos are S3 URLs; older rows are still Supabase storage paths.
  if (isS3Url(storagePath)) {
    await deleteFromS3(storagePath);
  } else {
    await admin.storage.from('gallery-photos').remove([storagePath]);
  }
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
