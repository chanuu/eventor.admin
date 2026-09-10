'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { inviteStaffMember } from './invite/actions';

type Role = { id: string; name: string; description: string | null };

/**
 * "Invite staff" button and its dialog.
 *
 * The /staff/invite route still exists and still works. Unlike the package and
 * gallery dialogs there is no redirect on success — the invite just goes out —
 * so this one shows its own confirmation and refreshes the list behind it.
 */
export default function InviteStaffDialog({ roles }: { roles: Role[] }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [roleId, setRoleId] = useState(roles[0]?.id ?? '');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError('');

    const result = await inviteStaffMember(new FormData(e.currentTarget));
    setSending(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    setSent(true);
    router.refresh();
  }

  function close() {
    setOpen(false);
    // Reset only after closing, so the panel does not flicker on the way out.
    setError('');
    setSent(false);
    setRoleId(roles[0]?.id ?? '');
  }

  const selected = roles.find((r) => r.id === roleId);

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        Invite staff
      </button>

      <Modal open={open} onClose={close} title="Invite staff member" width="max-w-lg">
        {sent ? (
          <div className="p-6 flex flex-col gap-4">
            <div>
              <p className="text-[15px] font-semibold text-ink-strong">Invite sent</p>
              <p className="text-[13px] text-ink-mid mt-1">
                They will receive an email to set up their account. They appear in the list as
                soon as they accept.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setSent(false)}>
                Invite another
              </button>
              <button type="button" className="btn-primary" onClick={close}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="staff-name" className="text-[13px] font-medium text-ink-strong">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                id="staff-name"
                name="full_name"
                required
                autoFocus
                className="input"
                placeholder="Kamal Silva"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="staff-email" className="text-[13px] font-medium text-ink-strong">
                Email address <span className="text-red-500">*</span>
              </label>
              <input
                id="staff-email"
                name="email"
                type="email"
                required
                className="input"
                placeholder="kamal@example.com"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="staff-role" className="text-[13px] font-medium text-ink-strong">
                Role <span className="text-red-500">*</span>
              </label>
              <select
                id="staff-role"
                name="role_id"
                required
                className="input"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {selected?.description && (
                <p className="text-[11.5px] text-ink-muted">{selected.description}</p>
              )}
              <p className="text-[11.5px] text-ink-muted">
                Need a different set of permissions?{' '}
                <Link href="/roles" className="font-semibold text-primary">
                  Configure roles
                </Link>
              </p>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button type="button" className="btn-secondary" onClick={close} disabled={sending}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={sending || !roleId}>
                {sending ? 'Sending invite…' : 'Send invite'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
