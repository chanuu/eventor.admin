'use client';

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
    <div style={{ maxWidth: 520 }}>
      <div style={{ marginBottom: 24 }}>
        <a href="/clients" style={{ fontSize: 13, color: '#6b7280' }}>← Clients</a>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>New client</h1>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        <Field label="Full name" required>
          <input name="full_name" required style={inputStyle} placeholder="Priya & Sahan Fernando" />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Email">
            <input name="email" type="email" style={inputStyle} placeholder="priya@example.com" />
          </Field>
          <Field label="Phone">
            <input name="phone" style={inputStyle} placeholder="+94 77 123 4567" />
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            name="notes"
            rows={2}
            style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
            placeholder="Any notes about this client…"
          />
        </Field>

        {error && <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={loading} style={primaryBtn}>
            {loading ? 'Saving…' : 'Create client'}
          </button>
          <a href="/clients" style={secondaryBtn}>Cancel</a>
        </div>
      </form>
    </div>
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
