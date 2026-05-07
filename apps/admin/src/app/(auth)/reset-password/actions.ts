'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string;
  const confirm  = formData.get('confirm') as string;

  if (password !== confirm) return { error: 'Passwords do not match.' };
  if (password.length < 8)  return { error: 'Password must be at least 8 characters.' };

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect('/dashboard');
}
