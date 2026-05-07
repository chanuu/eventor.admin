'use client';

const STATUS_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  lead:       { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' },
  quoted:     { bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  contracted: { bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' },
  active:     { bg: '#dcfce7', color: '#166534', border: '#86efac' },
  editing:    { bg: '#ede9fe', color: '#5b21b6', border: '#c4b5fd' },
  proofing:   { bg: '#fce7f3', color: '#9d174d', border: '#f9a8d4' },
  delivered:  { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  archived:   { bg: '#f3f4f6', color: '#9ca3af', border: '#d1d5db' },
};

export default function JobStatusForm({
  current,
  steps,
  isPending,
  onStatusChange,
}: {
  current: string;
  steps: string[];
  isPending: boolean;
  onStatusChange: (status: string) => void;
}) {
  const { bg, color, border } = STATUS_COLORS[current] ?? STATUS_COLORS.lead;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <select
        value={current}
        onChange={(e) => onStatusChange(e.target.value)}
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
        {steps.map((s) => (
          <option key={s} value={s} style={{ textTransform: 'capitalize' }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </option>
        ))}
      </select>
      {isPending && <span style={{ fontSize: 12, color: '#9ca3af' }}>Saving…</span>}
    </div>
  );
}
