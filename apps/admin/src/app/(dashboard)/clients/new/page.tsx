'use client';

import Link from "next/link";

import { useState } from 'react';
import { createClient } from '../actions';

export default function NewClientPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await createClient(new FormData(e.currentTarget));
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <div className="max-w-xl">
      <h1 className="page-title">New Client</h1>
      <p className="breadcrumb mb-6">
        Main Menu / <Link href="/clients" className="hover:text-[#0F3D2E]">Clients</Link> / <span className="text-[#0F3D2E]">New</span>
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-6 flex flex-col gap-4">
        <Field label="Full name" required>
          <input name="full_name" required className="input" placeholder="Priya & Sahan Fernando" />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email">
            <input name="email" type="email" className="input" placeholder="priya@example.com" />
          </Field>
          <Field label="Phone">
            <input name="phone" className="input" placeholder="+94 77 123 4567" />
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            name="notes"
            rows={2}
            className="input h-auto py-2 resize-y"
            placeholder="Any notes about this client…"
          />
        </Field>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-2.5 pt-1">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Saving…' : 'Create client'}
          </button>
          <Link href="/clients" className="btn-secondary">Cancel</Link>
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
