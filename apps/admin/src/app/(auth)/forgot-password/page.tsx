'use client';

import { useState } from 'react';
import { requestPasswordReset } from './actions';

export default function ForgotPasswordPage() {
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const result = await requestPasswordReset(new FormData(e.currentTarget));
    if (result?.error) { setError(result.error); setStatus('error'); }
    else setStatus('sent');
    setLoading(false);
  }

  if (status === 'sent') {
    return (
      <div style={wrapStyle}>
        <div style={cardStyle}>
          <h2 style={{ fontWeight: 600, marginBottom: 8 }}>Check your email</h2>
          <p style={{ color: '#6b7280', fontSize: 14 }}>We sent a password reset link to your inbox.</p>
          <a href="/login" style={{ display: 'block', marginTop: 20, fontSize: 13, color: '#0F3D2E' }}>Back to sign in</a>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <div style={cardStyle}>
        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Forgot password</h1>
        <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>Enter your email and we'll send a reset link.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input name="email" type="email" required placeholder="you@example.com" style={inputStyle} />
          {error && <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>}
          <button type="submit" disabled={loading} style={btnStyle}>{loading ? 'Sending…' : 'Send reset link'}</button>
        </form>

        <a href="/login" style={{ display: 'block', marginTop: 16, fontSize: 13, color: '#6b7280' }}>← Back to sign in</a>
      </div>
    </div>
  );
}

const wrapStyle: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const cardStyle: React.CSSProperties = { width: '100%', maxWidth: 360, padding: 32, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' };
const inputStyle: React.CSSProperties = { height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 };
const btnStyle: React.CSSProperties = { height: 36, borderRadius: 6, background: '#0F3D2E', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer' };
