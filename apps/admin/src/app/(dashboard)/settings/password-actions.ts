'use server';

import { createClient } from '@/lib/supabase/server';

export async function changeOwnPassword(formData: FormData) {
  const current  = (formData.get('current') as string) ?? '';
  const password = (formData.get('password') as string) ?? '';
  const confirm  = (formData.get('confirm') as string) ?? '';

  if (!current)             return { error: 'Enter your current password.' };
  if (password !== confirm) return { error: 'New passwords do not match.' };
  if (password.length < 8)  return { error: 'New password must be at least 8 characters.' };
  if (password === current)  return { error: 'The new password must be different from the current one.' };

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: 'You are not signed in.' };

  // Re-authenticate before changing the password, so an unattended session
  // cannot be used to lock the real owner out.
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: current,
  });
  if (signInErr) return { error: 'Your current password is not correct.' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  return { success: true };
}
