'use server';

import { requireCapabilityCtx } from '@/lib/staff';
import type { Capability } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type StaffCtx = { studio_id: string; role: string };

async function requireStaff(capability: Capability = 'jobs.contracts'): Promise<StaffCtx | null> {
  const ctx = await requireCapabilityCtx(capability);
  return ctx ? { studio_id: ctx.studio_id, role: ctx.roleName } : null;
}

/**
 * Creates the agreement from the studio's template, already filled in with the
 * job, client and package details. There is no authoring step — the document is
 * generated, then viewed, sent and signed.
 */
export async function createAgreement(
  jobId: string,
  studioId: string,
  html: string,
): Promise<{ error?: string } | void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) {
    return { error: 'You do not have permission to create agreements.' };
  }
  if (!html?.trim()) {
    return { error: 'The agreement template is empty. Check your studio details in Settings.' };
  }

  const supabase = createClient();
  const { data: existing } = await supabase
    .from('contracts')
    .select('id')
    .eq('job_id', jobId)
    .maybeSingle();

  if (existing) {
    // Only a draft may be regenerated; a sent or signed document is a record.
    await supabase
      .from('contracts')
      .update({ content_html: html })
      .eq('id', (existing as { id: string }).id)
      .eq('studio_id', studioId)
      .eq('status', 'draft');
  } else {
    const { error } = await supabase.from('contracts').insert({
      job_id: jobId,
      studio_id: studioId,
      content_html: html,
      status: 'draft',
    });
    if (error) {
      console.error('[createAgreement]', error.message);
      return { error: `Could not create the agreement: ${error.message}` };
    }
  }

  revalidatePath(`/jobs/${jobId}/contract`);
  redirect(`/jobs/${jobId}/contract?saved=1`);
}

/** Makes the agreement visible to the client so they can read and sign it. */
export async function sendAgreement(
  contractId: string,
  jobId: string,
  studioId: string,
): Promise<{ error?: string } | void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) {
    return { error: 'You do not have permission to send agreements.' };
  }

  const supabase = createClient();

  // An empty document would reach the client as a blank page.
  const { data: existing } = await supabase
    .from('contracts')
    .select('content_html, status')
    .eq('id', contractId)
    .maybeSingle();
  const row = existing as { content_html: string | null; status: string } | null;

  if (!row) return { error: 'Agreement not found.' };
  if (!row.content_html?.trim()) {
    return { error: 'This agreement has no content yet. Regenerate it before sending.' };
  }

  const { error } = await supabase
    .from('contracts')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', contractId)
    .eq('studio_id', studioId);

  if (error) {
    console.error('[sendAgreement]', error.message);
    return { error: `Could not send the agreement: ${error.message}` };
  }

  revalidatePath(`/jobs/${jobId}/contract`);
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}/contract?saved=1`);
}

export async function voidContract(
  contractId: string,
  jobId: string,
  studioId: string,
): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const supabase = createClient();
  await supabase
    .from('contracts')
    .update({ status: 'void' })
    .eq('id', contractId)
    .eq('studio_id', studioId);

  revalidatePath(`/jobs/${jobId}/contract`);
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}/contract?saved=1`);
}
