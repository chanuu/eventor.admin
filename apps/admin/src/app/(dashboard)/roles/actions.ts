'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCapabilityCtx } from '@/lib/staff';
import type { Capability } from '@/lib/permissions';

/** URL-safe key derived from the role name; roles are unique per studio by key. */
function toKey(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

export async function createRole(formData: FormData): Promise<void> {
  const ctx = await requireCapabilityCtx('staff.manage');
  if (!ctx) return;

  const name = ((formData.get('name') as string) ?? '').trim();
  if (!name) return;

  const admin = createAdminClient();
  const { data } = await admin
    .from('roles')
    .insert({
      studio_id: ctx.studio_id,
      key: toKey(name) || `role-${Date.now()}`,
      name,
      description: ((formData.get('description') as string) ?? '').trim() || null,
      is_system: false,
    })
    .select('id')
    .single();

  revalidatePath('/roles');
  const id = (data as { id: string } | null)?.id;
  if (id) redirect(`/roles/${id}`);
}

export async function updateRole(
  roleId: string,
  formData: FormData,
): Promise<{ error?: string } | void> {
  const ctx = await requireCapabilityCtx('staff.manage');
  if (!ctx) return { error: 'You do not have permission to manage roles.' };

  const admin = createAdminClient();

  // Confirm the role belongs to the caller's studio before touching it.
  const { data: roleRaw } = await admin
    .from('roles')
    .select('id, studio_id, is_system')
    .eq('id', roleId)
    .maybeSingle();
  const role = roleRaw as { id: string; studio_id: string; is_system: boolean } | null;
  if (!role || role.studio_id !== ctx.studio_id) return { error: 'Role not found.' };

  const name = ((formData.get('name') as string) ?? '').trim();
  const description = ((formData.get('description') as string) ?? '').trim() || null;
  const selected = formData.getAll('permissions') as Capability[];

  // The database also enforces this, but a clear message beats a raw constraint error.
  if (!selected.includes('staff.manage')) {
    const { count } = await admin
      .from('staff')
      .select('id', { count: 'exact', head: true })
      .eq('studio_id', ctx.studio_id)
      .eq('is_active', true)
      .eq('role_id', roleId);

    if ((count ?? 0) > 0) {
      const { data: others } = await admin
        .from('roles')
        .select('id, role_permissions(permission_key), staff(id)')
        .eq('studio_id', ctx.studio_id)
        .neq('id', roleId);

      const someoneElseCanManage = ((others ?? []) as any[]).some((r) =>
        (r.role_permissions ?? []).some((p: any) => p.permission_key === 'staff.manage')
        && (r.staff ?? []).length > 0,
      );
      if (!someoneElseCanManage) {
        return { error: 'Someone must keep "Manage staff and roles" — otherwise nobody could administer this studio.' };
      }
    }
  }

  if (name) await admin.from('roles').update({ name, description }).eq('id', roleId);

  // Replace the permission set wholesale: simpler and idempotent.
  await admin.from('role_permissions').delete().eq('role_id', roleId);
  if (selected.length) {
    await admin.from('role_permissions').insert(
      selected.map((permission_key) => ({ role_id: roleId, permission_key })),
    );
  }

  revalidatePath('/roles');
  revalidatePath(`/roles/${roleId}`);
  redirect('/roles?saved=1');
}

export async function deleteRole(roleId: string): Promise<void> {
  const ctx = await requireCapabilityCtx('staff.manage');
  if (!ctx) return;

  const admin = createAdminClient();
  const { data: roleRaw } = await admin
    .from('roles')
    .select('id, studio_id, is_system')
    .eq('id', roleId)
    .maybeSingle();
  const role = roleRaw as { id: string; studio_id: string; is_system: boolean } | null;

  if (!role || role.studio_id !== ctx.studio_id) return;
  if (role.is_system) return;   // built-in roles stay

  // Refuse while anyone still holds it, rather than orphaning staff.
  const { count } = await admin
    .from('staff')
    .select('id', { count: 'exact', head: true })
    .eq('role_id', roleId);
  if ((count ?? 0) > 0) return;

  await admin.from('roles').delete().eq('id', roleId).eq('studio_id', ctx.studio_id);
  revalidatePath('/roles');
  redirect('/roles?deleted=1');
}
