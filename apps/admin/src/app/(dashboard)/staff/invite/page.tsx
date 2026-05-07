'use client';

import { useState } from 'react';
import { inviteStaffMember } from './actions';

const ROLES = ['admin', 'coordinator', 'sales', 'editor'] as const;

export default function InviteStaffPage() {
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await inviteStaffMember(new FormData(e.currentTarget));
    if (result?.error) { setError(result.error); setLoading(false); }
    else setSuccess(true);
  }

  if (success) {
    return (
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>Invite sent</h1>
        <p style={{ color: '#6b7280', marginBottom: 20 }}>The staff member will receive an email to set up their account.</p>
        <a href="/staff" style={{ color: '#2563eb', fontSize: 14 }}>← Back to staff</a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: 24 }}>
        <a href="/staff" style={{ fontSize: 13, color: '#6b7280' }}>← Staff</a>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>Invite staff member</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, background: '#fff', padding: 24, borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <Field label="Full name">
          <input name="full_name" required style={inputStyle} placeholder="Kamal Silva" />
        </Field>

        <Field label="Email address">
          <input name="email" type="email" required style={inputStyle} placeholder="kamal@example.com" />
        </Field>

        <Field label="Role">
          <select name="role" required style={inputStyle}>
            {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </Field>

        {error && <p style={{ fontSize: 13, color: '#dc2626' }}>{error}</p>}

        <button type="submit" disabled={loading} style={btnStyle}>
          {loading ? 'Sending invite…' : 'Send invite'}
        </button>
      </form>
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

const inputStyle: React.CSSProperties = { height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 10px', fontSize: 14 };
const btnStyle: React.CSSProperties   = { height: 38, borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer' };
