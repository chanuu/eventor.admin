'use client';

import Link from "next/link";

import { useState } from 'react';
import { createJob } from '../actions';

type ClientOption = { id: string; full_name: string };
type PackageOption = { id: string; name: string; base_price: number };
type LeadSource = { id: string; name: string };

export default function NewJobForm({
  clients,
  packages,
  leadSources,
}: {
  clients: ClientOption[];
  packages: PackageOption[];
  leadSources: LeadSource[];
}) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await createJob(new FormData(e.currentTarget));
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-6 flex flex-col gap-4">
      <Field label="Client" required>
        <select name="client_id" required className="input">
          <option value="">Select a client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </select>
      </Field>

      <Field label="Job title" required>
        <input name="title" required className="input" placeholder="Priya & Sahan — Wedding" />
      </Field>

      <Field label="Event type">
        <input name="event_type" className="input" placeholder="Wedding, Engagement, Corporate…" />
      </Field>

      <Field label="How did they hear about you?">
        <select name="lead_source" className="input">
          <option value="">— Not recorded —</option>
          {leadSources.map((s) => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Package">
        <select name="package_id" className="input">
          <option value="">No package (set price later)</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — LKR {p.base_price.toLocaleString()}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Notes">
        <textarea
          name="notes"
          rows={2}
          className="input h-auto py-2 resize-y"
          placeholder="Any initial notes…"
        />
      </Field>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {clients.length === 0 && (
        <p className="text-sm text-amber-500">
          No clients yet.{' '}
          <Link href="/clients/new" className="text-[#0F3D2E] hover:underline">Create a client first</Link>
        </p>
      )}

      <div className="flex gap-2.5 pt-1">
        <button type="submit" disabled={loading || clients.length === 0} className="btn-primary">
          {loading ? 'Creating…' : 'Create job'}
        </button>
        <Link href="/jobs" className="btn-secondary">Cancel</Link>
      </div>
    </form>
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
