'use client';

import Link from "next/link";

import { usePathname } from 'next/navigation';

import { signOut } from '@/app/(auth)/login/actions';
import type { Capability } from '@/lib/permissions';
import type { Feature } from '@/lib/features';

const MAIN_NAV = [
  {
    href: '/dashboard',
    cap: 'dashboard.view' as const,
    label: 'Dashboard',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/schedule',
    cap: 'schedule.view' as const,
    feature: 'scheduling' as const,
    label: 'Schedule',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        <rect x="7" y="14" width="3" height="3" rx="0.5"/><rect x="14" y="14" width="3" height="3" rx="0.5"/>
      </svg>
    ),
  },
  {
    href: '/jobs',
    cap: 'jobs.view' as const,
    feature: 'jobs' as const,
    label: 'Jobs',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
  },
  {
    href: '/clients',
    cap: 'clients.manage' as const,
    feature: 'clients' as const,
    label: 'Clients',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: '/packages',
    cap: 'packages.manage' as const,
    feature: 'jobs' as const,
    label: 'Packages',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
  },
  {
    href: '/staff',
    cap: 'staff.manage' as const,
    feature: 'staff' as const,
    label: 'Staff',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
];

const SETTINGS_NAV = [
  {
    href: '/billing',
    cap: 'settings.manage' as const,
    label: 'Billing',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
  },
  {
    href: '/roles',
    cap: 'staff.manage' as const,
    feature: 'staff' as const,
    label: 'Roles',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>
      </svg>
    ),
  },
  {
    href: '/settings',
    cap: 'settings.manage' as const,
    label: 'Settings',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
  },
];

const navItem = (active: boolean) =>
  `flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors
   ${active ? 'bg-white text-primary' : 'text-[#cfe4d8] hover:bg-white/10'}`;

export default function Sidebar({ studioName, staffName, roleName, permissions, features, isPlatformAdmin }: {
  studioName: string; staffName: string; roleName: string;
  permissions: Capability[]; features: Feature[];
  isPlatformAdmin?: boolean;
}) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  // Only show what this role can actually use — the pages guard themselves too.
  const allowed = (item: { cap: Capability; feature?: Feature }) =>
    permissions.includes(item.cap) && (!item.feature || features.includes(item.feature));

  const mainNav = MAIN_NAV.filter(allowed);
  const settingsNav = SETTINGS_NAV.filter(allowed);

  return (
    <aside className="w-[246px] shrink-0 bg-primary text-white flex flex-col py-[22px] h-screen sticky top-0">
      {/* Brand */}
      <Link href="/dashboard" className="flex items-center gap-2.5 px-[22px] pb-6">
        <span className="w-8 h-8 rounded-[9px] bg-lime text-primary font-extrabold text-base flex items-center justify-center shrink-0">
          {(studioName || 'E').charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block font-bold text-sm leading-tight truncate">{studioName || 'Eventor'}</span>
          <span className="block text-[10.5px] text-[#8fae9d] tracking-wider">STUDIO ADMIN</span>
        </span>
      </Link>

      {/* Main nav */}
      <nav className="flex flex-col gap-0.5 px-3">
        {mainNav.map(({ href, label, icon }) => (
          <Link key={href} href={href} className={navItem(isActive(href))}>
            <span className="w-5 flex items-center justify-center shrink-0">{icon}</span>
            <span className="flex-1">{label}</span>
          </Link>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Setup + account */}
      <div className="px-3">
        {settingsNav.map(({ href, label, icon }) => (
          <Link key={href} href={href} className={navItem(isActive(href))}>
            <span className="w-5 flex items-center justify-center shrink-0">{icon}</span>
            <span className="flex-1">{label}</span>
          </Link>
        ))}
      </div>

      {isPlatformAdmin && (
        <div className="px-3 mt-1">
          <Link href="/platform" className={navItem(pathname.startsWith('/platform'))}>
            <span className="w-5 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z"/>
              </svg>
            </span>
            <span className="flex-1">Platform</span>
          </Link>
        </div>
      )}

      <div className="mt-4 px-[22px]">
        <div className="border-t border-white/10 pt-4">
          <p className="text-[11px] text-[#8fae9d] uppercase tracking-wider font-bold">Signed in as</p>
          <div className="flex items-center gap-2.5 mt-2.5">
            <span className="w-[34px] h-[34px] rounded-full bg-lime text-primary font-extrabold text-sm flex items-center justify-center shrink-0">
              {staffName.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-bold truncate">{staffName}</span>
              <span className="block text-[11px] text-[#8fae9d]">{roleName}</span>
            </span>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="mt-3 w-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold py-2.5 rounded-lg transition-colors border-0 cursor-pointer"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
