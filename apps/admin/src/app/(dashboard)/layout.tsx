import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ResultToast from '@/components/ResultToast';
import { getStaff } from '@/lib/staff';
import Sidebar from '@/components/Sidebar';
import SidebarShell from '@/components/SidebarShell';
import AppHeader from '@/components/AppHeader';
import QueryProvider from '@/components/QueryProvider';

type StudioRow = { name: string };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // An authenticated user with no active staff row has no business here — this
  // also stops a deactivated member from keeping a working session.
  const staff = await getStaff();
  if (!staff) redirect('/login?no_access=1');

  const supabase = createClient();
  const { data: studioRaw } = await supabase
    .from('studios').select('name').eq('id', staff.studio_id).single();
  const studio = studioRaw as StudioRow | null;

  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <SidebarShell>
        <Sidebar
          studioName={studio?.name ?? ''}
          staffName={staff.full_name}
          roleName={staff.roleName}
          permissions={staff.permissions}
        />
      </SidebarShell>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader
          staffName={staff.full_name}
          role={staff.roleName}
          studioName={studio?.name ?? ''}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <QueryProvider>{children}</QueryProvider>
        </main>

        {/* Save / delete confirmations for every page in the dashboard */}
        <Suspense fallback={null}>
          <ResultToast />
        </Suspense>
      </div>
    </div>
  );
}
