import { requireCapability } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';
import { toggleStaffActive } from './invite/actions';
import RoleSelect from './RoleSelect';
import { EmptyState } from '@/components/states';

type StaffRow = {
  id: string;
  full_name: string;
  role_id: string | null;
  is_active: boolean;
  created_at: string;
  user_id: string;
  roles: { name: string } | null;
};

type RoleRow = { id: string; name: string; description: string | null; is_system: boolean };

export default async function StaffPage() {
  const me = await requireCapability('staff.manage');
  const supabase = createClient();

  const [{ data: listRaw }, { data: rolesRaw }] = await Promise.all([
    supabase
      .from('staff')
      .select('id, full_name, role_id, is_active, created_at, user_id, roles(name)')
      .order('created_at'),
    supabase.from('roles').select('id, name, description, is_system').order('name'),
  ]);

  const list = (listRaw ?? []) as unknown as StaffRow[];
  const roles = (rolesRaw ?? []) as RoleRow[];

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Staff</h1>
          <p className="breadcrumb">Main Menu / Staff</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a href="/roles" style={ghostBtn}>Roles &amp; permissions</a>
          <a href="/staff/invite" style={primaryBtn}>Invite staff</a>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E7EAE5', borderRadius: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E7EAE5', background: '#FAFBF9' }}>
              {['Name', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((s) => {
              const isMe = s.user_id === me.id || s.id === me.id;
              return (
                <tr key={s.id} style={{ borderBottom: '1px solid #EDEFEC' }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{s.full_name}</div>
                    {isMe && <div style={{ fontSize: 11, color: '#8b968f' }}>you</div>}
                  </td>
                  <td style={td}>
                    {isMe ? (
                      <span style={rolePill}>{s.roles?.name ?? 'No role'}</span>
                    ) : (
                      <RoleSelect staffId={s.id} roleId={s.role_id} roles={roles} />
                    )}
                  </td>
                  <td style={td}>
                    <span style={{ color: s.is_active ? '#16a34a' : '#8b968f', fontSize: 13 }}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ ...td, color: '#8b968f', fontSize: 13 }}>
                    {new Date(s.created_at).toLocaleDateString('en-GB')}
                  </td>
                  <td style={td}>
                    {!isMe && (
                      <form action={toggleStaffActive.bind(null, s.id, !s.is_active)}>
                        <button type="submit" style={smallBtn}>
                          {s.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 0 }}>
                  <EmptyState
                    title="No staff yet"
                    description="Invite the people you work with and give each of them a role."
                    action={{ href: '/staff/invite', label: 'Invite staff' }}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E7EAE5', borderRadius: 16, padding: 24, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: 14, fontWeight: 800, color: '#0F3D2E' }}>Your studio’s roles</h2>
          <a href="/roles" style={{ fontSize: 12.5, fontWeight: 700, color: '#0F3D2E' }}>Configure →</a>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginTop: 14 }}>
          {roles.map((r) => (
            <div key={r.id} style={{ background: '#FAFBF9', border: '1px solid #EDEFEC', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#123528' }}>{r.name}</div>
              <p style={{ fontSize: 12.5, color: '#5b6660', margin: '6px 0 0', lineHeight: 1.5 }}>
                {r.description ?? 'No description.'}
              </p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 12, color: '#8b968f', marginTop: 14, lineHeight: 1.5 }}>
          Permissions are enforced by the database as well as the interface, so a hidden page cannot be
          reached by typing its address. At least one active member must always keep “Manage staff and roles”.
        </p>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#8b968f',
  textTransform: 'uppercase', letterSpacing: '0.05em',
};
const td: React.CSSProperties = { padding: '12px 16px' };
const rolePill: React.CSSProperties = {
  background: '#F1F6EC', color: '#3f6b2b', padding: '3px 10px', borderRadius: 20,
  fontSize: 12, fontWeight: 700,
};
const primaryBtn: React.CSSProperties = {
  background: '#0F3D2E', color: '#fff', padding: '9px 18px', borderRadius: 9,
  fontSize: 12.5, fontWeight: 700, display: 'inline-block',
};
const ghostBtn: React.CSSProperties = {
  background: '#fff', color: '#123528', border: '1px solid #D8E0DC', padding: '9px 18px',
  borderRadius: 9, fontSize: 12.5, fontWeight: 700, display: 'inline-block',
};
const smallBtn: React.CSSProperties = {
  fontSize: 12, color: '#5b6660', background: 'none', border: '1px solid #D8E0DC',
  borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
};
