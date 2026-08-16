'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function updatePassword(formData: FormData) {
  const password = (formData.get('password') as string) ?? '';
  const confirm  = (formData.get('confirm') as string) ?? '';

  if (password !== confirm) return { error: 'Passwords do not match.' };
  if (password.length < 8)  return { error: 'Password must be at least 8 characters.' };

  const supabase = createClient();

  // The emailed link must have established a session; without one there is
  // nothing to update and Supabase would fail with a confusing message.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Your reset link has expired. Request a new one.' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return {
      error: /same.*password/i.test(error.message)
        ? 'That is already your current password. Choose a different one.'
        : error.message,
    };
  }

  redirect('/dashboard?saved=1');
}
