'use client';

import { useState } from 'react';
import { createJob } from '../actions';

type ClientOption = { id: string; full_name: string };
type PackageOption = { id: string; name: string; base_price: number };

export default function NewJobForm({
  clients,
  packages,
}: {
  clients: ClientOption[];
  packages: PackageOption[];
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
    <form
      onSubmit={handleSubmit}
      style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      <Field label="Client" required>
        <select name="client_id" required style={inputStyle}>
          <option value="">Select a client…</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </select>
      </Field>

      <Field label="Job title" required>
        <input name="title" required style={inputStyle} placeholder="Priya & Sahan — Wedding" />
      </Field>

      <Field label="Event type">
        <input name="event_type" style={inputStyle} placeholder="Wedding, Engagement, Corporate…" />
      </Field>

      <Field label="Package">
        <select name="package_id" style={inputStyle}>
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
          style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
          placeholder="Any initial notes…"
        />
      </Field>

      {error && <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>}

      {clients.length === 0 && (
        <p style={{ fontSize: 13, color: '#f59e0b' }}>
          No clients yet.{' '}
          <a href="/clients/new" style={{ color: '#2563eb' }}>Create a client first</a>
        </p>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button type="submit" disabled={loading || clients.length === 0} style={primaryBtn}>
          {loading ? 'Creating…' : 'Create job'}
        </button>
        <a href="/jobs" style={secondaryBtn}>Cancel</a>
      </div>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = { height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const primaryBtn: React.CSSProperties = { height: 36, borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer', padding: '0 18px', fontSize: 14 };
const secondaryBtn: React.CSSProperties = { height: 36, borderRadius: 6, background: '#f3f4f6', color: '#374151', border: 'none', fontWeight: 500, cursor: 'pointer', padding: '0 16px', fontSize: 14, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' };
