'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { createPackage } from './actions';

/**
 * "New package" button and its dialog.
 *
 * The /packages/new route still exists and still works — this just saves a page
 * load for the common case. A successful create redirects to the package's edit
 * page, where add-ons are managed, so the dialog never closes itself on success.
 */
export default function NewPackageDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const result = await createPackage(new FormData(e.currentTarget));

    // Success redirects, so reaching here means it did not.
    setSaving(false);
    if (result?.error) setError(result.error);
  }

  function close() {
    setOpen(false);
    setError('');
  }

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        + New package
      </button>

      <Modal open={open} onClose={close} title="New package" width="max-w-lg">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="pkg-name" className="text-sm font-medium text-ink-strong">
              Package name <span className="text-red-500">*</span>
            </label>
            <input
              id="pkg-name"
              name="name"
              required
              autoFocus
              className="input"
              placeholder="Wedding Photography — Full Day"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="pkg-description" className="text-sm font-medium text-ink-strong">
              Description
            </label>
            <textarea
              id="pkg-description"
              name="description"
              rows={2}
              className="input h-auto py-2 resize-y"
              placeholder="What's included in this package…"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pkg-price" className="text-sm font-medium text-ink-strong">
                Base price (LKR) <span className="text-red-500">*</span>
              </label>
              <input
                id="pkg-price"
                name="base_price"
                type="number"
                min="0"
                step="500"
                required
                className="input"
                placeholder="150000"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="pkg-shoots" className="text-sm font-medium text-ink-strong">
                Shoots included
              </label>
              <input
                id="pkg-shoots"
                name="shoots_included"
                type="number"
                min="1"
                defaultValue="1"
                className="input"
              />
            </div>
          </div>

          <p className="text-xs text-ink-muted">
            Add-ons are set up on the package once it exists.
          </p>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={close} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create package'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
