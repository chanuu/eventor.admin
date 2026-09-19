'use client';

import { useState } from 'react';
import { savePlan } from './actions';

type FeatureRow = { key: string; label: string; description: string | null };

export default function PlanEditor({
  planKey, name, price, description, isActive, features, allFeatures, subscriberCount,
}: {
  planKey: string;
  name: string;
  price: number;
  description: string | null;
  isActive: boolean;
  features: string[];
  allFeatures: FeatureRow[];
  subscriberCount: number;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(features));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function toggle(key: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setError(''); setSaved(false);
    const result = await savePlan(planKey, new FormData(e.currentTarget));
    setSaving(false);
    if (result?.error) { setError(result.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-line shadow-card p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-extrabold text-primary">{name}</h2>
          <span className="text-[11px] text-ink-muted">
            {subscriberCount} studio{subscriberCount === 1 ? '' : 's'} on this package
          </span>
        </div>
        <label className="flex items-center gap-2 text-[12.5px] text-ink-strong cursor-pointer">
          <input type="checkbox" name="is_active" defaultChecked={isActive} className="w-4 h-4 accent-lime" />
          Offered to new studios
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
        <div className="flex flex-col gap-1">
          <label className="text-[12.5px] font-medium text-ink-strong">Package name</label>
          <input name="name" defaultValue={name} required className="input" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[12.5px] font-medium text-ink-strong">Price (LKR / month)</label>
          <input name="price_lkr" type="number" min={0} step={100} defaultValue={price} required className="input" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[12.5px] font-medium text-ink-strong">Short description</label>
          <input name="description" defaultValue={description ?? ''} className="input" />
        </div>
      </div>

      <div className="h-px bg-line-soft my-5" />

      <div className="label-xs mb-1">Included features</div>
      <p className="text-[12px] text-ink-muted mb-3">
        {selected.size} of {allFeatures.length} selected. Studios on this package can only use what is ticked —
        enforced by the database, not just the menus.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {allFeatures.map((f) => {
          const on = selected.has(f.key);
          return (
            <label
              key={f.key}
              className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 cursor-pointer
                ${on ? 'bg-lime-soft border-lime-border' : 'bg-panel border-line-soft'}`}
            >
              <input
                type="checkbox"
                name="features"
                value={f.key}
                checked={on}
                onChange={() => toggle(f.key)}
                className="w-4 h-4 accent-lime shrink-0 mt-0.5"
              />
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold text-ink-strong">{f.label}</span>
                {f.description && (
                  <span className="block text-[11.5px] text-ink-muted mt-0.5">{f.description}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {error && <p className="text-[12.5px] text-red-600 mt-4">{error}</p>}
      {saved && <p className="text-[12.5px] text-green-700 font-semibold mt-4">Package saved.</p>}

      <div className="mt-5">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save package'}
        </button>
      </div>

      {subscriberCount > 0 && (
        <p className="text-[12px] text-ink-muted mt-3 leading-relaxed">
          Removing a feature takes it away from {subscriberCount} existing studio
          {subscriberCount === 1 ? '' : 's'} immediately. Their data is kept and becomes read-only.
        </p>
      )}
    </form>
  );
}
