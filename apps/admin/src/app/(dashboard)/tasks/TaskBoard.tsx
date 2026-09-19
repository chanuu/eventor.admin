'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
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
  job_ref: string;
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
  rail: string;
  edge: string;
};

const COLUMNS: Column[] = [
  { key: 'pending',     label: 'To do',       pill: 'bg-[#EFF3F6] text-[#4d6274]', rail: 'bg-[#8BC53F]', edge: 'before:bg-[#8BC53F]' },
  { key: 'in_progress', label: 'In progress', pill: 'bg-[#FFF3E6] text-[#a8631f]', rail: 'bg-[#E9A23B]', edge: 'before:bg-[#E9A23B]' },
  { key: 'blocked',     label: 'Blocked',     pill: 'bg-red-50 text-red-700',      rail: 'bg-[#E4685D]', edge: 'before:bg-[#E4685D]' },
  { key: 'done',        label: 'Done',        pill: 'bg-lime-soft text-lime-text', rail: 'bg-[#4FA88B]', edge: 'before:bg-[#4FA88B]' },
];

/** Pointer travel before a press counts as a drag rather than a click. */
const DRAG_THRESHOLD_PX = 5;

type DragState = {
  id: string;
  width: number;
  height: number;
  /** Where inside the card the pointer grabbed it, so it does not jump on pick-up. */
  grabX: number;
  grabY: number;
  x: number;
  y: number;
};

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

/** The card itself — rendered both in its column and as the floating copy. */
function TaskCard({
  task,
  col,
  floating = false,
  onJobClick,
}: {
  task: BoardTask;
  col: Column;
  floating?: boolean;
  onJobClick?: (e: React.MouseEvent) => void;
}) {
  const d = due(task.due_at, task.status);
  const pct = task.job_total > 0 ? Math.round((task.job_done / task.job_total) * 100) : 0;

  const motion = floating
    ? 'shadow-card-md scale-[1.04] -rotate-2 cursor-grabbing'
    : 'cursor-grab transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-card-md';

  return (
    <div
      className={`relative bg-white rounded-xl border border-line p-3.5 pl-4
        before:absolute before:left-0 before:top-3 before:bottom-3 before:w-1
        before:rounded-full ${col.edge} ${motion}`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-bold text-ink-strong leading-snug">{task.title}</p>
          <Link
            href={`/jobs/${task.job_id}`}
            onClick={onJobClick}
            className="text-[12.5px] text-ink-mid hover:text-primary block mt-0.5 truncate"
          >
            <span className="font-mono text-ink-muted">{task.job_ref}</span> {task.job_title}
          </Link>
        </div>
        <Avatar name={task.assignee_name} url={task.assignee_avatar} size={32} />
      </div>

      {task.stage_name && (
        <span className="inline-block mt-2.5 text-[10.5px] font-bold uppercase tracking-wider
                         text-ink-mid bg-panel border border-line-soft rounded-md px-2 py-1">
          {task.stage_name}
        </span>
      )}

      {d && (
        <div className="mt-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] ${d.cls}`}>
            <span aria-hidden>{d.icon}</span>
            {d.label}
          </span>
        </div>
      )}

      {task.job_total > 0 && (
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
              {task.job_done}/{task.job_total}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TaskBoard({ tasks }: { tasks: BoardTask[] }) {
  const [items, setItems] = useState(tasks);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [overCol, setOverCol] = useState<TaskStatus | null>(null);
  const [detail, setDetail] = useState<BoardTask | null>(null);
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();
  const router = useRouter();

  // Press bookkeeping lives in a ref so pointermove does not re-render per pixel.
  const press = useRef<{
    id: string;
    startX: number;
    startY: number;
    grabX: number;
    grabY: number;
    width: number;
    height: number;
    moved: boolean;
  } | null>(null);

  // Lets commit() read the current list without depending on it, so the
  // callback identity stays stable.
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Props win whenever the server sends a fresh list.
  const [seen, setSeen] = useState(tasks);
  if (seen !== tasks) {
    setSeen(tasks);
    setItems(tasks);
  }

  const commit = useCallback(
    (id: string, status: TaskStatus) => {
      // Read through the ref, never inside a setState updater: React invokes
      // updaters twice in development, which fired the action twice per drop.
      const before = itemsRef.current;
      const task = before.find((t) => t.id === id);
      if (!task || task.status === status) return;

      const wasDone = task.status === 'done';
      const nowDone = status === 'done';

      setItems(before.map((t) => (t.id === id ? { ...t, status } : t)));
      setError('');

      startTransition(async () => {
        const result = await moveTask(id, status);
        if (result.error) {
          setItems(before); // put it back where it was
          setError(result.error);
          return;
        }

        // Only refetch when finishing or reopening: that shifts the job's
        // progress counts and can advance its status. Moving between the other
        // columns changes nothing outside this board, and refreshing for it just
        // makes the card flash.
        if (wasDone !== nowDone) router.refresh();
      });
    },
    [router],
  );

  /**
   * Which column sits under this point. The floating card sets
   * pointer-events:none, so elementFromPoint sees the column beneath it.
   */
  function columnAt(x: number, y: number): TaskStatus | null {
    const el = document.elementFromPoint(x, y);
    const host = el?.closest('[data-col]');
    return (host?.getAttribute('data-col') as TaskStatus) ?? null;
  }

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const p = press.current;
      if (!p) return;

      if (!p.moved) {
        const far =
          Math.abs(e.clientX - p.startX) > DRAG_THRESHOLD_PX ||
          Math.abs(e.clientY - p.startY) > DRAG_THRESHOLD_PX;
        if (!far) return;
        p.moved = true;
      }

      // Stop the page text-selecting or scrolling under the card.
      e.preventDefault();

      setDrag({
        id: p.id,
        width: p.width,
        height: p.height,
        grabX: p.grabX,
        grabY: p.grabY,
        x: e.clientX,
        y: e.clientY,
      });
      setOverCol(columnAt(e.clientX, e.clientY));
    }

    function onUp(e: PointerEvent) {
      const p = press.current;
      press.current = null;

      if (p?.moved) {
        const target = columnAt(e.clientX, e.clientY);
        if (target) commit(p.id, target);
      }

      setDrag(null);
      setOverCol(null);
    }

    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [commit]);

  function startPress(e: React.PointerEvent, task: BoardTask) {
    // Left button only, and never when the press starts on the job link.
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('a')) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    press.current = {
      id: task.id,
      startX: e.clientX,
      startY: e.clientY,
      grabX: e.clientX - rect.left,
      grabY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
    };
  }

  const dragged = drag ? items.find((t) => t.id === drag.id) ?? null : null;
  const draggedCol = dragged ? COLUMNS.find((c) => c.key === dragged.status) ?? COLUMNS[0] : null;

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
          const isOver = overCol === col.key && drag !== null;

          return (
            <section
              key={col.key}
              data-col={col.key}
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
                    // Leave a gap the same size, so the column does not reflow
                    // the moment the card lifts off.
                    if (drag?.id === t.id) {
                      return (
                        <div
                          key={t.id}
                          style={{ height: drag.height }}
                          className="rounded-xl border-2 border-dashed border-primary/30 bg-panel"
                        />
                      );
                    }

                    return (
                      <div
                        key={t.id}
                        onPointerDown={(e) => startPress(e, t)}
                        onClick={() => {
                          if (!drag) setDetail(t);
                        }}
                        className="touch-manipulation select-none"
                      >
                        <TaskCard task={t} col={col} onJobClick={(e) => e.stopPropagation()} />
                      </div>
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

      {/* The card genuinely under the cursor. pointer-events-none so the column
          beneath it can still be detected. */}
      {drag && dragged && draggedCol && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{ left: drag.x - drag.grabX, top: drag.y - drag.grabY, width: drag.width }}
        >
          <TaskCard task={dragged} col={draggedCol} floating />
        </div>
      )}

      <TaskDetailDialog task={detail} onClose={() => setDetail(null)} />

      <p className="text-[11.5px] text-ink-muted flex items-center gap-1.5">
        <span aria-hidden>↔</span>
        Drag a card to change its status, or click one to open it and leave a comment.
      </p>
    </div>
  );
}
