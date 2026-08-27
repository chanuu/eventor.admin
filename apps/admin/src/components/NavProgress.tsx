'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Thin progress bar across the top of the app.
 *
 * App Router keeps the current page on screen while the next one renders on the
 * server. Without a signal, a click feels ignored. This starts on any internal
 * link click and clears once the route has actually changed.
 */
export default function NavProgress() {
  const pathname = usePathname();
  const params = useSearchParams();
  const [active, setActive] = useState(false);

  // Any click on an internal link begins a navigation.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const link = (e.target as HTMLElement | null)?.closest?.('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href || !href.startsWith('/')) return;             // external or in-page
      if (link.getAttribute('target') === '_blank') return;
      if (href === pathname + (params.toString() ? `?${params}` : '')) return;  // same page

      setActive(true);
    }

    document.addEventListener('click', onClick, { capture: true });
    return () => document.removeEventListener('click', onClick, { capture: true });
  }, [pathname, params]);

  // The route changed, so whatever was pending has arrived.
  useEffect(() => {
    setActive(false);
  }, [pathname, params]);

  // Never leave the bar stuck if a navigation is cancelled.
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(false), 10_000);
    return () => clearTimeout(t);
  }, [active]);

  if (!active) return null;

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[100] h-[3px] bg-transparent overflow-hidden"
    >
      <div className="h-full w-1/3 bg-lime animate-navbar rounded-r-full" />
    </div>
  );
}
