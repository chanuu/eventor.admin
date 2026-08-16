'use server';

import { requireCapabilityCtx } from '@/lib/staff';
import type { Capability } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type StaffCtx = { studio_id: string; role: string };

async function requireStaff(capability: Capability = 'jobs.write'): Promise<StaffCtx | null> {
  const ctx = await requireCapabilityCtx(capability);
  return ctx ? { studio_id: ctx.studio_id, role: ctx.roleName } : null;
}

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export async function createJob(formData: FormData) {
  const ctx = await requireStaff();
  if (!ctx) return { error: 'Unauthorized.' };

  const supabase = createClient();
  const packageId = (formData.get('package_id') as string) || null;

  // Fetch base price if package selected
  let totalPrice = 0;
  if (packageId) {
    const { data: pkg } = await supabase
      .from('packages')
      .select('base_price')
      .eq('id', packageId)
      .single();
    if (pkg) totalPrice = Number((pkg as { base_price: number }).base_price);
  }

  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      studio_id: ctx.studio_id,
      client_id: formData.get('client_id') as string,
      package_id: packageId,
      title: (formData.get('title') as string).trim(),
      event_type: (formData.get('event_type') as string).trim() || null,
      total_price: totalPrice,
      notes: (formData.get('notes') as string).trim() || null,
    })
    .select('id')
    .single();

  if (error || !job) return { error: error?.message ?? 'Failed to create job.' };

  const { id } = job as { id: string };
  revalidatePath('/jobs');
  redirect(`/jobs/${id}`);
}

export async function updateJob(id: string, studioId: string, formData: FormData): Promise<{ error?: string }> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return { error: 'Unauthorized.' };

  const supabase = createClient();
  const { error } = await supabase
    .from('jobs')
    .update({
      title: (formData.get('title') as string).trim(),
      event_type: (formData.get('event_type') as string).trim() || null,
      notes: (formData.get('notes') as string).trim() || null,
    })
    .eq('id', id)
    .eq('studio_id', ctx.studio_id);

  revalidatePath(`/jobs/${id}`);
  if (error) return { error: error.message };
  return {};
}

export async function updateJobStatus(id: string, status: string): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx) return;

  const supabase = createClient();
  await supabase
    .from('jobs')
    .update({ status })
    .eq('id', id)
    .eq('studio_id', ctx.studio_id);

  revalidatePath(`/jobs/${id}`);
  revalidatePath('/jobs');
}

// ─── Job add-ons ──────────────────────────────────────────────────────────────

export async function addJobAddon(jobId: string, studioId: string, formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const supabase = createClient();
  const addonId = formData.get('addon_id') as string;
  const qty = Number(formData.get('quantity')) || 1;

  const { data: addon } = await supabase
    .from('package_addons')
    .select('price')
    .eq('id', addonId)
    .single();
  if (!addon) return;

  const price = Number((addon as { price: number }).price);

  await supabase.from('job_addons').insert({
    studio_id: studioId,
    job_id: jobId,
    addon_id: addonId,
    price_at_booking: price,
    quantity: qty,
  });

  // Recalculate total_price
  await recalcJobTotal(jobId, studioId);
  revalidatePath(`/jobs/${jobId}`);
}

export async function removeJobAddon(jobAddonId: string, jobId: string, studioId: string): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const supabase = createClient();
  await supabase
    .from('job_addons')
    .delete()
    .eq('id', jobAddonId)
    .eq('studio_id', ctx.studio_id);

  await recalcJobTotal(jobId, studioId);
  revalidatePath(`/jobs/${jobId}`);
}

async function recalcJobTotal(jobId: string, studioId: string) {
  const supabase = createClient();

  const { data: jobRaw } = await supabase
    .from('jobs')
    .select('package_id')
    .eq('id', jobId)
    .single();
  if (!jobRaw) return;

  const job = jobRaw as { package_id: string | null };
  let base = 0;
  if (job.package_id) {
    const { data: pkg } = await supabase.from('packages').select('base_price').eq('id', job.package_id).single();
    if (pkg) base = Number((pkg as { base_price: number }).base_price);
  }

  const { data: addons } = await supabase
    .from('job_addons')
    .select('price_at_booking, quantity')
    .eq('job_id', jobId);

  const addonTotal = ((addons ?? []) as { price_at_booking: number; quantity: number }[])
    .reduce((sum, a) => sum + a.price_at_booking * a.quantity, 0);

  await supabase
    .from('jobs')
    .update({ total_price: base + addonTotal })
    .eq('id', jobId)
    .eq('studio_id', studioId);
}

// ─── Shoots ───────────────────────────────────────────────────────────────────

export async function createShoot(jobId: string, studioId: string, formData: FormData): Promise<void> {
  const ctx = await requireStaff('jobs.shoots');
  if (!ctx || ctx.studio_id !== studioId) return;

  const supabase = createClient();
  const scheduledAt = formData.get('scheduled_at') as string;

  await supabase.from('shoots').insert({
    studio_id: studioId,
    job_id: jobId,
    shoot_type: (formData.get('shoot_type') as string).trim() || null,
    scheduled_at: scheduledAt || null,
    venue: (formData.get('venue') as string).trim() || null,
  });

  revalidatePath(`/jobs/${jobId}`);
}

export async function updateShoot(
  shootId: string,
  jobId: string,
  studioId: string,
  formData: FormData,
): Promise<void> {
  const ctx = await requireStaff('jobs.shoots');
  if (!ctx || ctx.studio_id !== studioId) return;

  const supabase = createClient();
  const scheduledAt = formData.get('scheduled_at') as string;

  await supabase
    .from('shoots')
    .update({
      shoot_type: (formData.get('shoot_type') as string).trim() || null,
      scheduled_at: scheduledAt || null,
      venue: (formData.get('venue') as string).trim() || null,
      notes: (formData.get('notes') as string).trim() || null,
    })
    .eq('id', shootId)
    .eq('studio_id', ctx.studio_id);

  revalidatePath(`/jobs/${jobId}/shoots/${shootId}`);
  redirect(`/jobs/${jobId}/shoots/${shootId}?saved=1`);
}

export async function updateShootStatus(shootId: string, jobId: string, status: string): Promise<void> {
  const ctx = await requireStaff('jobs.shoots');
  if (!ctx) return;

  const supabase = createClient();
  await supabase
    .from('shoots')
    .update({ status })
    .eq('id', shootId)
    .eq('studio_id', ctx.studio_id);

  revalidatePath(`/jobs/${jobId}/shoots/${shootId}`);
}

export async function assignShootStaff(
  shootId: string,
  jobId: string,
  studioId: string,
  formData: FormData,
): Promise<void> {
  const ctx = await requireStaff('jobs.shoots');
  if (!ctx || ctx.studio_id !== studioId) return;

  const supabase = createClient();
  await supabase.from('shoot_staff').insert({
    studio_id: studioId,
    shoot_id: shootId,
    staff_id: formData.get('staff_id') as string,
    role_in_shoot: (formData.get('role_in_shoot') as string).trim() || null,
  });

  revalidatePath(`/jobs/${jobId}/shoots/${shootId}`);
}

export async function removeShootStaff(
  shootStaffId: string,
  shootId: string,
  jobId: string,
): Promise<void> {
  const ctx = await requireStaff('jobs.shoots');
  if (!ctx) return;

  const supabase = createClient();
  await supabase
    .from('shoot_staff')
    .delete()
    .eq('id', shootStaffId)
    .eq('studio_id', ctx.studio_id);

  revalidatePath(`/jobs/${jobId}/shoots/${shootId}`);
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function recordPayment(jobId: string, studioId: string, formData: FormData): Promise<void> {
  const ctx = await requireStaff('jobs.contracts');
  if (!ctx || ctx.studio_id !== studioId) return;

  const supabase = createClient();
  const paidAt = formData.get('paid_at') as string;

  await supabase.from('payments').insert({
    studio_id: studioId,
    job_id: jobId,
    type: formData.get('type') as string,
    amount: Number(formData.get('amount')),
    method: (formData.get('method') as string) || 'cash',
    status: paidAt ? 'paid' : 'pending',
    paid_at: paidAt || null,
    notes: (formData.get('notes') as string).trim() || null,
  });

  revalidatePath(`/jobs/${jobId}`);
}

export async function markPaymentPaid(paymentId: string, jobId: string): Promise<void> {
  const ctx = await requireStaff('jobs.contracts');
  if (!ctx) return;

  const supabase = createClient();
  await supabase
    .from('payments')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', paymentId)
    .eq('studio_id', ctx.studio_id);

  revalidatePath(`/jobs/${jobId}`);
}
