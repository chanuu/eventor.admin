import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import ResultToast from '@/components/ResultToast';
import NavProgress from '@/components/NavProgress';
import { getStaff } from '@/lib/staff';
import { isPlatformAdmin } from '@/lib/platform';
import Sidebar from '@/components/Sidebar';
import SidebarShell from '@/components/SidebarShell';
import AppHeader from '@/components/AppHeader';
import QueryProvider from '@/components/QueryProvider';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // An authenticated user with no active staff row has no business here — this
  // also stops a deactivated member from keeping a working session.
  const staff = await getStaff();
  if (!staff) redirect('/login?no_access=1');

  const platformAdmin = await isPlatformAdmin();


  return (
    <div className="flex h-screen bg-canvas overflow-hidden">
      <SidebarShell>
        <Sidebar
          studioName={staff.studioName}
          staffName={staff.full_name}
          roleName={staff.roleName}
          permissions={staff.permissions}
          features={staff.features}
          isPlatformAdmin={platformAdmin}
        />
      </SidebarShell>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader
          staffName={staff.full_name}
          role={staff.roleName}
          studioName={staff.studioName}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <QueryProvider>{children}</QueryProvider>
        </main>

        {/* Instant feedback while the next page renders on the server */}
        <Suspense fallback={null}>
          <NavProgress />
        </Suspense>

        {/* Save / delete confirmations for every page in the dashboard */}
        <Suspense fallback={null}>
          <ResultToast />
        </Suspense>
      </div>
    </div>
  );
}
