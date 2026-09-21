'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type BoardView = 'pending' | '3d' | '7d' | 'custom' | 'all';

const PRESETS: { key: BoardView; label: string; hint: string }[] = [
  { key: 'pending', label: 'Pending jobs', hint: 'Work on jobs that are not delivered yet' },
  { key: '3d', label: 'Next 3 days', hint: 'Due within 3 days, plus anything overdue' },
  { key: '7d', label: 'Next 7 days', hint: 'Due within 7 days, plus anything overdue' },
  { key: 'custom', label: 'Date range', hint: 'Choose your own dates' },
  { key: 'all', label: 'Everything', hint: 'No filter' },
];

/** Two-tone ring that spins — sized to sit inside a filter button. */
function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current
                 border-t-transparent animate-spin"
    />
  );
}

export default function BoardFilters({
  view,
  from,
  to,
}: {
  view: BoardView;
  from: string;
  to: string;
}) {
  // Filtering runs on the server, so a click has nothing to show for itself
  // until the payload comes back. useTransition gives us that window.
  const [pending, startTransition] = useTransition();
  const [showRange, setShowRange] = useState(view === 'custom');
  const [fromDate, setFromDate] = useState(from);
  const [toDate, setToDate] = useState(to);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  /** Keeps whatever else is on the URL — the scope toggle in particular. */
  function go(next: Record<string, string | null>) {
    const qs = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') qs.delete(k);
      else qs.set(k, v);
    }
    startTransition(() => router.push(`${pathname}?${qs.toString()}`));
  }

  function pick(key: BoardView) {
    if (key === 'custom') {
      setShowRange(true);
      return;
    }
    setShowRange(false);
    // 'pending' is the default, so it does not need to sit in the URL.
    go({ view: key === 'pending' ? null : key, from: null, to: null });
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex gap-1.5 flex-wrap">
        {PRESETS.map((p) => {
          const active = p.key === view || (p.key === 'custom' && showRange && view === 'custom');
          return (
            <button
              key={p.key}
              type="button"
              title={p.hint}
              disabled={pending}
              onClick={() => pick(p.key)}
              className={`rounded-md px-3.5 h-9 text-sm font-semibold transition-colors border
                inline-flex items-center gap-2 disabled:cursor-wait
                ${active
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-ink-mid border-line hover:border-primary hover:text-primary'}
                ${pending && !active ? 'opacity-50' : ''}`}
            >
              {pending && active && <Spinner />}
              {p.label}
            </button>
          );
        })}
      </div>

      {showRange && (
        <div className="flex items-end gap-2 flex-wrap bg-white border border-line rounded-xl p-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              From
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="input h-9 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              To
            </span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="input h-9 text-sm"
            />
          </label>

          <button
            type="button"
            disabled={pending || (!fromDate && !toDate)}
            onClick={() => go({ view: 'custom', from: fromDate || null, to: toDate || null })}
            className="btn-primary text-xs h-9 px-4 disabled:opacity-50"
          >
            {pending ? 'Filtering…' : 'Apply'}
          </button>

          {view === 'custom' && (
            <button
              type="button"
              onClick={() => {
                setFromDate('');
                setToDate('');
                setShowRange(false);
                go({ view: null, from: null, to: null });
              }}
              className="text-xs text-ink-muted hover:text-primary h-9"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
