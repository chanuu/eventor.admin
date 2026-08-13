'use client';

import { useState } from 'react';
import { updatePassword } from './actions';

export default function ResetPasswordPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await updatePassword(new FormData(e.currentTarget));
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 360, padding: 32, background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Set new password</h1>
        <p style={{ color: '#6b7280', marginBottom: 24, fontSize: 14 }}>Choose a strong password for your account.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input name="password" type="password" required minLength={8} placeholder="New password" style={inputStyle} autoComplete="new-password" />
          <input name="confirm"  type="password" required minLength={8} placeholder="Confirm password" style={inputStyle} autoComplete="new-password" />
          {error && <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>}
          <button type="submit" disabled={loading} style={btnStyle}>{loading ? 'Saving…' : 'Update password'}</button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14 };
const btnStyle: React.CSSProperties = { height: 36, borderRadius: 6, background: '#0F3D2E', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer' };
