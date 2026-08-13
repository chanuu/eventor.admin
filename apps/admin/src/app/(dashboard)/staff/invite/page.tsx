'use client';

import { useState } from 'react';
import { inviteStaffMember } from './actions';

const ROLES = ['admin', 'coordinator', 'sales', 'editor'] as const;

export default function InviteStaffPage() {
  const [error, setError]     = useState('');
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
      <div className="max-w-xl">
        <h1 className="page-title mb-3">Invite sent</h1>
        <p className="text-sm text-gray-500 mb-5">The staff member will receive an email to set up their account.</p>
        <a href="/staff" className="text-sm text-[#0F3D2E] hover:underline">← Back to staff</a>
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="page-title">Invite Staff Member</h1>
      <p className="breadcrumb mb-6">
        Main Menu / <a href="/staff" className="hover:text-[#0F3D2E]">Staff</a> / <span className="text-[#0F3D2E]">Invite</span>
      </p>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-card p-6 flex flex-col gap-4">
        <Field label="Full name">
          <input name="full_name" required className="input" placeholder="Kamal Silva" />
        </Field>

        <Field label="Email address">
          <input name="email" type="email" required className="input" placeholder="kamal@example.com" />
        </Field>

        <Field label="Role">
          <select name="role" required className="input">
            {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </Field>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="pt-1">
          <button type="submit" disabled={loading} className="btn-primary">
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
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  );
}
