'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getStaff } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';
import { presignUpload, keyFromUrl, deleteFromS3, isS3Url, isS3Configured } from '@/lib/s3';

/**
 * Who may change this profile picture: yourself, always; anyone else, only with
 * staff.manage. Returns the caller's studio so the key can be scoped to it.
 */
async function canEditAvatar(staffId: string): Promise<{ studioId: string } | null> {
  const me = await getStaff();
  if (!me) return null;
  if (me.id === staffId || me.permissions.includes('staff.manage')) {
    return { studioId: me.studio_id };
  }
  return null;
}

export async function createAvatarTicket(
  staffId: string,
): Promise<{ error?: string; uploadUrl?: string; publicUrl?: string }> {
  const ctx = await canEditAvatar(staffId);
  if (!ctx) return { error: 'Unauthorized.' };
  if (!isS3Configured()) {
    return { error: 'Photo storage is not configured. Set the S3_* environment variables.' };
  }

  // RLS proves the staff row is in our studio before we mint a URL for it.
  const supabase = createClient();
  const { data: member } = await supabase
    .from('staff')
    .select('id')
    .eq('id', staffId)
    .eq('studio_id', ctx.studioId)
    .maybeSingle();

  if (!member) return { error: 'Staff member not found.' };

  try {
    const key = `avatars/${ctx.studioId}/${staffId}/${randomUUID()}.jpg`;
    const { uploadUrl, publicUrl } = await presignUpload(key, 'image/jpeg');
    return { uploadUrl, publicUrl };
  } catch (err) {
    console.error('[createAvatarTicket]', err);
    return { error: err instanceof Error ? err.message : 'Could not prepare the upload.' };
  }
}

export async function setStaffAvatar(
  staffId: string,
  url: string | null,
): Promise<{ error?: string }> {
  const ctx = await canEditAvatar(staffId);
  if (!ctx) return { error: 'Unauthorized.' };

  const prefix = `avatars/${ctx.studioId}/${staffId}/`;
  if (url) {
    // Only a key we just handed out is acceptable, or this would store a link
    // to anything at all.
    const key = keyFromUrl(url);
    if (!key || !key.startsWith(prefix)) return { error: 'That image does not belong here.' };
  }

  const supabase = createClient();

  // Read the old one first so the replaced file can be cleaned up.
  const { data: current } = await supabase
    .from('staff')
    .select('avatar_url')
    .eq('id', staffId)
    .eq('studio_id', ctx.studioId)
    .maybeSingle();

  const { data, error } = await supabase
    .from('staff')
    .update({ avatar_url: url })
    .eq('id', staffId)
    .eq('studio_id', ctx.studioId)
    .select('id');

  if (error) {
    console.error('[setStaffAvatar]', error);
    return { error: error.message };
  }
  if (!data || data.length === 0) return { error: 'Staff member not found.' };

  const previous = (current as { avatar_url: string | null } | null)?.avatar_url ?? null;
  if (previous && previous !== url && isS3Url(previous)) await deleteFromS3(previous);

  revalidatePath('/staff');
  revalidatePath('/tasks');
  return {};
}
