'use client';

import { useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Avatar from '@/components/Avatar';
import TaskDetailDialog from './TaskDetailDialog';
import { moveTask, type TaskStatus } from './actions';

export type BoardTask = {
  id: string;
  title: string;
  status: TaskStatus;
  due_at: string | null;
  job_id: string;
  job_no: number;
  job_title: string;
  stage_name: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  is_mine: boolean;
  /** Completion of the whole job's checklist, so a card shows its context. */
  job_done: number;
  job_total: number;
};

type Column = {
  key: TaskStatus;
  label: string;
  pill: string;
  /** Colour of the bar across the top of the column. */
  rail: string;
  /** Colour of the stripe down the left of a card in this column. */
  edge: string;
};

const COLUMNS: Column[] = [
  { key: 'pending',     label: 'To do',       pill: 'bg-[#EFF3F6] text-[#4d6274]', rail: 'bg-[#8BC53F]', edge: 'before:bg-[#8BC53F]' },
  { key: 'in_progress', label: 'In progress', pill: 'bg-[#FFF3E6] text-[#a8631f]', rail: 'bg-[#E9A23B]', edge: 'before:bg-[#E9A23B]' },
  { key: 'blocked',     label: 'Blocked',     pill: 'bg-red-50 text-red-700',      rail: 'bg-[#E4685D]', edge: 'before:bg-[#E4685D]' },
  { key: 'done',        label: 'Done',        pill: 'bg-lime-soft text-lime-text', rail: 'bg-[#4FA88B]', edge: 'before:bg-[#4FA88B]' },
];

function due(iso: string | null, status: TaskStatus) {
  if (!iso) return null;
  const date = new Date(iso);
  const label = date.toLocaleDateString('en-LK', { dateStyle: 'medium' });

  if (status === 'done') return { label, cls: 'bg-panel text-ink-muted', icon: '✓' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((date.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) return { label, cls: 'bg-red-50 text-red-700 font-semibold', icon: '⏱' };
  if (days <= 10) return { label, cls: 'bg-[#FFF3E6] text-[#a8631f]', icon: '⏱' };
  return { label, cls: 'bg-panel text-ink-body', icon: '⏱' };
}

export default function TaskBoard({ tasks }: { tasks: BoardTask[] }) {
  // Local copy so a card moves the instant it is dropped; the server call
  // reconciles behind it and we roll back if it is refused.
  const [items, setItems] = useState(tasks);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<BoardTask | null>(null);
  // A drag also fires click on release, so remember whether one happened.
  const draggedRef = useRef(false);
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Props win whenever the server sends a fresh list.
  const [seen, setSeen] = useState(tasks);
  if (seen !== tasks) {
    setSeen(tasks);
    setItems(tasks);
  }

  function drop(status: TaskStatus) {
    setOverCol(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;

    const task = items.find((t) => t.id === id);
    if (!task || task.status === status) return;

    const before = items;
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    setError('');

    startTransition(async () => {
      const result = await moveTask(id, status);
      if (result.error) {
        setItems(before); // put it back where it was
        setError(result.error);
        return;
      }
      // Completing a task can advance the job's status, so refresh.
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          const cards = items.filter((t) => t.status === col.key);
          const isOver = overCol === col.key;

          return (
            <section
              key={col.key}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col.key);
              }}
              onDragLeave={(e) => {
                // Ignore bubbling from children, or the column flickers.
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setOverCol((c) => (c === col.key ? null : c));
              }}
              onDrop={() => drop(col.key)}
              className={`rounded-2xl overflow-hidden transition-all duration-200
                ${isOver ? 'ring-2 ring-primary/40 -translate-y-0.5 shadow-card-md' : 'shadow-card'}`}
            >
              <div className={`h-1.5 ${col.rail}`} />

              <div className={`p-3 transition-colors ${isOver ? 'bg-panel' : 'bg-white'}`}>
                <header className="flex items-center gap-2 mb-3">
                  <span className={`pill ${col.pill}`}>{col.label}</span>
                  <span className="text-[11.5px] text-ink-muted border border-line rounded-full px-2 py-0.5">
                    {cards.length}
                  </span>
                </header>

                <div className="flex flex-col gap-2.5 min-h-[96px]">
                  {cards.map((t) => {
                    const d = due(t.due_at, t.status);
                    const pct =
                      t.job_total > 0 ? Math.round((t.job_done / t.job_total) * 100) : 0;
                    const dragging = dragId === t.id;

                    return (
                      <article
                        key={t.id}
                        draggable
                        onDragStart={() => {
                          draggedRef.current = true;
                          setDragId(t.id);
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverCol(null);
                        }}
                        onClick={() => {
                          // Suppress the click that follows a drop.
                          if (draggedRef.current) {
                            draggedRef.current = false;
                            return;
                          }
                          setDetail(t);
                        }}
                        className={`relative bg-white rounded-xl border border-line p-3.5 pl-4
                          cursor-grab active:cursor-grabbing select-none
                          before:absolute before:left-0 before:top-3 before:bottom-3 before:w-1
                          before:rounded-full ${col.edge}
                          transition-[transform,box-shadow] duration-150 ease-out
                          hover:-translate-y-0.5 hover:shadow-card-md
                          ${dragging
                            ? 'scale-[1.04] -rotate-2 skew-x-[-2deg] shadow-card-md opacity-90 z-10'
                            : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[14.5px] font-bold text-ink-strong leading-snug">
                              {t.title}
                            </p>
                            <Link
                              href={`/jobs/${t.job_id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[12.5px] text-ink-mid hover:text-primary block mt-0.5 truncate"
                            >
                              <span className="font-mono text-ink-muted">#{t.job_no}</span>{' '}
                              {t.job_title}
                            </Link>
                          </div>

                          <Avatar
                            name={t.assignee_name}
                            url={t.assignee_avatar}
                            size={32}
                          />
                        </div>

                        {t.stage_name && (
                          <span className="inline-block mt-2.5 text-[10.5px] font-bold uppercase
                                           tracking-wider text-ink-mid bg-panel border border-line-soft
                                           rounded-md px-2 py-1">
                            {t.stage_name}
                          </span>
                        )}

                        {d && (
                          <div className="mt-2">
                            <span className={`inline-flex items-center gap-1.5 rounded-full
                                              px-2.5 py-1 text-[11.5px] ${d.cls}`}>
                              <span aria-hidden>{d.icon}</span>
                              {d.label}
                            </span>
                          </div>
                        )}

                        {t.job_total > 0 && (
                          <div className="mt-3">
                            <div className="h-1 rounded-full bg-line-soft overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  pct === 100 ? 'bg-[#4FA88B]' : 'bg-[#8BC53F]'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[11px] text-ink-muted">
                                {pct === 100 ? 'Job complete' : `${pct}% of job`}
                              </span>
                              <span className="text-[11px] text-ink-muted">
                                {t.job_done}/{t.job_total}
                              </span>
                            </div>
                          </div>
                        )}
                      </article>
                    );
                  })}

                  {cards.length === 0 && (
                    <div
                      className={`rounded-xl border-2 border-dashed grid place-items-center
                        text-center py-7 px-3 transition-colors
                        ${isOver ? 'border-primary bg-white' : 'border-line'}`}
                    >
                      <div>
                        <div className="h-9 w-9 rounded-lg border border-line grid place-items-center
                                        mx-auto mb-2 text-ink-muted">
                          ✓
                        </div>
                        <p className="text-[12.5px] font-semibold text-ink-mid">Nothing here</p>
                        <p className="text-[11.5px] text-ink-muted mt-0.5">
                          Drop a card to move it in
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <TaskDetailDialog task={detail} onClose={() => setDetail(null)} />

      <p className="text-[11.5px] text-ink-muted flex items-center gap-1.5">
        <span aria-hidden>↔</span>
        Drag a card to change its status, or click one to open it and leave a comment.
      </p>
    </div>
  );
}
