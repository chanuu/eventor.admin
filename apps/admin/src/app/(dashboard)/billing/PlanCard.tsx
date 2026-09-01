'use client';

import { useState } from 'react';
import { changePlan } from './actions';
import type { Feature } from '@/lib/features';

export default function PlanCard({
  planKey, name, price, description, features, featureLabels, current,
}: {
  planKey: string;
  name: string;
  price: number;
  description: string | null;
  features: Feature[];
  featureLabels: Record<Feature, string>;
  current: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function select() {
    setPending(true);
    setError('');
    const result = await changePlan(planKey);
    // A successful change redirects; reaching here means it did not.
    setPending(false);
    if (result?.error) setError(result.error);
  }

  return (
    <div className={`flex flex-col rounded-2xl border p-5 ${current ? 'border-primary bg-lime-soft' : 'border-line bg-white'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11.5px] font-extrabold uppercase tracking-wider text-primary">{name}</div>
        {current && (
          <span className="text-[10px] font-extrabold uppercase tracking-wide bg-primary text-white rounded-full px-2 py-0.5">
            Current
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5 mt-3">
        <span className="text-2xl font-extrabold text-ink-strong">Rs. {price.toLocaleString('en-LK')}</span>
        <span className="text-[12px] text-ink-muted">/ mo</span>
      </div>

      {description && <p className="text-[12.5px] text-ink-muted mt-2 leading-relaxed">{description}</p>}

      <div className="flex flex-col gap-1.5 mt-4 flex-1">
        {features.map((f) => (
          <div key={f} className="flex gap-2 text-[12.5px] text-ink-body">
            <span className="text-lime-text font-extrabold">✓</span>
            <span>{featureLabels[f] ?? f}</span>
          </div>
        ))}
      </div>

      {error && <p className="text-[12px] text-red-600 mt-3">{error}</p>}

      <button
        onClick={select}
        disabled={current || pending}
        className={current ? 'btn-secondary mt-4' : 'btn-primary mt-4'}
        style={{ opacity: current ? 0.6 : 1, cursor: current ? 'default' : 'pointer' }}
      >
        {current ? 'Your plan' : pending ? 'Switching…' : `Switch to ${name}`}
      </button>
    </div>
  );
}
