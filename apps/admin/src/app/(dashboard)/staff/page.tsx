import { createClient } from '@/lib/supabase/server';
import type { StaffRole } from '@eventor/types';
import { toggleStaffActive } from './invite/actions';

type StaffRow = {
  id: string;
  full_name: string;
  role: StaffRole;
  is_active: boolean;
  created_at: string;
  user_id: string;
};

const ROLE_COLORS: Record<StaffRole, string> = {
  admin: '#DCE9CE',
  editor: '#dcfce7',
  sales: '#fef9c3',
  coordinator: '#fce7f3',
};

export default async function StaffPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: meRaw } = await supabase.from('staff').select('role').eq('user_id', user!.id).single();
  const me = meRaw as { role: StaffRole } | null;
  const isAdmin = me?.role === 'admin';

  const { data: listRaw } = await supabase
    .from('staff')
    .select('id, full_name, role, is_active, created_at, user_id')
    .order('created_at');
  const list = (listRaw ?? []) as StaffRow[];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Staff</h1>
        {isAdmin && (
          <a href="/staff/invite" style={{ background: '#0F3D2E', color: '#fff', padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500 }}>
            Invite staff
          </a>
        )}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
              {['Name', 'Role', 'Status', 'Joined', isAdmin ? 'Actions' : ''].filter(Boolean).map((h) => (
                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ fontWeight: 500 }}>{s.full_name}</div>
                  {s.user_id === user!.id && <div style={{ fontSize: 11, color: '#9ca3af' }}>you</div>}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: ROLE_COLORS[s.role], padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
                    {s.role}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ color: s.is_active ? '#16a34a' : '#9ca3af', fontSize: 13 }}>
                    {s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: 13 }}>
                  {new Date(s.created_at).toLocaleDateString('en-GB')}
                </td>
                {isAdmin && (
                  <td style={{ padding: '12px 16px' }}>
                    {s.user_id !== user!.id && (
                      <form action={toggleStaffActive.bind(null, s.id, !s.is_active)}>
                        <button type="submit" style={{ fontSize: 12, color: '#6b7280', background: 'none', border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' }}>
                          {s.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </form>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                  No staff yet. <a href="/staff/invite" style={{ color: '#0F3D2E' }}>Invite someone</a>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
