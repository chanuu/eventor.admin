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

export async function ensureContract(jobId: string, studioId: string): Promise<void> {
  const ctx = await requireStaff('jobs.contracts');
  if (!ctx || ctx.studio_id !== studioId) return;

  const supabase = createClient();
  const { data: existing } = await supabase
    .from('contracts')
    .select('id')
    .eq('job_id', jobId)
    .maybeSingle();

  if (!existing) {
    await supabase.from('contracts').insert({ job_id: jobId, studio_id: studioId });
  }

  revalidatePath(`/jobs/${jobId}/contract`);
  redirect(`/jobs/${jobId}/contract`);
}

export async function saveContractDraft(
  contractId: string,
  jobId: string,
  studioId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const ctx = await requireStaff('jobs.contracts');
  if (!ctx || ctx.studio_id !== studioId) return { error: 'Unauthorized' };

  const supabase = createClient();
  const { error } = await supabase
    .from('contracts')
    .update({ content_html: formData.get('content_html') as string, status: 'draft' })
    .eq('id', contractId)
    .eq('studio_id', studioId);

  if (error) return { error: error.message };
  revalidatePath(`/jobs/${jobId}/contract`);
  return {};
}

export async function sendContract(
  contractId: string,
  jobId: string,
  studioId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const ctx = await requireStaff('jobs.contracts');
  if (!ctx || ctx.studio_id !== studioId) return { error: 'Unauthorized' };

  const html = formData.get('content_html') as string;
  if (!html?.trim()) return { error: 'Contract content is empty.' };

  const supabase = createClient();
  const { error } = await supabase
    .from('contracts')
    .update({ content_html: html, status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', contractId)
    .eq('studio_id', studioId);

  if (error) return { error: error.message };

  revalidatePath(`/jobs/${jobId}/contract`);
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}/contract`);
}

export async function voidContract(
  contractId: string,
  jobId: string,
  studioId: string,
): Promise<{ error?: string }> {
  const ctx = await requireStaff('jobs.contracts');
  if (!ctx || ctx.studio_id !== studioId) return { error: 'Unauthorized' };

  const supabase = createClient();
  const { error } = await supabase
    .from('contracts')
    .update({ status: 'void' })
    .eq('id', contractId)
    .eq('studio_id', studioId);

  if (error) return { error: error.message };

  revalidatePath(`/jobs/${jobId}/contract`);
  revalidatePath(`/jobs/${jobId}`);
  redirect(`/jobs/${jobId}/contract`);
}
