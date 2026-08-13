'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Wraps the sidebar so it becomes an off-canvas drawer on small screens.
 * Desktop keeps the permanent column; mobile gets a hamburger in the header.
 */
export default function SidebarShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Navigating closes the drawer.
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      {/* Mobile trigger — fixed so it stays reachable while scrolling */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        className="lg:hidden fixed top-3 left-3 z-40 w-10 h-10 rounded-xl bg-primary text-white
                   flex flex-col items-center justify-center gap-[4px] shadow-card-md"
      >
        <span className="block w-4 h-[2px] rounded bg-white" />
        <span className="block w-4 h-[2px] rounded bg-white" />
        <span className="block w-4 h-[2px] rounded bg-white" />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="lg:hidden fixed inset-0 z-50 bg-[rgba(11,42,32,0.5)]"
          aria-hidden
        />
      )}

      <div
        className={`fixed lg:static inset-y-0 left-0 z-[60] transition-transform duration-250 lg:translate-x-0
                    ${open ? 'translate-x-0 shadow-card-md' : '-translate-x-full'}`}
      >
        {children}
      </div>
    </>
  );
}
