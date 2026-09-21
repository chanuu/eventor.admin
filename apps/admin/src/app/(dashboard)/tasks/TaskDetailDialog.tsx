'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Modal from '@/components/Modal';
import Avatar from '@/components/Avatar';
import {
  listTaskComments,
  addTaskComment,
  deleteTaskComment,
  moveTask,
  type TaskComment,
  type TaskStatus,
} from './actions';
import type { BoardTask } from './TaskBoard';

const STATUS_LABEL: Record<TaskStatus, { label: string; cls: string }> = {
  pending: { label: 'To do', cls: 'bg-[#EFF3F6] text-[#4d6274]' },
  in_progress: { label: 'In progress', cls: 'bg-[#FFF3E6] text-[#a8631f]' },
  blocked: { label: 'Blocked', cls: 'bg-red-50 text-red-700' },
  done: { label: 'Done', cls: 'bg-lime-soft text-lime-text' },
};

function when(iso: string): string {
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString('en-LK', { dateStyle: 'medium' });
}

export default function TaskDetailDialog({
  task,
  onClose,
}: {
  task: BoardTask | null;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [body, setBody] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const taskId = task?.id ?? null;

  useEffect(() => {
    if (!taskId) {
      setComments([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');

    listTaskComments(taskId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.error) setError(result.error);
      else setComments(result.comments);
    });

    return () => {
      cancelled = true;
    };
  }, [taskId]);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!taskId || !body.trim()) return;

    setPosting(true);
    setError('');
    const result = await addTaskComment(taskId, body);
    setPosting(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setBody('');
    const refreshed = await listTaskComments(taskId);
    setComments(refreshed.comments);
  }

  async function remove(id: string) {
    const result = await deleteTaskComment(id);
    if (result.error) {
      setError(result.error);
      return;
    }
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  async function changeStatus(status: TaskStatus) {
    if (!taskId) return;
    setError('');
    const result = await moveTask(taskId, status);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    onClose();
  }

  const status = task ? STATUS_LABEL[task.status] : null;
  const dueLabel = task?.due_at
    ? new Date(task.due_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })
    : 'No deadline';

  return (
    <Modal
      open={task !== null}
      onClose={onClose}
      title={task?.title ?? 'Task'}
      width="max-w-xl"
    >
      {task && (
        <div className="flex flex-col">
          <div className="p-6 flex flex-col gap-4 border-b border-line-soft">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <Link
                  href={`/jobs/${task.job_id}`}
                  className="text-sm text-primary hover:underline"
                >
                  <span className="font-mono text-ink-muted">{task.job_ref}</span>{' '}
                  {task.job_title}
                </Link>
                {task.stage_name && (
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mt-1">
                    {task.stage_name}
                  </p>
                )}
              </div>
              {status && <span className={`pill ${status.cls}`}>{status.label}</span>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                  Allocated to
                </p>
                <div className="flex items-center gap-2">
                  <Avatar name={task.assignee_name} url={task.assignee_avatar} size={26} />
                  <span className="text-sm text-ink-body truncate">
                    {task.assignee_name ?? 'Unassigned'}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                  Deadline
                </p>
                <p className="text-sm text-ink-body">{dueLabel}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-1.5">
                Move to
              </p>
              <div className="flex gap-1.5 flex-wrap">
                {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={s === task.status}
                    onClick={() => changeStatus(s)}
                    className={`pill transition-opacity ${STATUS_LABEL[s].cls}
                      ${s === task.status ? 'opacity-40 cursor-default' : 'hover:opacity-80'}`}
                  >
                    {STATUS_LABEL[s].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Clarifications */}
          <div className="p-6 flex flex-col gap-3">
            <h3 className="text-sm font-extrabold text-ink-strong">
              Comments {comments.length > 0 && `(${comments.length})`}
            </h3>

            {loading ? (
              <p className="text-xs text-ink-muted">Loading…</p>
            ) : comments.length === 0 ? (
              <p className="text-xs text-ink-muted">
                No comments yet. Ask a question here and it stays with the task.
              </p>
            ) : (
              <div className="flex flex-col gap-3 max-h-64 overflow-y-auto">
                {comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-2.5">
                    <Avatar name={c.author_name} url={c.author_avatar} size={28} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-xs font-bold text-ink-strong">
                          {c.author_name ?? 'Former staff'}
                        </span>
                        <span className="text-xs text-ink-muted">{when(c.created_at)}</span>
                        {c.is_mine && (
                          <button
                            type="button"
                            onClick={() => remove(c.id)}
                            className="text-xs text-ink-muted hover:text-red-600 ml-auto"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-ink-body whitespace-pre-wrap mt-0.5">
                        {c.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <form onSubmit={post} className="flex flex-col gap-2 pt-1">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={2}
                placeholder="Ask for clarification…"
                className="input h-auto py-2 resize-y text-sm"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={posting || !body.trim()}
                  className="btn-primary text-xs h-9 px-4 disabled:opacity-50"
                >
                  {posting ? 'Posting…' : 'Comment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Modal>
  );
}
