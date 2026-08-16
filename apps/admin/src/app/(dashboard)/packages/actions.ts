'use server';

import { requireCapabilityCtx } from '@/lib/staff';
import type { Capability } from '@/lib/permissions';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

type StaffCtx = { studio_id: string; role: string };

async function requireStaff(capability: Capability = 'packages.manage'): Promise<StaffCtx | null> {
  const ctx = await requireCapabilityCtx(capability);
  return ctx ? { studio_id: ctx.studio_id, role: ctx.roleName } : null;
}

// ─── Packages ─────────────────────────────────────────────────────────────────

export async function createPackage(formData: FormData) {
  const ctx = await requireStaff();
  if (!ctx) return { error: 'Unauthorized.' };

  const supabase = createClient();
  const { data: pkg, error } = await supabase
    .from('packages')
    .insert({
      studio_id: ctx.studio_id,
      name: (formData.get('name') as string).trim(),
      description: (formData.get('description') as string).trim() || null,
      base_price: Number(formData.get('base_price')),
      shoots_included: Number(formData.get('shoots_included')) || 1,
    })
    .select('id')
    .single();

  if (error || !pkg) return { error: error?.message ?? 'Failed to create package.' };

  const { id } = pkg as { id: string };
  revalidatePath('/packages');
  redirect(`/packages/${id}/edit`);
}

export async function updatePackage(id: string, studioId: string, formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const supabase = createClient();
  await supabase
    .from('packages')
    .update({
      name: (formData.get('name') as string).trim(),
      description: (formData.get('description') as string).trim() || null,
      base_price: Number(formData.get('base_price')),
      shoots_included: Number(formData.get('shoots_included')) || 1,
    })
    .eq('id', id)
    .eq('studio_id', ctx.studio_id);

  revalidatePath('/packages');
  redirect(`/packages/${id}/edit?saved=1`);
}

export async function togglePackageActive(id: string, isActive: boolean): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx) return;

  const supabase = createClient();
  await supabase
    .from('packages')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('studio_id', ctx.studio_id);

  revalidatePath('/packages');
}

// ─── Add-ons ──────────────────────────────────────────────────────────────────

export async function createAddon(packageId: string, studioId: string, formData: FormData): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const supabase = createClient();
  await supabase.from('package_addons').insert({
    studio_id: studioId,
    package_id: packageId,
    name: (formData.get('name') as string).trim(),
    description: (formData.get('description') as string).trim() || null,
    price: Number(formData.get('price')),
  });

  revalidatePath(`/packages/${packageId}/edit`);
}

export async function updateAddon(
  addonId: string,
  packageId: string,
  studioId: string,
  formData: FormData,
): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx || ctx.studio_id !== studioId) return;

  const supabase = createClient();
  await supabase
    .from('package_addons')
    .update({
      name: (formData.get('name') as string).trim(),
      description: (formData.get('description') as string).trim() || null,
      price: Number(formData.get('price')),
    })
    .eq('id', addonId)
    .eq('studio_id', ctx.studio_id);

  revalidatePath(`/packages/${packageId}/edit`);
  redirect(`/packages/${packageId}/edit`);
}

export async function toggleAddonActive(
  addonId: string,
  packageId: string,
  isActive: boolean,
): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx) return;

  const supabase = createClient();
  await supabase
    .from('package_addons')
    .update({ is_active: isActive })
    .eq('id', addonId)
    .eq('studio_id', ctx.studio_id);

  revalidatePath(`/packages/${packageId}/edit`);
}

export async function deleteAddon(addonId: string, packageId: string): Promise<void> {
  const ctx = await requireStaff();
  if (!ctx) return;

  const supabase = createClient();
  await supabase
    .from('package_addons')
    .delete()
    .eq('id', addonId)
    .eq('studio_id', ctx.studio_id);

  revalidatePath(`/packages/${packageId}/edit`);
}
