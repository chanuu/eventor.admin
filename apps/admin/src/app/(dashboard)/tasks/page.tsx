import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getStaff, requireFeature } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';
import TaskBoard, { type BoardTask } from './TaskBoard';

type Row = {
  id: string;
  title: string;
  status: BoardTask['status'];
  due_at: string | null;
  job_id: string;
  assignee_id: string | null;
  jobs: { job_no: number; title: string } | null;
  task_stages: { name: string } | null;
  staff: { full_name: string; avatar_url: string | null } | null;
};

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { scope?: string };
}) {
  await requireFeature('tasks');

  const staff = await getStaff();
  if (!staff) redirect('/login');

  // Everyone sees their own queue; the studio view is for whoever schedules work.
  const canSeeAll = staff.permissions.includes('jobs.write');
  const scope = canSeeAll && searchParams.scope === 'studio' ? 'studio' : 'mine';

  const supabase = createClient();

  let query = supabase
    .from('job_tasks')
    .select(
      'id, title, status, due_at, job_id, assignee_id, jobs(job_no, title), task_stages(name), staff(full_name, avatar_url)',
    )
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('sort_order');

  if (scope === 'mine') query = query.eq('assignee_id', staff.id);

  const { data } = await query;

  const rows = (data ?? []) as unknown as Row[];

  // A card shows how far its whole job has got, so fetch the sibling tasks for
  // the jobs on screen. Bounded by the jobs in view, not the studio.
  const jobIds = Array.from(new Set(rows.map((r) => r.job_id)));
  const { data: siblingRaw } = jobIds.length
    ? await supabase.from('job_tasks').select('job_id, status').in('job_id', jobIds)
    : { data: [] };

  const progress = new Map<string, { done: number; total: number }>();
  for (const sib of (siblingRaw ?? []) as { job_id: string; status: string }[]) {
    const p = progress.get(sib.job_id) ?? { done: 0, total: 0 };
    p.total += 1;
    if (sib.status === 'done') p.done += 1;
    progress.set(sib.job_id, p);
  }

  const tasks: BoardTask[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    due_at: r.due_at,
    job_id: r.job_id,
    job_no: r.jobs?.job_no ?? 0,
    job_title: r.jobs?.title ?? 'Untitled job',
    stage_name: r.task_stages?.name ?? null,
    assignee_name: r.staff?.full_name ?? null,
    assignee_avatar: r.staff?.avatar_url ?? null,
    is_mine: r.assignee_id === staff.id,
    job_done: progress.get(r.job_id)?.done ?? 0,
    job_total: progress.get(r.job_id)?.total ?? 0,
  }));

  const open = tasks.filter((t) => t.status !== 'done').length;
  const completed = tasks.length - open;

  const soonCutoff = new Date();
  soonCutoff.setDate(soonCutoff.getDate() + 10);
  const dueSoon = tasks.filter(
    (t) => t.status !== 'done' && t.due_at && new Date(t.due_at) <= soonCutoff,
  ).length;

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="page-title">{scope === 'mine' ? 'My work' : 'Studio board'}</h1>
          <div className="flex items-center gap-3 flex-wrap text-[12.5px] mt-1">
            <span className="flex items-center gap-1.5 font-semibold text-ink-strong">
              <span className="h-2 w-2 rounded-full bg-[#8BC53F]" aria-hidden />
              {open} open
            </span>
            <span className="text-line" aria-hidden>|</span>
            <span className={dueSoon > 0 ? 'text-[#a8631f]' : 'text-ink-muted'}>
              {dueSoon} due within 10 days
            </span>
            <span className="text-line" aria-hidden>|</span>
            <span className="text-ink-muted">{completed} completed</span>
          </div>
        </div>

        {canSeeAll && (
          <div className="flex gap-2 flex-wrap items-center">
            <Link
              href="/tasks"
              className={scope === 'mine' ? 'btn-primary' : 'btn-secondary'}
            >
              My work
            </Link>
            <Link
              href="/tasks?scope=studio"
              className={scope === 'studio' ? 'btn-primary' : 'btn-secondary'}
            >
              Whole studio
            </Link>
            <Link href="/tasks/stages" className="btn-secondary">Job checklist</Link>
          </div>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-line bg-white px-6 py-12 text-center">
          <p className="text-[14px] font-semibold text-ink-strong">
            {scope === 'mine' ? 'Nothing assigned to you' : 'No tasks yet'}
          </p>
          <p className="text-[13px] text-ink-muted mt-1.5">
            {canSeeAll
              ? 'Create a task and allocate it to whoever is doing the work.'
              : 'Work allocated to you will appear here.'}
          </p>
        </div>
      ) : (
        <TaskBoard tasks={tasks} />
      )}
    </div>
  );
}
