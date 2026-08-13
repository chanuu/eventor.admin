'use client';

import { useState } from 'react';
import { createPackage } from '../actions';

export default function NewPackagePage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await createPackage(new FormData(e.currentTarget));
    if (result?.error) { setError(result.error); setLoading(false); }
    // On success, server redirects to edit page
  }

  return (
    <div className="max-w-xl">
      <h1 className="page-title">New Package</h1>
      <p className="breadcrumb mb-6">
        Main Menu / <a href="/packages" className="hover:text-[#0F3D2E]">Packages</a> / <span className="text-[#0F3D2E]">New</span>
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-6 flex flex-col gap-4">
        <Field label="Package name" required>
          <input name="name" required className="input" placeholder="Wedding Photography — Full Day" />
        </Field>

        <Field label="Description">
          <textarea
            name="description"
            rows={2}
            className="input h-auto py-2 resize-y"
            placeholder="What's included in this package…"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Base price (LKR)" required>
            <input name="base_price" type="number" min="0" step="500" required className="input" placeholder="150000" />
          </Field>
          <Field label="Shoots included">
            <input name="shoots_included" type="number" min="1" defaultValue="1" className="input" />
          </Field>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-2.5 pt-1">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Creating…' : 'Create package'}
          </button>
          <a href="/packages" className="btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}
