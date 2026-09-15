import Link from 'next/link';
import { requireCapability, requireFeature } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';
import StagesEditor, { type Stage, type Role } from './StagesEditor';

export default async function TaskStagesPage() {
  const ctx = await requireCapability('jobs.write');
  await requireFeature('tasks');
  const supabase = createClient();

  const [{ data: stagesRaw }, { data: rolesRaw }] = await Promise.all([
    supabase
      .from('task_stages')
      .select('id, name, description, default_role_id, advances_job_to, is_active')
      .order('sort_order'),
    supabase.from('roles').select('id, name').order('name'),
  ]);

  const rows = (stagesRaw ?? []) as Omit<Stage, 'task_count'>[];
  const roles = (rolesRaw ?? []) as Role[];

  // How many jobs already carry this task, so removing one is an informed choice.
  const counts = await Promise.all(
    rows.map(async (s) => {
      const { count } = await supabase
        .from('job_tasks')
        .select('id', { count: 'exact', head: true })
        .eq('stage_id', s.id);
      return count ?? 0;
    }),
  );

  const stages: Stage[] = rows.map((s, i) => ({ ...s, task_count: counts[i] }));

  return (
    <div style={{ maxWidth: 860 }}>
      <Link href="/tasks" className="text-[13px] text-ink-muted">
        ← My work
      </Link>
      <h1 className="page-title mt-2">Job checklist</h1>
      <p className="breadcrumb mb-6">
        The tasks every new job at {ctx.studioName} starts with. Yours to arrange however
        the studio actually works.
      </p>

      <StagesEditor stages={stages} roles={roles} />

      <p className="text-[12px] text-ink-muted mt-4 leading-relaxed">
        Every new job is created with this list, unassigned and with no deadlines — you
        allocate the work on the job&rsquo;s Tasks tab. Changes here only affect jobs created
        afterwards; existing jobs pick up new items via <strong>Sync with checklist</strong>.
        Marking a task done never drags a job backwards, so reopening one will not undo a
        delivered job.
      </p>
    </div>
  );
}
