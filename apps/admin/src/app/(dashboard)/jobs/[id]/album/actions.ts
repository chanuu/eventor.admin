'use server';

import { requireCapabilityCtx } from '@/lib/staff';
import type { Capability } from '@/lib/permissions';
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

async function requireStaff(capability: Capability = 'album.manage'): Promise<StaffCtx | null> {
  const ctx = await requireCapabilityCtx(capability);
  return ctx ? { studio_id: ctx.studio_id, role: ctx.roleName } : null;
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
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}/album?saved=1`);
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
  revalidatePath(`/jobs/${jobId}`);
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
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}/album?saved=1`);
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
  revalidatePath(`/jobs/${jobId}`);
}

export async function uploadAlbumPages(
  albumId: string,
  jobId: string,
  studioId: string,
  formData: FormData,
): Promise<{ error?: string; uploaded: number }> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return { error: 'Unauthorized.', uploaded: 0 };
  if (!isS3Configured()) return { error: 'Album storage is not configured. Set the S3_* environment variables.', uploaded: 0 };

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
  revalidatePath(`/jobs/${jobId}`);
  if (uploaded === 0) return { error: skipped.join('; ') || 'No images could be processed.', uploaded: 0 };
  return skipped.length ? { uploaded, error: `Skipped: ${skipped.join('; ')}` } : { uploaded };
}

// ─── Soundtrack ──────────────────────────────────────────────────────────────

const MAX_AUDIO_BYTES = 12 * 1024 * 1024; // 12 MB — a few minutes of MP3
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav'];

export async function uploadAlbumMusic(
  albumId: string,
  jobId: string,
  studioId: string,
  formData: FormData,
): Promise<{ error?: string; name?: string }> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return { error: 'Unauthorized.' };
  if (!isS3Configured()) return { error: 'Album storage is not configured. Set the S3_* environment variables.' };

  const file = formData.get('music') as File | null;
  if (!file || file.size === 0) return { error: 'Please choose an audio file.' };

  const typeOk = AUDIO_TYPES.includes(file.type) || /\.(mp3|m4a|aac|ogg|wav)$/i.test(file.name);
  if (!typeOk) return { error: 'That file is not audio. Use MP3, M4A, AAC, OGG or WAV.' };
  if (file.size > MAX_AUDIO_BYTES) {
    return { error: `“${file.name}” is over ${MAX_AUDIO_BYTES / 1024 / 1024} MB. Please use a shorter or more compressed track.` };
  }

  const admin = createAdminClient();

  // Replace any previous track rather than accumulating files.
  const { data: current } = await admin
    .from('albums')
    .select('music_url')
    .eq('id', albumId)
    .maybeSingle();
  const previous = (current as { music_url: string | null } | null)?.music_url ?? null;

  const ext = (file.name.split('.').pop() ?? 'mp3').toLowerCase();
  const key = `albums/${studioId}/${albumId}/music/${randomUUID()}.${ext}`;

  let url: string;
  try {
    url = await uploadToS3(key, Buffer.from(await file.arrayBuffer()), file.type || 'audio/mpeg');
  } catch (err) {
    console.error('[uploadAlbumMusic] S3 upload failed', err);
    return { error: err instanceof Error ? err.message : 'Upload to S3 failed.' };
  }

  await admin
    .from('albums')
    .update({ music_url: url, music_name: file.name, music_enabled: true })
    .eq('id', albumId)
    .eq('studio_id', studioId);

  if (previous && isS3Url(previous)) await deleteFromS3(previous);

  revalidatePath(`/jobs/${jobId}/album`);
  revalidatePath(`/jobs/${jobId}`);
  return { name: file.name };
}

export async function removeAlbumMusic(
  albumId: string,
  jobId: string,
  studioId: string,
  musicUrl: string | null,
): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const admin = createAdminClient();
  await admin
    .from('albums')
    .update({ music_url: null, music_name: null })
    .eq('id', albumId)
    .eq('studio_id', studioId);

  if (musicUrl && isS3Url(musicUrl)) await deleteFromS3(musicUrl);

  revalidatePath(`/jobs/${jobId}/album`);
  revalidatePath(`/jobs/${jobId}`);
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
  revalidatePath(`/jobs/${jobId}`);
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
  revalidatePath(`/jobs/${jobId}`);
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
  revalidatePath(`/jobs/${jobId}`);
}

// ─── Public sharing & playback ───────────────────────────────────────────────

/**
 * Public sharing is deliberately a separate switch from publishing: publishing
 * shows the album to the client, sharing lets them pass a link to anyone.
 */
export async function setAlbumSharing(
  albumId: string,
  jobId: string,
  studioId: string,
  isPublic: boolean,
): Promise<{ error?: string } | void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) {
    return { error: 'You do not have permission to change this album.' };
  }

  const { error } = await createAdminClient()
    .from('albums')
    .update({ is_public: isPublic })
    .eq('id', albumId)
    .eq('studio_id', studioId);

  if (error) return { error: error.message };

  revalidatePath(`/jobs/${jobId}/album`);
  revalidatePath(`/jobs/${jobId}`);
}

export async function setAlbumPlayback(
  albumId: string,
  jobId: string,
  studioId: string,
  autoplay: boolean,
  seconds: number,
): Promise<{ error?: string } | void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) {
    return { error: 'You do not have permission to change this album.' };
  }

  const { error } = await createAdminClient()
    .from('albums')
    .update({ autoplay, autoplay_seconds: Math.min(30, Math.max(2, seconds)) })
    .eq('id', albumId)
    .eq('studio_id', studioId);

  if (error) return { error: error.message };

  revalidatePath(`/jobs/${jobId}/album`);
}
