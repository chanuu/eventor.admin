'use client';

import { useRouter } from 'next/navigation';

/**
 * Status filter as a dropdown. The chip row needed nine tap targets and wrapped
 * into a tall column on a phone; a select collapses that to one control.
 */
export default function StatusFilter({ statuses, current }: {
  statuses: string[];
  current?: string;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 min-w-0">
      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted shrink-0 hidden sm:inline">
        Status
      </span>
      <select
        value={current ?? ''}
        onChange={(e) => router.push(e.target.value ? `/jobs?status=${e.target.value}` : '/jobs')}
        className="input h-10 capitalize min-w-0"
      >
        <option value="">All statuses</option>
        {statuses.map((s) => (
          <option key={s} value={s} className="capitalize">{s}</option>
        ))}
      </select>
    </label>
  );
}
