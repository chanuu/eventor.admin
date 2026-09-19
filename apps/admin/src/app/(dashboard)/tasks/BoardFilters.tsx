'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type BoardView = 'pending' | '3d' | '7d' | 'custom' | 'all';

const PRESETS: { key: BoardView; label: string; hint: string }[] = [
  { key: 'pending', label: 'Pending jobs', hint: 'Work on jobs that are not delivered yet' },
  { key: '3d', label: 'Next 3 days', hint: 'Due within 3 days, plus anything overdue' },
  { key: '7d', label: 'Next 7 days', hint: 'Due within 7 days, plus anything overdue' },
  { key: 'custom', label: 'Date range', hint: 'Choose your own dates' },
  { key: 'all', label: 'Everything', hint: 'No filter' },
];

export default function BoardFilters({
  view,
  from,
  to,
}: {
  view: BoardView;
  from: string;
  to: string;
}) {
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
    router.push(`${pathname}?${qs.toString()}`);
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
              onClick={() => pick(p.key)}
              className={`rounded-lg px-3 h-8 text-[12.5px] font-semibold transition-colors border
                ${active
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-ink-mid border-line hover:border-primary hover:text-primary'}`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {showRange && (
        <div className="flex items-end gap-2 flex-wrap bg-white border border-line rounded-xl p-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
              From
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="input h-9 text-[13px]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted">
              To
            </span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="input h-9 text-[13px]"
            />
          </label>

          <button
            type="button"
            disabled={!fromDate && !toDate}
            onClick={() => go({ view: 'custom', from: fromDate || null, to: toDate || null })}
            className="btn-primary text-[12.5px] h-9 px-4 disabled:opacity-50"
          >
            Apply
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
              className="text-[12px] text-ink-muted hover:text-primary h-9"
            >
              Clear
            </button>
          )}
        </div>
      )}
    </div>
  );
}
