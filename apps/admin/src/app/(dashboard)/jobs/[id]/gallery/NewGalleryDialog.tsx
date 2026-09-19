'use client';

import { useState } from 'react';
import Modal from '@/components/Modal';
import { createGallery } from './actions';

type Shoot = { id: string; shoot_type: string | null; scheduled_at: string | null };

/**
 * "New gallery" button and its dialog.
 *
 * The form used to sit permanently below the list, which pushed the galleries
 * themselves off the top of the page. It only matters when you are creating one,
 * so it lives in a dialog now.
 */
export default function NewGalleryDialog({
  jobId,
  studioId,
  shoots,
}: {
  jobId: string;
  studioId: string;
  shoots: Shoot[];
}) {
  const [open, setOpen] = useState(false);

  // A successful create redirects to the new gallery, so the dialog never needs
  // to close itself on success.
  const action = createGallery.bind(null, jobId, studioId);

  return (
    <>
      <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
        New gallery
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="New gallery" width="max-w-lg">
        <form action={action} className="flex flex-col gap-4 p-6">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="gallery-title" className="text-[13px] font-medium text-ink-strong">
              Gallery title <span className="text-red-500">*</span>
            </label>
            <input
              id="gallery-title"
              name="title"
              required
              autoFocus
              placeholder="e.g. Wedding Day Photos"
              className="input"
            />
          </div>

          {shoots.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="gallery-shoot" className="text-[13px] font-medium text-ink-strong">
                Link to shoot <span className="text-ink-muted font-normal">(optional)</span>
              </label>
              <select id="gallery-shoot" name="shoot_id" className="input">
                <option value="">— Not linked to a specific shoot —</option>
                {shoots.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.shoot_type ?? 'Shoot'}
                    {s.scheduled_at
                      ? ` · ${new Date(s.scheduled_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}`
                      : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="gallery-deadline" className="text-[13px] font-medium text-ink-strong">
              Selection deadline <span className="text-ink-muted font-normal">(optional)</span>
            </label>
            <input id="gallery-deadline" name="selection_deadline" type="date" className="input" />
            <p className="text-[11.5px] text-ink-muted">
              Shown to the client as the date their choices are due.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create gallery
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
