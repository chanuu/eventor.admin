'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Lottie from './Lottie';

/**
 * Confirmation toast for save and delete.
 *
 * Server actions redirect with ?saved=1 / ?created=1 / ?deleted=1, so mounting
 * this once in the dashboard layout covers every page without each one wiring
 * up its own toast. The flag is stripped from the URL afterwards so a refresh
 * doesn't replay the animation.
 */
const MESSAGES: Record<string, { title: string; body: string; kind: 'success' | 'delete' }> = {
  saved:   { title: 'Changes saved',  body: 'Your updates have been stored.',      kind: 'success' },
  created: { title: 'Record created', body: 'It was added successfully.',          kind: 'success' },
  deleted: { title: 'Record deleted', body: 'It has been removed permanently.',    kind: 'delete'  },
};

export default function ResultToast() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState<keyof typeof MESSAGES | null>(null);

  const flag = (Object.keys(MESSAGES) as (keyof typeof MESSAGES)[])
    .find((k) => params.get(k) === '1');

  useEffect(() => {
    if (!flag) return;
    setActive(flag);

    // Drop the flag so a reload doesn't replay it.
    const next = new URLSearchParams(params.toString());
    next.delete(flag);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });

    const hide = setTimeout(() => setActive(null), 3200);
    return () => clearTimeout(hide);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flag]);

  if (!active) return null;
  const msg = MESSAGES[active];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[80] w-[min(360px,calc(100vw-32px))]
                 bg-white rounded-2xl border border-line shadow-card-md
                 px-4 py-3 flex items-center gap-3 animate-fadeUp"
    >
      <Lottie kind={msg.kind} size={52} loop={false} />
      <div className="min-w-0">
        <p className="text-sm font-bold text-primary">{msg.title}</p>
        <p className="text-[12.5px] text-ink-muted mt-0.5">{msg.body}</p>
      </div>
    </div>
  );
}
