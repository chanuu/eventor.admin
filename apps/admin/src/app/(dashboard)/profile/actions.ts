'use server';

import { revalidatePath } from 'next/cache';
import { getStaff } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

/**
 * Updates the signed-in person's own details.
 *
 * No capability check: this is always about yourself, and every staff member —
 * including an editor with almost no permissions — must be able to set their own
 * name. The staff id comes from the session, never from the form.
 */
export async function updateProfile(formData: FormData): Promise<{ error?: string }> {
  const me = await getStaff();
  if (!me) return { error: 'Unauthorized.' };

  const fullName = (formData.get('full_name') as string | null)?.trim();
  if (!fullName) return { error: 'Your name cannot be empty.' };
  if (fullName.length > 120) return { error: 'That name is too long.' };

  const supabase = createClient();
  const { error } = await supabase
    .from('staff')
    .update({ full_name: fullName })
    .eq('id', me.id);

  if (error) {
    console.error('[updateProfile]', error);
    return { error: error.message };
  }

  // The name appears in the sidebar, on task cards and in comment threads.
  revalidatePath('/', 'layout');
  return {};
}
