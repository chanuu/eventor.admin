'use client';

import { useState } from 'react';
import { inviteStaffMember } from './actions';

type Role = { id: string; name: string; description: string | null };

export default function InviteForm({ roles }: { roles: Role[] }) {
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roleId, setRoleId]   = useState(roles[0]?.id ?? '');

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
      <div className="max-w-xl">
        <h1 className="page-title mb-3">Invite sent</h1>
        <p className="text-sm text-ink-mid mb-5">
          The staff member will receive an email to set up their account.
        </p>
        <a href="/staff" className="text-sm text-primary hover:underline">← Back to staff</a>
      </div>
    );
  }

  const selected = roles.find((r) => r.id === roleId);

  return (
    <div className="max-w-xl">
      <h1 className="page-title">Invite Staff Member</h1>
      <p className="breadcrumb mb-6">
        Main Menu / <a href="/staff" className="hover:text-primary">Staff</a> /{' '}
        <span className="text-primary">Invite</span>
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-line shadow-card p-6 flex flex-col gap-4">
        <Field label="Full name">
          <input name="full_name" required className="input" placeholder="Kamal Silva" />
        </Field>

        <Field label="Email address">
          <input name="email" type="email" required className="input" placeholder="kamal@example.com" />
        </Field>

        <Field label="Role">
          <select
            name="role_id"
            required
            className="input"
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
          >
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {selected?.description && (
            <p className="text-xs text-ink-muted mt-1">{selected.description}</p>
          )}
          <p className="text-xs text-ink-muted mt-1">
            Need a different set of permissions?{' '}
            <a href="/roles" className="font-semibold text-primary">Configure roles</a>
          </p>
        </Field>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="pt-1">
          <button type="submit" disabled={loading || !roleId} className="btn-primary">
            {loading ? 'Sending invite…' : 'Send invite'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-ink-strong">{label}</label>
      {children}
    </div>
  );
}
