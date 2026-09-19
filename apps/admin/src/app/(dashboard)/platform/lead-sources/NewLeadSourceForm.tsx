'use client';

import { useState } from 'react';
import { createLeadSource } from './actions';

export default function NewLeadSourceForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');

    const form = e.currentTarget;
    const result = await createLeadSource(new FormData(form));
    setPending(false);

    if (result?.error) { setError(result.error); return; }
    form.reset();
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap">
        <input
          name="name"
          required
          placeholder="e.g. Bridal magazine"
          className="input flex-1 min-w-[220px]"
        />
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? 'Adding…' : 'Add source'}
        </button>
      </form>
      {error && <p className="text-[12.5px] text-red-600 mt-3">{error}</p>}
    </>
  );
}
