import { notFound } from 'next/navigation';
import { requireCapability } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';
import type { PermissionRow } from '@/lib/permissions';
import { deleteRole } from '../actions';
import RoleForm from './RoleForm';

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  role_permissions: { permission_key: string }[];
  staff: { id: string; full_name: string }[];
};

export default async function RoleDetailPage({ params }: { params: { roleId: string } }) {
  await requireCapability('staff.manage');
  const supabase = createClient();

  const [{ data: roleRaw }, { data: permsRaw }] = await Promise.all([
    supabase
      .from('roles')
      .select('id, name, description, is_system, role_permissions(permission_key), staff(id, full_name)')
      .eq('id', params.roleId)
      .maybeSingle(),
    supabase
      .from('permissions')
      .select('key, label, category, sort_order')
      .order('sort_order'),
  ]);

  if (!roleRaw) notFound();
  const role = roleRaw as unknown as RoleRow;
  const permissions = (permsRaw ?? []) as PermissionRow[];

  const granted = new Set(role.role_permissions.map((p) => p.permission_key));
  const members = role.staff ?? [];

  return (
    <div style={{ maxWidth: 820 }}>
      <div style={{ marginBottom: 20 }}>
        <a href="/roles" style={{ fontSize: 13, color: '#8b968f' }}>← Roles</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <h1 className="page-title">{role.name}</h1>
          {role.is_system && (
            <span style={{ background: '#F1F6EC', color: '#3f6b2b', fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, borderRadius: 20, padding: '2px 8px' }}>
              Built-in
            </span>
          )}
        </div>
        <p style={{ fontSize: 12.5, color: '#8b968f', marginTop: 4 }}>
          {members.length === 0
            ? 'No one has this role yet.'
            : `Held by ${members.map((m) => m.full_name).join(', ')}`}
        </p>
      </div>

      <RoleForm
        roleId={role.id}
        name={role.name}
        description={role.description ?? ''}
        permissions={permissions}
        granted={Array.from(granted)}
      />

      {!role.is_system && (
        <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 16, padding: 20, marginTop: 16 }}>
          <h2 style={{ fontSize: 13.5, fontWeight: 800, color: '#b91c1c', marginBottom: 6 }}>Delete role</h2>
          <p style={{ fontSize: 12.5, color: '#8b968f', margin: '0 0 12px' }}>
            {members.length > 0
              ? `Reassign the ${members.length} member${members.length === 1 ? '' : 's'} holding this role before deleting it.`
              : 'This role is not in use and can be removed.'}
          </p>
          <form action={deleteRole.bind(null, role.id)}>
            <button
              type="submit"
              disabled={members.length > 0}
              style={{
                height: 36, borderRadius: 9, background: '#fff',
                color: members.length > 0 ? '#c7cec9' : '#dc2626',
                border: `1px solid ${members.length > 0 ? '#e5e7eb' : '#fecaca'}`,
                fontWeight: 700, fontSize: 12.5, padding: '0 16px',
                cursor: members.length > 0 ? 'not-allowed' : 'pointer',
              }}
            >
              Delete role
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
