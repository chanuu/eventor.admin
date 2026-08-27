'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireCapabilityCtx } from '@/lib/staff';

export async function saveAgreementTerms(
  studioId: string,
  formData: FormData,
): Promise<{ error?: string } | void> {
  const ctx = await requireCapabilityCtx('settings.manage', studioId);
  if (!ctx) return { error: 'You do not have permission to change studio settings.' };

  const intro = ((formData.get('intro') as string) ?? '').trim();
  const terms = ((formData.get('terms') as string) ?? '').trim();

  if (!terms) {
    return { error: 'Add at least one clause, or use “Restore defaults”.' };
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('studios')
    .update({
      agreement_intro: intro || null,
      agreement_terms: terms,
    })
    .eq('id', studioId);

  if (error) return { error: error.message };

  revalidatePath('/settings');
  return {};
}
