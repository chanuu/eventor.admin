'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import { allocateTask, syncJobTasks, type TaskStatus } from '../../tasks/actions';

export type JobTask = {
  id: string;
  title: string;
  notes: string | null;
  status: TaskStatus;
  assignee_id: string | null;
  due_at: string | null;
  stage_name: string | null;
};

export type StaffOption = { id: string; name: string };

const STATUS_PILL: Record<TaskStatus, { label: string; cls: string }> = {
  pending: { label: 'Open', cls: 'bg-panel text-ink-mid' },
  in_progress: { label: 'In progress', cls: 'bg-[#FFF3E6] text-[#a8631f]' },
  blocked: { label: 'Blocked', cls: 'bg-red-50 text-red-700' },
  done: { label: 'Done', cls: 'bg-lime-soft text-lime-text' },
};

function formatDue(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-LK', { dateStyle: 'medium' });
}

export default function JobTasksPanel({
  jobId,
  tasks,
  staff,
  canAllocate,
}: {
  jobId: string;
  tasks: JobTask[];
  staff: StaffOption[];
  canAllocate: boolean;
}) {
  const [editing, setEditing] = useState<JobTask | null>(null);
  const [assignee, setAssignee] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  function openEdit(task: JobTask) {
    setEditing(task);
    setAssignee(task.assignee_id ?? '');
    setDueAt(task.due_at ? task.due_at.slice(0, 10) : '');
    setError('');
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError('');

    const result = await allocateTask(editing.id, {
      assigneeId: assignee || null,
      dueAt: dueAt || null,
    });

    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function sync() {
    setBusy(true);
    setError('');
    const result = await syncJobTasks(jobId);
    setBusy(false);
    if (result.error) setError(result.error);
    else router.refresh();
  }

  const nameOf = (id: string | null) =>
    id ? staff.find((m) => m.id === id)?.name ?? 'Unknown' : 'Unassigned';

  return (
    <div className="bg-white rounded-2xl border border-line shadow-card p-5 md:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="h-8 w-8 rounded-lg bg-lime-soft text-lime-text grid place-items-center text-sm"
          >
            ☑
          </span>
          <h2 className="text-base font-extrabold text-ink-strong">Job checklist</h2>
        </div>

        <Link href="/tasks?scope=studio" className="btn-secondary">
          Open board
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      {tasks.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-line px-6 py-10 text-center">
          <p className="text-sm text-ink-mid">
            No tasks on this job yet. Pull in your studio&rsquo;s list below.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {tasks.map((t) => {
            const pill = STATUS_PILL[t.status];
            const isDone = t.status === 'done';
            const due = formatDue(t.due_at);

            return (
              <div
                key={t.id}
                className={`flex items-center gap-3.5 rounded-xl border border-line-soft px-3.5 py-3
                  ${isDone ? 'bg-panel/60' : 'bg-white'}`}
              >
                {/* Read-only marker — status is changed on the board, not here. */}
                <span
                  aria-hidden
                  className={`shrink-0 h-8 w-8 rounded-lg grid place-items-center text-sm
                    ${isDone
                      ? 'bg-[#8BC53F] text-white'
                      : 'bg-white border border-line'}`}
                >
                  {isDone ? '✓' : ''}
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-bold leading-snug ${
                      isDone ? 'text-ink-muted line-through' : 'text-ink-strong'
                    }`}
                  >
                    {t.title}
                  </p>
                  <p className="text-xs text-ink-muted mt-0.5 truncate">
                    {nameOf(t.assignee_id)}
                    {due && ` · due ${due}`}
                  </p>
                </div>

                <span className={`pill shrink-0 ${pill.cls}`}>{pill.label}</span>

                {canAllocate && (
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
                    className="btn-secondary text-xs h-8 px-3 shrink-0"
                  >
                    Edit
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap mt-4 pt-4 border-t border-line-soft">
        <p className="text-xs text-ink-muted">
          Status is changed on the board — this list is read-only.
        </p>
        {canAllocate && (
          <button
            type="button"
            onClick={sync}
            disabled={busy}
            className="text-xs font-semibold text-primary disabled:opacity-50"
          >
            {busy ? 'Checking…' : 'Sync with checklist'}
          </button>
        )}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.title ?? 'Allocate task'}
        width="max-w-md"
      >
        <div className="p-6 flex flex-col gap-4">
          {editing?.notes && <p className="text-sm text-ink-mid">{editing.notes}</p>}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="alloc-staff" className="text-sm font-medium text-ink-strong">
              Allocated to
            </label>
            <select
              id="alloc-staff"
              className="input"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            >
              <option value="">— Unassigned —</option>
              {staff.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="alloc-due" className="text-sm font-medium text-ink-strong">
              Deadline
            </label>
            <input
              id="alloc-due"
              type="date"
              className="input"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
            <p className="text-xs text-ink-muted">
              Leave empty for no deadline.
            </p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setEditing(null)}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="button" className="btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
