'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import sharp from 'sharp';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { uploadToS3, deleteFromS3, isS3Url, isS3Configured } from '@/lib/s3';

const MAX_STORED_BYTES = 2 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 40 * 1024 * 1024;

const COMPRESSION_STEPS = [
  { dimension: 2000, quality: 84 },
  { dimension: 2000, quality: 74 },
  { dimension: 1700, quality: 68 },
  { dimension: 1400, quality: 60 },
] as const;

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

/** Album pages are larger than proofing thumbnails but still capped at 2 MB. */
async function compressWithinLimit(raw: Buffer): Promise<Buffer | null> {
  let smallest: Buffer | null = null;
  for (const { dimension, quality } of COMPRESSION_STEPS) {
    let out: Buffer;
    try {
      out = await sharp(raw)
        .rotate()
        .resize(dimension, dimension, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality, mozjpeg: true })
        .toBuffer();
    } catch {
      return null;
    }
    if (out.byteLength <= MAX_STORED_BYTES) return out;
    if (!smallest || out.byteLength < smallest.byteLength) smallest = out;
  }
  return smallest;
}

async function nextSortOrder(albumId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('album_pages')
    .select('sort_order')
    .eq('album_id', albumId)
    .order('sort_order', { ascending: false })
    .limit(1);
  return ((data as { sort_order: number }[] | null)?.[0]?.sort_order ?? -1) + 1;
}

// ─── Album lifecycle ─────────────────────────────────────────────────────────

export async function createAlbum(jobId: string, studioId: string, jobTitle: string): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from('albums')
    .select('id')
    .eq('job_id', jobId)
    .maybeSingle();

  if (!existing) {
    await admin.from('albums').insert({
      job_id: jobId,
      studio_id: studioId,
      title: jobTitle,
      cover_title: jobTitle,
      closing_title: 'With love',
    });
  }

  revalidatePath(`/jobs/${jobId}/album`);
  redirect(`/jobs/${jobId}/album`);
}

export async function updateAlbum(
  albumId: string,
  jobId: string,
  studioId: string,
  formData: FormData,
): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const text = (key: string) => ((formData.get(key) as string) ?? '').trim() || null;

  const admin = createAdminClient();
  await admin
    .from('albums')
    .update({
      title:          text('title'),
      cover_kicker:   text('cover_kicker'),
      cover_title:    text('cover_title'),
      cover_body:     text('cover_body'),
      closing_kicker: text('closing_kicker') ?? 'Thank you',
      closing_title:  text('closing_title'),
      closing_body:   text('closing_body'),
      music_enabled:  formData.get('music_enabled') === 'on',
    })
    .eq('id', albumId)
    .eq('studio_id', studioId);

  revalidatePath(`/jobs/${jobId}/album`);
  redirect(`/jobs/${jobId}/album?saved=1`);
}

export async function setAlbumStatus(
  albumId: string,
  jobId: string,
  studioId: string,
  status: 'draft' | 'published',
): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const admin = createAdminClient();
  await admin
    .from('albums')
    .update({ status, published_at: status === 'published' ? new Date().toISOString() : null })
    .eq('id', albumId)
    .eq('studio_id', studioId);

  revalidatePath(`/jobs/${jobId}/album`);
  redirect(`/jobs/${jobId}/album`);
}

// ─── Pages ───────────────────────────────────────────────────────────────────

/** Adds the photos the client selected during proofing, in gallery order. */
export async function addSelectedPhotos(
  albumId: string,
  jobId: string,
  studioId: string,
): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const admin = createAdminClient();

  const { data: galleries } = await admin.from('galleries').select('id').eq('job_id', jobId);
  const galleryIds = ((galleries ?? []) as { id: string }[]).map((g) => g.id);
  if (!galleryIds.length) return;

  const { data: photos } = await admin
    .from('gallery_photos')
    .select('id, caption, sort_order')
    .in('gallery_id', galleryIds)
    .eq('is_selected', true)
    .eq('is_active', true)
    .order('sort_order');

  const rows = (photos ?? []) as { id: string; caption: string | null; sort_order: number }[];
  if (!rows.length) return;

  // Don't duplicate photos already placed in the album.
  const { data: existing } = await admin
    .from('album_pages')
    .select('gallery_photo_id')
    .eq('album_id', albumId);
  const already = new Set(
    ((existing ?? []) as { gallery_photo_id: string | null }[]).map((r) => r.gallery_photo_id).filter(Boolean),
  );

  let order = await nextSortOrder(albumId);
  const toInsert = rows
    .filter((p) => !already.has(p.id))
    .map((p) => ({
      album_id: albumId,
      studio_id: studioId,
      gallery_photo_id: p.id,
      caption: p.caption,
      sort_order: order++,
    }));

  if (toInsert.length) await admin.from('album_pages').insert(toInsert);

  revalidatePath(`/jobs/${jobId}/album`);
}

export async function uploadAlbumPages(
  albumId: string,
  jobId: string,
  studioId: string,
  formData: FormData,
): Promise<{ error?: string; uploaded: number }> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return { error: 'Unauthorized.', uploaded: 0 };
  if (!isS3Configured()) return { error: 'Album storage is not configured. Set the AWS_* environment variables.', uploaded: 0 };

  const files = (formData.getAll('files') as File[]).filter((f) => f.size > 0);
  if (!files.length) return { error: 'Please select at least one image.', uploaded: 0 };

  const admin = createAdminClient();
  let order = await nextSortOrder(albumId);
  let uploaded = 0;
  const skipped: string[] = [];

  for (const file of files) {
    if (file.type && !file.type.startsWith('image/')) { skipped.push(`${file.name} is not an image`); continue; }
    if (file.size > MAX_UPLOAD_BYTES) { skipped.push(`${file.name} is too large`); continue; }

    const compressed = await compressWithinLimit(Buffer.from(await file.arrayBuffer()));
    if (!compressed) { skipped.push(`${file.name} could not be read as an image`); continue; }

    const key = `albums/${studioId}/${albumId}/${randomUUID()}.jpg`;
    let url: string;
    try {
      url = await uploadToS3(key, compressed, 'image/jpeg');
    } catch (err) {
      console.error('[uploadAlbumPages] S3 upload failed', err);
      return { error: err instanceof Error ? err.message : 'Upload to S3 failed.', uploaded };
    }

    await admin.from('album_pages').insert({
      album_id: albumId,
      studio_id: studioId,
      image_url: url,
      sort_order: order++,
    });
    uploaded++;
  }

  revalidatePath(`/jobs/${jobId}/album`);
  if (uploaded === 0) return { error: skipped.join('; ') || 'No images could be processed.', uploaded: 0 };
  return skipped.length ? { uploaded, error: `Skipped: ${skipped.join('; ')}` } : { uploaded };
}

export async function updatePageCaption(
  pageId: string,
  jobId: string,
  studioId: string,
  caption: string,
): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const admin = createAdminClient();
  await admin
    .from('album_pages')
    .update({ caption: caption.trim() || null })
    .eq('id', pageId)
    .eq('studio_id', studioId);

  revalidatePath(`/jobs/${jobId}/album`);
}

/** Swaps sort_order with the neighbouring page in the given direction. */
export async function movePage(
  pageId: string,
  albumId: string,
  jobId: string,
  studioId: string,
  direction: 'up' | 'down',
): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const admin = createAdminClient();
  const { data: pages } = await admin
    .from('album_pages')
    .select('id, sort_order')
    .eq('album_id', albumId)
    .order('sort_order');

  const list = (pages ?? []) as { id: string; sort_order: number }[];
  const index = list.findIndex((p) => p.id === pageId);
  const swapWith = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= list.length) return;

  await Promise.all([
    admin.from('album_pages').update({ sort_order: list[swapWith].sort_order }).eq('id', list[index].id),
    admin.from('album_pages').update({ sort_order: list[index].sort_order }).eq('id', list[swapWith].id),
  ]);

  revalidatePath(`/jobs/${jobId}/album`);
}

export async function deletePage(
  pageId: string,
  jobId: string,
  studioId: string,
  imageUrl: string | null,
): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const admin = createAdminClient();
  // Only remove the file when it was uploaded for the album; gallery photos are
  // shared with proofing and must survive.
  if (imageUrl && isS3Url(imageUrl)) await deleteFromS3(imageUrl);
  await admin.from('album_pages').delete().eq('id', pageId).eq('studio_id', studioId);

  revalidatePath(`/jobs/${jobId}/album`);
}
