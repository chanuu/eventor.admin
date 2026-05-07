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
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 24 }}>
        <a href="/packages" style={{ fontSize: 13, color: '#6b7280' }}>← Packages</a>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>New package</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>You can add add-ons after creating the package.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}
      >
        <Field label="Package name" required>
          <input name="name" required style={inputStyle} placeholder="Wedding Photography — Full Day" />
        </Field>

        <Field label="Description">
          <textarea
            name="description"
            rows={2}
            style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
            placeholder="What's included in this package…"
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Field label="Base price (LKR)" required>
            <input name="base_price" type="number" min="0" step="500" required style={inputStyle} placeholder="150000" />
          </Field>
          <Field label="Shoots included">
            <input name="shoots_included" type="number" min="1" defaultValue="1" style={inputStyle} />
          </Field>
        </div>

        {error && <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={loading} style={primaryBtn}>
            {loading ? 'Creating…' : 'Create package'}
          </button>
          <a href="/packages" style={secondaryBtn}>Cancel</a>
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

const inputStyle: React.CSSProperties = { height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14, width: '100%' };
const primaryBtn: React.CSSProperties = { height: 38, borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer', padding: '0 20px', fontSize: 14 };
const secondaryBtn: React.CSSProperties = { height: 38, borderRadius: 6, background: '#f3f4f6', color: '#374151', border: 'none', fontWeight: 500, cursor: 'pointer', padding: '0 20px', fontSize: 14, display: 'inline-flex', alignItems: 'center', textDecoration: 'none' };
