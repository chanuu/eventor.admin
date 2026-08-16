'use server';

import { revalidatePath } from 'next/cache';
import type { StaffRole } from '@eventor/types';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireCapabilityCtx, type StaffContext } from '@/lib/staff';


export async function inviteStaffMember(formData: FormData) {
  const caller = await requireCapabilityCtx('staff.manage');
  if (!caller) return { error: 'You do not have permission to invite staff.' };

  const fullName = ((formData.get('full_name') as string) ?? '').trim();
  const email    = ((formData.get('email') as string) ?? '').trim();
  const roleId   = ((formData.get('role_id') as string) ?? '').trim();
  if (!fullName || !email || !roleId) return { error: 'Name, email and role are all required.' };

  const admin = createAdminClient();

  // The role must belong to the caller's own studio.
  const { data: roleRaw } = await admin
    .from('roles')
    .select('id, studio_id, key')
    .eq('id', roleId)
    .maybeSingle();
  const role = roleRaw as { id: string; studio_id: string; key: string } | null;
  if (!role || role.studio_id !== caller.studio_id) return { error: 'Unknown role.' };

  // Send Supabase invite email — returns user with id immediately
  const { data: { user: invited }, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    data: { full_name: fullName },
  });
  if (inviteErr || !invited) return { error: inviteErr?.message ?? 'Failed to send invite.' };

  // `role` (the legacy enum) is still NOT NULL, so keep it roughly in step with
  // the assigned role. Only role_id is consulted for permissions.
  const legacyRole: StaffRole =
    (['admin', 'sales', 'coordinator', 'editor'] as StaffRole[]).includes(role.key as StaffRole)
      ? (role.key as StaffRole)
      : 'coordinator';

  const { error: staffErr } = await admin.from('staff').insert({
    studio_id: caller.studio_id,
    user_id:   invited.id,
    role:      legacyRole,
    role_id:   role.id,
    full_name: fullName,
  });
  if (staffErr) return { error: staffErr.message };

  revalidatePath('/staff');
  return { success: true };
}

/**
 * Guards shared by the role/active mutations. A studio must never be left
 * without a way in, so the last active admin cannot be demoted or deactivated —
 * including by themselves.
 */
async function canModifyStaff(staffId: string): Promise<
  { ok: true; ctx: StaffContext; target: { id: string; role_id: string | null; is_active: boolean } }
  | { ok: false; error: string }
> {
  const ctx = await requireCapabilityCtx('staff.manage');
  if (!ctx) return { ok: false, error: 'You do not have permission to manage staff.' };

  const admin = createAdminClient();
  const { data: targetRaw } = await admin
    .from('staff')
    .select('id, role_id, is_active, studio_id')
    .eq('id', staffId)
    .maybeSingle();

  const target = targetRaw as { id: string; role_id: string | null; is_active: boolean; studio_id: string } | null;
  if (!target || target.studio_id !== ctx.studio_id) return { ok: false, error: 'Staff member not found.' };

  return { ok: true, ctx, target };
}

/**
 * Would anyone else still be able to administer the studio? The database
 * enforces this too, but checking first avoids surfacing a constraint error.
 */
async function othersCanManageStaff(studioId: string, excludingStaffId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('staff')
    .select('id, roles(role_permissions(permission_key))')
    .eq('studio_id', studioId)
    .eq('is_active', true)
    .neq('id', excludingStaffId);

  return ((data ?? []) as any[]).some((s) => {
    const role = Array.isArray(s.roles) ? s.roles[0] : s.roles;
    return ((role?.role_permissions ?? []) as any[]).some((p) => p.permission_key === 'staff.manage');
  });
}

export async function toggleStaffActive(staffId: string, isActive: boolean): Promise<void> {
  const check = await canModifyStaff(staffId);
  if (!check.ok) return;
  const { ctx, target } = check;

  if (target.id === ctx.id) return;   // no locking yourself out
  if (!isActive && !(await othersCanManageStaff(ctx.studio_id, target.id))) return;

  await createAdminClient()
    .from('staff')
    .update({ is_active: isActive })
    .eq('id', staffId)
    .eq('studio_id', ctx.studio_id);

  revalidatePath('/staff');
}

export async function updateStaffRole(staffId: string, roleId: string): Promise<void> {
  const check = await canModifyStaff(staffId);
  if (!check.ok) return;
  const { ctx, target } = check;

  const admin = createAdminClient();

  // The new role must exist in this studio.
  const { data: roleRaw } = await admin
    .from('roles')
    .select('id, studio_id, key, role_permissions(permission_key)')
    .eq('id', roleId)
    .maybeSingle();
  const role = roleRaw as any;
  if (!role || role.studio_id !== ctx.studio_id) return;

  // Moving someone off a staff-managing role must leave someone else who can.
  const grantsManage = ((role.role_permissions ?? []) as any[])
    .some((p) => p.permission_key === 'staff.manage');
  if (!grantsManage && !(await othersCanManageStaff(ctx.studio_id, target.id))) return;

  const legacyRole: StaffRole =
    (['admin', 'sales', 'coordinator', 'editor'] as StaffRole[]).includes(role.key as StaffRole)
      ? (role.key as StaffRole)
      : 'coordinator';

  await admin
    .from('staff')
    .update({ role_id: roleId, role: legacyRole })
    .eq('id', staffId)
    .eq('studio_id', ctx.studio_id);

  revalidatePath('/staff');
}
