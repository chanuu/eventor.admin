import { redirect } from 'next/navigation';
import type { StaffRole } from '@eventor/types';
import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/Sidebar';
import SidebarShell from '@/components/SidebarShell';
import AppHeader from '@/components/AppHeader';
import QueryProvider from '@/components/QueryProvider';

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
    <div className="flex h-screen bg-canvas overflow-hidden">
      <SidebarShell>
        <Sidebar
          studioName={studio?.name ?? ''}
          staffName={staff?.full_name ?? 'User'}
          role={staff?.role ?? 'admin'}
        />
      </SidebarShell>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader
          staffName={staff?.full_name ?? 'User'}
          role={staff?.role ?? 'admin'}
          studioName={studio?.name ?? ''}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <QueryProvider>{children}</QueryProvider>
        </main>
      </div>
    </div>
  );
}
