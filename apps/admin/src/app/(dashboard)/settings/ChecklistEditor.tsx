'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createStage,
  updateStage,
  toggleStage,
  deleteStage,
  moveStage,
} from '../tasks/actions';

export type Stage = {
  id: string;
  name: string;
  description: string | null;
  default_role_id: string | null;
  advances_job_to: string | null;
  is_active: boolean;
  task_count: number;
};

export type Role = { id: string; name: string };

const ADVANCE_OPTIONS = [
  { value: '', label: 'Nothing — just tick it off' },
  { value: 'active', label: 'Active' },
  { value: 'editing', label: 'Editing' },
  { value: 'proofing', label: 'Proofing' },
  { value: 'delivered', label: 'Delivered' },
];

export default function StagesEditor({ stages, roles }: { stages: Stage[]; roles: Role[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const router = useRouter();

  async function run(key: string, fn: () => Promise<{ error?: string }>) {
    setBusy(key);
    setError('');
    const result = await fn();
    setBusy(null);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  async function save(stage: Stage, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    await run(stage.id, () => updateStage(stage.id, data));
  }

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy('new');
    setError('');
    const result = await createStage(data);
    setBusy(null);
    if (result.error) {
      setError(result.error);
      return;
    }
    form.reset();
    setAdding(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {stages.map((stage, i) => (
        <form
          key={stage.id}
          onSubmit={(e) => save(stage, e)}
          className={`bg-white rounded-2xl border border-line p-4 md:p-5 ${
            stage.is_active ? '' : 'opacity-60'
          }`}
        >
          <div className="flex items-start gap-3 flex-wrap">
            <div className="flex flex-col gap-1 shrink-0">
              <button
                type="button"
                aria-label="Move earlier"
                disabled={i === 0 || busy !== null}
                onClick={() => run(stage.id, () => moveStage(stage.id, 'up'))}
                className="btn-secondary h-7 w-7 p-0 text-xs disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label="Move later"
                disabled={i === stages.length - 1 || busy !== null}
                onClick={() => run(stage.id, () => moveStage(stage.id, 'down'))}
                className="btn-secondary h-7 w-7 p-0 text-xs disabled:opacity-30"
              >
                ↓
              </button>
            </div>

            <div className="flex-1 min-w-[240px] flex flex-col gap-3">
              <input
                name="name"
                defaultValue={stage.name}
                required
                aria-label="Task name"
                className="input font-semibold"
              />
              <input
                name="description"
                defaultValue={stage.description ?? ''}
                placeholder="What this involves…"
                aria-label="Description"
                className="input text-sm"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    Usually done by
                  </span>
                  <select
                    name="default_role_id"
                    defaultValue={stage.default_role_id ?? ''}
                    className="input"
                  >
                    <option value="">— Anyone —</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    When done, move the job to
                  </span>
                  <select
                    name="advances_job_to"
                    defaultValue={stage.advances_job_to ?? ''}
                    className="input"
                  >
                    {ADVANCE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap mt-3 pt-3 border-t border-line-soft">
            <span className="text-xs text-ink-muted">
              On {stage.task_count} job{stage.task_count !== 1 ? 's' : ''}
            </span>

            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => run(stage.id, () => toggleStage(stage.id, !stage.is_active))}
                className="btn-secondary text-xs h-8 px-3"
              >
                {stage.is_active ? 'Turn off' : 'Turn on'}
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => {
                  if (
                    confirm(
                      `Remove “${stage.name}” from the checklist? Jobs that already have it keep it.`,
                    )
                  ) {
                    run(stage.id, () => deleteStage(stage.id));
                  }
                }}
                className="btn-danger text-xs h-8 px-3"
              >
                Remove
              </button>
              <button type="submit" disabled={busy !== null} className="btn-primary text-xs h-8 px-3">
                {busy === stage.id ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      ))}

      {stages.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-line bg-white px-6 py-10 text-center">
          <p className="text-sm text-ink-mid">
            No tasks in the checklist yet. Add the first one below.
          </p>
        </div>
      )}

      {adding ? (
        <form onSubmit={add} className="bg-white rounded-2xl border border-line shadow-card p-5 flex flex-col gap-3">
          <h2 className="text-sm font-extrabold text-primary">Add a task</h2>

          <input name="name" required autoFocus placeholder="Task name" className="input font-semibold" />
          <input name="description" placeholder="What this involves…" className="input text-sm" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Usually done by
              </span>
              <select name="default_role_id" className="input">
                <option value="">— Anyone —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                When finished, move job to
              </span>
              <select name="advances_job_to" className="input">
                {ADVANCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="submit" disabled={busy === 'new'} className="btn-primary">
              {busy === 'new' ? 'Adding…' : 'Add task'}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn-secondary self-start" onClick={() => setAdding(true)}>
          + Add a task
        </button>
      )}
    </div>
  );
}
