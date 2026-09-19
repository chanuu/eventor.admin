'use client';

import { useState } from 'react';
import { createPlan } from './actions';

export default function NewPlanForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');

    const form = e.currentTarget;
    const result = await createPlan(new FormData(form));
    setPending(false);

    if (result?.error) { setError(result.error); return; }
    form.reset();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap">
        <input name="name" required placeholder="Package name, e.g. Album Plus" className="input flex-1 min-w-[200px]" />
        <input name="price_lkr" type="number" min={0} step={100} placeholder="Price / month" className="input w-40" />
        <input name="description" placeholder="Short description" className="input flex-[2] min-w-[220px]" />
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? 'Creating…' : 'Create package'}
        </button>
      </form>
      {error && <p className="text-[12.5px] text-red-600 mt-3">{error}</p>}
    </>
  );
}
