'use client';

const STATUS_STYLES: Record<string, string> = {
  lead:       'border-gray-300 bg-gray-50 text-gray-600',
  quoted:     'border-amber-300 bg-amber-50 text-amber-700',
  contracted: 'border-blue-300 bg-blue-50 text-blue-700',
  active:     'border-green-300 bg-green-50 text-[#2D6A4F]',
  editing:    'border-violet-300 bg-violet-50 text-violet-700',
  proofing:   'border-pink-300 bg-pink-50 text-pink-700',
  delivered:  'border-emerald-300 bg-emerald-50 text-emerald-700',
  archived:   'border-gray-200 bg-gray-50 text-gray-400',
};

export default function JobStatusForm({
  current, steps, isPending, onStatusChange,
}: {
  current: string;
  steps: string[];
  isPending: boolean;
  onStatusChange: (status: string) => void;
}) {
  const style = STATUS_STYLES[current] ?? STATUS_STYLES.lead;
  return (
    <div className="flex items-center gap-3">
      <select
        value={current}
        onChange={(e) => onStatusChange(e.target.value)}
        disabled={isPending}
        className={`h-9 rounded-lg border px-3 text-sm font-semibold capitalize cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#2D6A4F] ${style}`}
      >
        {steps.map((s) => (
          <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
        ))}
      </select>
      {isPending && <span className="text-xs text-gray-400">Saving…</span>}
    </div>
  );
}
