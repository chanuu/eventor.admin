'use client';

import { useState } from 'react';
import { changeOwnPassword } from './password-actions';

/**
 * Password change for the signed-in user. Requires the current password, so a
 * borrowed unlocked laptop can't be used to take over the account.
 */
export default function ChangePassword() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  const mismatch = confirm.length > 0 && next !== confirm;
  const canSubmit = next.length >= 8 && next === confirm && !loading;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDone(false);

    const form = e.currentTarget;
    const result = await changeOwnPassword(new FormData(form));
    setLoading(false);

    if (result?.error) { setError(result.error); return; }
    form.reset();
    setNext(''); setConfirm('');
    setDone(true);
  }

  return (
    <div className="bg-white rounded-2xl border border-line shadow-card p-6 mt-4">
      <h2 className="text-sm font-extrabold text-primary">Password</h2>
      <p className="text-[12.5px] text-ink-muted mt-1 mb-4">
        Change the password you use to sign in to the studio admin.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-md">
        <input
          name="current" type="password" required autoComplete="current-password"
          placeholder="Current password" className="input"
        />
        <input
          name="password" type="password" required minLength={8} autoComplete="new-password"
          placeholder="New password (min 8 characters)" className="input"
          value={next} onChange={(e) => setNext(e.target.value)}
        />
        <input
          name="confirm" type="password" required minLength={8} autoComplete="new-password"
          placeholder="Confirm new password" className="input"
          value={confirm} onChange={(e) => setConfirm(e.target.value)}
        />

        {mismatch && <p className="text-[12.5px] text-[#a8631f]">Both passwords must match.</p>}
        {error && <p className="text-[12.5px] text-red-600">{error}</p>}
        {done && <p className="text-[12.5px] text-green-700 font-semibold">Password updated.</p>}

        <div>
          <button type="submit" disabled={!canSubmit} className="btn-primary" style={{ opacity: canSubmit ? 1 : 0.55 }}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
}
