import { redirect } from 'next/navigation';
import type { StaffRole } from '@eventor/types';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/(auth)/login/actions';

type StaffRow = { full_name: string; role: StaffRole; studio_id: string };
type StudioRow = { name: string };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: staffRaw } = await supabase
    .from('staff')
    .select('full_name, role, studio_id')
    .eq('user_id', user.id)
    .single();
  const staff = staffRaw as StaffRow | null;

  const { data: studioRaw } = staff
    ? await supabase.from('studios').select('name').eq('id', staff.studio_id).single()
    : { data: null };
  const studio = studioRaw as StudioRow | null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: '#fff', borderRight: '1px solid #e5e7eb', padding: '24px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Eventor</div>
          {staff && (
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
              {studio?.name ?? '—'}
            </div>
          )}
        </div>

        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              style={{ display: 'block', padding: '7px 10px', borderRadius: 6, color: '#374151', fontSize: 13 }}
            >
              {label}
            </a>
          ))}
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid #e5e7eb' }}>
          {staff && (
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
              {staff.full_name} · {staff.role}
            </div>
          )}
          <form action={signOut}>
            <button
              type="submit"
              style={{ fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}

const NAV = [
  { href: '/dashboard',  label: 'Dashboard' },
  { href: '/jobs',       label: 'Jobs' },
  { href: '/clients',    label: 'Clients' },
  { href: '/packages',   label: 'Packages' },
  { href: '/staff',      label: 'Staff' },
  { href: '/settings',   label: 'Settings' },
];
