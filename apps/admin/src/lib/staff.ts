import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { Capability } from '@/lib/permissions';
import type { Feature } from '@/lib/features';

export type StaffContext = {
  id: string;
  studio_id: string;
  full_name: string;
  role_id: string | null;
  roleName: string;
  studioName: string;
  permissions: Capability[];
  /** Features the studio's plan includes. */
  features: Feature[];
  planName: string;
  planKey: string | null;
};

/**
 * The signed-in staff member and the permissions their assigned role grants.
 * Cached per request so the guards on a page share one round trip.
 */
export const getStaff = cache(async (): Promise<StaffContext | null> => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('staff')
    .select('id, studio_id, full_name, role_id, studios(name), roles(name, role_permissions(permission_key))')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!data) return null;
  const row = data as any;

  const { data: subRaw } = await supabase
    .from('subscriptions')
    .select('plan_key, status, plans(name, plan_features(feature_key))')
    .eq('studio_id', row.studio_id)
    .eq('status', 'active')
    .maybeSingle();

  const sub = subRaw as any;
  const plan = Array.isArray(sub?.plans) ? sub.plans[0] : sub?.plans;
  const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;
  const studio = Array.isArray(row.studios) ? row.studios[0] : row.studios;

  return {
    id: row.id,
    studio_id: row.studio_id,
    full_name: row.full_name,
    role_id: row.role_id,
    roleName: role?.name ?? 'No role',
    studioName: studio?.name ?? '',
    permissions: ((role?.role_permissions ?? []) as { permission_key: Capability }[])
      .map((p) => p.permission_key),
    features: ((plan?.plan_features ?? []) as { feature_key: Feature }[])
      .map((p) => p.feature_key),
    planName: plan?.name ?? 'No plan',
    planKey: sub?.plan_key ?? null,
  };
});

export function hasPermission(staff: StaffContext | null, capability: Capability): boolean {
  return !!staff?.permissions.includes(capability);
}

export function hasFeature(staff: StaffContext | null, feature: Feature): boolean {
  return !!staff?.features.includes(feature);
}

/**
 * Page guard for a feature the plan must include. Sends the studio to billing
 * rather than the dashboard, since upgrading is the way to resolve it.
 */
export async function requireFeature(feature: Feature): Promise<StaffContext> {
  const staff = await getStaff();
  if (!staff) redirect('/login');
  if (!hasFeature(staff, feature)) redirect(`/billing?locked=${feature}`);
  return staff;
}

/** Server-action guard: both the role and the plan must allow it. */
export async function requireEntitled(
  capability: Capability,
  feature: Feature,
  studioId?: string,
): Promise<StaffContext | null> {
  const staff = await getStaff();
  if (!staff) return null;
  if (!hasPermission(staff, capability)) return null;
  if (!hasFeature(staff, feature)) return null;
  if (studioId && staff.studio_id !== studioId) return null;
  return staff;
}

/**
 * Page guard. Sends users without the capability somewhere usable rather than
 * rendering a page whose every action will fail.
 */
export async function requireCapability(capability: Capability): Promise<StaffContext> {
  const staff = await getStaff();
  if (!staff) redirect('/login');
  if (!hasPermission(staff, capability)) redirect('/dashboard?denied=1');
  return staff;
}

/**
 * Server-action guard. Returns null rather than redirecting so callers can
 * report the failure; actions must never rely on the UI having hidden them.
 */
export async function requireCapabilityCtx(
  capability: Capability,
  studioId?: string,
): Promise<StaffContext | null> {
  const staff = await getStaff();
  if (!staff) return null;
  if (!hasPermission(staff, capability)) return null;
  if (studioId && staff.studio_id !== studioId) return null;
  return staff;
}
