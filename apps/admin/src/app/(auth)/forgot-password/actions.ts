'use server';

import { createClient } from '@/lib/supabase/server';
import { getAppOrigin } from '@/lib/origin';

export async function requestPasswordReset(formData: FormData) {
  const email = ((formData.get('email') as string) ?? '').trim();
  if (!email) return { error: 'Enter the email address you sign in with.' };

  const supabase = createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getAppOrigin()}/auth/callback?next=/reset-password`,
  });

  // Rate limiting is worth surfacing; anything else is reported as success so
  // the form can't be used to discover which addresses have accounts.
  if (error) {
    console.error('[requestPasswordReset]', error.message);
    if (/rate|too many/i.test(error.message)) {
      return { error: 'Too many attempts. Please wait a minute and try again.' };
    }
  }

  return { success: true };
}
