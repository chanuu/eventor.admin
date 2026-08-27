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
): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

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
    await supabase.from('contracts').insert({
      job_id: jobId,
      studio_id: studioId,
      content_html: html,
      status: 'draft',
    });
  }

  revalidatePath(`/jobs/${jobId}/contract`);
  redirect(`/jobs/${jobId}/contract?saved=1`);
}

/** Makes the agreement visible to the client so they can read and sign it. */
export async function sendAgreement(
  contractId: string,
  jobId: string,
  studioId: string,
): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const supabase = createClient();
  await supabase
    .from('contracts')
    .update({ status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', contractId)
    .eq('studio_id', studioId);

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
