'use client';

import { useTransition } from 'react';
import { updateShootStatus } from '../../../actions';

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  scheduled: { bg: '#DCE9CE', color: '#1e40af', border: '#A8BDB2' },
  shot:      { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  editing:   { bg: '#ede9fe', color: '#5b21b6', border: '#c4b5fd' },
  done:      { bg: '#dcfce7', color: '#166534', border: '#86efac' },
};

export default function ShootStatusForm({
  shootId,
  jobId,
  current,
  statuses,
}: {
  shootId: string;
  jobId: string;
  current: string;
  statuses: string[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    startTransition(() => {
      updateShootStatus(shootId, jobId, newStatus);
    });
  }

  const { bg, color, border } = STATUS_COLORS[current] ?? STATUS_COLORS.scheduled;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <select
        value={current}
        onChange={handleChange}
        disabled={isPending}
        style={{
          height: 36,
          borderRadius: 6,
          border: `1px solid ${border}`,
          padding: '0 12px',
          fontSize: 14,
          fontWeight: 600,
          background: bg,
          color,
          cursor: 'pointer',
          textTransform: 'capitalize',
        }}
      >
        {statuses.map((s) => (
          <option key={s} value={s} style={{ textTransform: 'capitalize' }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>
      {isPending && <span style={{ fontSize: 12, color: '#9ca3af' }}>Saving…</span>}
    </div>
  );
}
