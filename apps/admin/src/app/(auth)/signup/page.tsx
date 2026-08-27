'use client';

import Link from "next/link";

import { useState } from 'react';
import { createStudioAndAdmin } from './actions';

export default function SignupPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [studioName, setStudioName] = useState('');

  function deriveSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await createStudioAndAdmin(new FormData(e.currentTarget));
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ width: '100%', maxWidth: 400, padding: 32, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Create your studio</h1>
        <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>Set up your Eventor account in seconds.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Your name">
            <input name="full_name" required style={inputStyle} placeholder="Saman Perera" />
          </Field>

          <Field label="Studio name">
            <input
              name="studio_name"
              required
              style={inputStyle}
              placeholder="Saman Photography"
              value={studioName}
              onChange={(e) => setStudioName(e.target.value)}
            />
          </Field>

          <Field label="Studio URL slug">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                name="slug"
                required
                style={{ ...inputStyle, flex: 1 }}
                value={deriveSlug(studioName)}
                onChange={() => {}}
                placeholder="saman-photography"
              />
              <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>.eventor.lk</span>
            </div>
          </Field>

          <Field label="Email">
            <input name="email" type="email" required style={inputStyle} placeholder="saman@example.com" autoComplete="email" />
          </Field>

          <Field label="Password">
            <input name="password" type="password" required minLength={8} style={inputStyle} autoComplete="new-password" placeholder="Min 8 characters" />
          </Field>

          {error && <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>}

          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? 'Creating…' : 'Create studio'}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
          Already have an account? <Link href="/login" style={{ color: '#0F3D2E' }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = { height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14, width: '100%' };
const btnStyle: React.CSSProperties = { height: 38, borderRadius: 6, background: '#0F3D2E', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer', fontSize: 14 };
