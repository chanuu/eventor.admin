'use client';

import { useState } from 'react';
import { updatePassword } from './actions';

export default function ResetPasswordForm({ email }: { email: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= 8 && password === confirm && !loading;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await updatePassword(new FormData(e.currentTarget));
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0F3D2E' }}>Set a new password</h1>
        <p style={{ color: '#5b6660', fontSize: 13.5, marginTop: 6, marginBottom: 22 }}>
          {email ? <>Signing in as <strong style={{ color: '#123528' }}>{email}</strong>.</> : null} Choose
          a password of at least 8 characters.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
          />
          <input
            name="confirm"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input"
          />

          {tooShort && <p style={hint}>Use at least 8 characters.</p>}
          {mismatch && <p style={hint}>Both passwords must match.</p>}
          {error && <p style={{ ...hint, color: '#dc2626' }}>{error}</p>}

          <button type="submit" disabled={!canSubmit} className="btn-primary" style={{ marginTop: 4, opacity: canSubmit ? 1 : 0.55 }}>
            {loading ? 'Saving…' : 'Update password'}
          </button>
        </form>

        <a href="/login" style={{ display: 'block', marginTop: 16, fontSize: 13, color: '#8b968f' }}>
          ← Back to sign in
        </a>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: '#F6F8F5', padding: 24,
};
const card: React.CSSProperties = {
  width: '100%', maxWidth: 400, padding: 32, background: '#fff',
  borderRadius: 16, border: '1px solid #E7EAE5',
};
const hint: React.CSSProperties = { fontSize: 12.5, color: '#a8631f', margin: 0 };
