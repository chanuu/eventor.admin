import { requireCapability } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';
import { createRole } from './actions';

type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  role_permissions: { permission_key: string }[];
  staff: { id: string }[];
};

export default async function RolesPage({ searchParams }: { searchParams: { saved?: string } }) {
  await requireCapability('staff.manage');
  const supabase = createClient();

  const { data: rolesRaw } = await supabase
    .from('roles')
    .select('id, name, description, is_system, role_permissions(permission_key), staff(id)')
    .order('is_system', { ascending: false })
    .order('name');
  const roles = (rolesRaw ?? []) as unknown as RoleRow[];

  const { count: permissionCount } = await supabase
    .from('permissions')
    .select('key', { count: 'exact', head: true });

  return (
    <div style={{ maxWidth: 900 }}>
      <h1 className="page-title">Roles &amp; permissions</h1>
      <p className="breadcrumb mb-6">
        Main Menu / <a href="/staff" className="hover:text-primary">Staff</a> / Roles
      </p>

      {searchParams.saved && (
        <p style={{ fontSize: 13, color: '#16a34a', marginBottom: 12 }}>Role saved.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {roles.map((r) => (
          <a key={r.id} href={`/roles/${r.id}`} style={roleRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#123528' }}>{r.name}</span>
                {r.is_system && <span style={systemPill}>Built-in</span>}
              </div>
              {r.description && (
                <p style={{ fontSize: 12.5, color: '#8b968f', margin: '3px 0 0' }}>{r.description}</p>
              )}
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0F3D2E' }}>
                {r.role_permissions.length} of {permissionCount ?? 0} permissions
              </div>
              <div style={{ fontSize: 11.5, color: '#8b968f', marginTop: 2 }}>
                {r.staff.length} member{r.staff.length === 1 ? '' : 's'}
              </div>
            </div>
            <span style={{ color: '#8b968f', flexShrink: 0 }}>›</span>
          </a>
        ))}
      </div>

      <div style={card}>
        <h2 style={sectionHeading}>New role</h2>
        <p style={{ fontSize: 12.5, color: '#8b968f', margin: '0 0 14px' }}>
          Create a role for how your studio actually works — a retoucher, a second shooter, an
          accountant — then choose exactly what it can do.
        </p>
        <form action={createRole} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input name="name" required placeholder="Role name, e.g. Retoucher" style={{ ...inputStyle, flex: '1 1 220px' }} />
          <input name="description" placeholder="Short description (optional)" style={{ ...inputStyle, flex: '2 1 280px' }} />
          <button type="submit" style={primaryBtn}>Create role</button>
        </form>
      </div>
    </div>
  );
}

const roleRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: '#fff',
  border: '1px solid #E7EAE5', borderRadius: 12, color: 'inherit', textDecoration: 'none',
};
const systemPill: React.CSSProperties = {
  background: '#F1F6EC', color: '#3f6b2b', fontSize: 10.5, fontWeight: 800,
  textTransform: 'uppercase', letterSpacing: 0.5, borderRadius: 20, padding: '2px 8px',
};
const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #E7EAE5', borderRadius: 16, padding: 24,
};
const sectionHeading: React.CSSProperties = {
  fontSize: 14, fontWeight: 800, color: '#0F3D2E', marginBottom: 8,
};
const inputStyle: React.CSSProperties = {
  height: 38, borderRadius: 9, border: '1px solid #D8E0DC', padding: '0 12px', fontSize: 13.5,
};
const primaryBtn: React.CSSProperties = {
  height: 38, borderRadius: 9, background: '#0F3D2E', color: '#fff', border: 'none',
  fontWeight: 700, cursor: 'pointer', padding: '0 20px', fontSize: 12.5,
};
