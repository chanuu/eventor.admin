'use server';

import { requireCapabilityCtx } from '@/lib/staff';
import type { Capability } from '@/lib/permissions';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteFromS3, isS3Url, isS3Configured, presignUpload, keyFromUrl } from '@/lib/s3';

/** Most photos a single presign/record call will handle; the client chunks. */
const MAX_BATCH = 200;

type StaffCtx = { studio_id: string; role: string };

async function requireStaff(capability: Capability = 'gallery.manage'): Promise<StaffCtx | null> {
  const ctx = await requireCapabilityCtx(capability);
  return ctx ? { studio_id: ctx.studio_id, role: ctx.roleName } : null;
}

/**
 * Confirms a gallery belongs to the caller's studio.
 *
 * Note this matches on jobs.studio_id rather than trusting the row to be
 * visible: the public_read_* policies deliberately expose shared galleries and
 * photos to everyone, so "RLS let me read it" does not mean "it is mine".
 * galleries carries no studio_id of its own, hence the join through jobs.
 */
async function ownsGallery(
  supabase: ReturnType<typeof createClient>,
  galleryId: string,
  studioId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('galleries')
    .select('id, jobs!inner(studio_id)')
    .eq('id', galleryId)
    .eq('jobs.studio_id', studioId)
    .maybeSingle();
  return !!data;
}

export async function createGallery(jobId: string, studioId: string, formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const title = (formData.get('title') as string)?.trim();
  if (!title) return;

  const shootId = (formData.get('shoot_id') as string) || null;
  const deadlineRaw = formData.get('selection_deadline') as string;
  const selectionDeadline = deadlineRaw ? new Date(deadlineRaw).toISOString() : null;

  const supabase = createClient();
  const { data } = await supabase
    .from('galleries')
    .insert({ job_id: jobId, shoot_id: shootId || null, title, selection_deadline: selectionDeadline })
    .select('id')
    .single();

  revalidatePath(`/jobs/${jobId}/gallery`);
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}/gallery/${(data as { id: string } | null)?.id ?? ''}`);
}

export type UploadTicket = {
  fullUploadUrl: string;
  fullPublicUrl: string;
  thumbUploadUrl: string;
  thumbPublicUrl: string;
};

/**
 * Issues presigned PUT URLs so the browser can upload straight to S3.
 *
 * Nothing but the ticket list crosses this function, which is the point: the
 * previous design streamed every file through a server action and could not
 * survive a large proofing set.
 */
export async function createUploadTickets(
  galleryId: string,
  jobId: string,
  studioId: string,
  count: number,
): Promise<{ error?: string; tickets: UploadTicket[] }> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return { error: 'Unauthorized.', tickets: [] };
  if (!isS3Configured()) {
    return { error: 'Photo storage is not configured. Set the S3_* environment variables.', tickets: [] };
  }
  if (!Number.isInteger(count) || count < 1) return { error: 'Nothing to upload.', tickets: [] };
  if (count > MAX_BATCH) {
    return { error: `Please upload at most ${MAX_BATCH} photos at a time.`, tickets: [] };
  }

  const supabase = createClient();
  if (!(await ownsGallery(supabase, galleryId, ctx.studio_id))) {
    return { error: 'Gallery not found.', tickets: [] };
  }

  try {
    const tickets = await Promise.all(
      Array.from({ length: count }, async () => {
        // One id per photo, so the thumbnail sits beside its full image.
        const base = `galleries/${ctx.studio_id}/${galleryId}/${randomUUID()}`;
        const [full, thumb] = await Promise.all([
          presignUpload(`${base}.jpg`, 'image/jpeg'),
          presignUpload(`${base}_thumb.jpg`, 'image/jpeg'),
        ]);
        return {
          fullUploadUrl: full.uploadUrl,
          fullPublicUrl: full.publicUrl,
          thumbUploadUrl: thumb.uploadUrl,
          thumbPublicUrl: thumb.publicUrl,
        };
      }),
    );
    return { tickets };
  } catch (err) {
    console.error('[createUploadTickets] presign failed', err);
    return { error: err instanceof Error ? err.message : 'Could not prepare the upload.', tickets: [] };
  }
}

/**
 * Records photos the browser has already put in S3, in one insert.
 *
 * The URLs arrive from the client, so each is checked to sit under this
 * gallery's own prefix — otherwise this would happily store a link to anything.
 */
export async function recordUploadedPhotos(
  galleryId: string,
  jobId: string,
  studioId: string,
  photos: { url: string; thumbUrl: string; fileName: string }[],
): Promise<{ error?: string; recorded: number }> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return { error: 'Unauthorized.', recorded: 0 };
  if (!Array.isArray(photos) || photos.length === 0) return { error: 'Nothing to record.', recorded: 0 };
  if (photos.length > MAX_BATCH) return { error: 'Too many photos in one batch.', recorded: 0 };

  const supabase = createClient();
  if (!(await ownsGallery(supabase, galleryId, ctx.studio_id))) {
    return { error: 'Gallery not found.', recorded: 0 };
  }

  // Only keys we just handed out are acceptable.
  const prefix = `galleries/${ctx.studio_id}/${galleryId}/`;
  const belongsHere = (url: string): boolean => {
    const key = keyFromUrl(url);
    return !!key && key.startsWith(prefix);
  };

  if (!photos.every((p) => belongsHere(p.url) && belongsHere(p.thumbUrl))) {
    return { error: 'Those photos do not belong to this gallery.', recorded: 0 };
  }

  const { data: existing } = await supabase
    .from('gallery_photos')
    .select('sort_order')
    .eq('gallery_id', galleryId)
    .order('sort_order', { ascending: false })
    .limit(1);

  let sortOrder = ((existing as { sort_order: number }[] | null)?.[0]?.sort_order ?? -1) + 1;

  const { error } = await supabase.from('gallery_photos').insert(
    photos.map((p) => ({
      studio_id: ctx.studio_id,
      gallery_id: galleryId,
      storage_path: p.url,
      thumb_path: p.thumbUrl,
      file_name: p.fileName.slice(0, 200),
      sort_order: sortOrder++,
    })),
  );

  if (error) {
    console.error('[recordUploadedPhotos] insert rejected', error);
    return {
      error: error.message.includes('row-level security')
        ? 'Your plan does not include photo galleries.'
        : error.message,
      recorded: 0,
    };
  }

  revalidatePath(`/jobs/${jobId}/gallery/${galleryId}`);
  revalidatePath(`/jobs/${jobId}`);
  return { recorded: photos.length };
}

export async function deletePhoto(
  photoId: string,
  _storagePath: string,
  galleryId: string,
  jobId: string,
  studioId: string,
): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  // Read the row through the user's client so RLS proves it is ours, and take
  // the storage path from the row. Deleting the caller-supplied path would let
  // anyone erase any object in the bucket, whatever the database then says.
  const supabase = createClient();
  const { data } = await supabase
    .from('gallery_photos')
    .select('id, storage_path')
    .eq('id', photoId)
    .eq('gallery_id', galleryId)
    .eq('studio_id', ctx.studio_id)
    .maybeSingle();

  const photo = data as { id: string; storage_path: string } | null;
  if (!photo) return;

  // New photos are S3 URLs; older rows are still Supabase storage paths.
  if (isS3Url(photo.storage_path)) {
    await deleteFromS3(photo.storage_path);
  } else {
    // Storage removal still needs the service role, but ownership is proven now.
    await createAdminClient().storage.from('gallery-photos').remove([photo.storage_path]);
  }
  await supabase.from('gallery_photos').delete().eq('id', photo.id);

  revalidatePath(`/jobs/${jobId}/gallery/${galleryId}`);
  revalidatePath(`/jobs/${jobId}`);
}

export async function updateGalleryStatus(
  galleryId: string,
  jobId: string,
  studioId: string,
  status: string,
): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const supabase = createClient();
  await supabase.from('galleries').update({ status }).eq('id', galleryId);

  revalidatePath(`/jobs/${jobId}/gallery/${galleryId}`);
  revalidatePath(`/jobs/${jobId}`);
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

  const supabase = createClient();
  await supabase
    .from('galleries')
    .update({ title, selection_deadline: selectionDeadline })
    .eq('id', galleryId);

  revalidatePath(`/jobs/${jobId}/gallery/${galleryId}`);
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}/gallery/${galleryId}?saved=1`);
}
