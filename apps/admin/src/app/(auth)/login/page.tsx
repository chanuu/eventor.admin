'use client';

import { useState } from 'react';
import { signIn } from './actions';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await signIn(new FormData(e.currentTarget));
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ width: 360, padding: 32, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Eventor</h1>
        <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>Sign in to your studio</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="email" style={{ fontSize: 13, fontWeight: 500 }}>Email</label>
            <input id="email" name="email" type="email" required autoComplete="email"
              style={{ height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="password" style={{ fontSize: 13, fontWeight: 500 }}>Password</label>
              <a href="/forgot-password" style={{ fontSize: 12, color: '#2563eb' }}>Forgot?</a>
            </div>
            <input id="password" name="password" type="password" required autoComplete="current-password"
              style={{ height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 }} />
          </div>

          {error && <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>}

          <button type="submit" disabled={loading}
            style={{ height: 38, borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontSize: 14 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: 13, color: '#6b7280', textAlign: 'center' }}>
          New studio? <a href="/signup" style={{ color: '#2563eb' }}>Create account</a>
        </p>
      </div>
    </div>
  );
}
