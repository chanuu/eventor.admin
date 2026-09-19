'use server';

import { revalidatePath } from 'next/cache';
import { requireCapabilityCtx } from '@/lib/staff';
import { getStaff } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';

export type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'done';

const STATUSES: TaskStatus[] = ['pending', 'in_progress', 'blocked', 'done'];

/**
 * Moves a task between board columns.
 *
 * Deliberately does NOT require jobs.write: the job_tasks_update_own policy lets
 * an assignee work their own queue whatever their role, which is the whole point
 * of the board for an editor. RLS decides — if the caller owns neither the task
 * nor jobs.write, the update matches no rows and we say so.
 */
export async function moveTask(
  taskId: string,
  status: TaskStatus,
): Promise<{ error?: string }> {
  const staff = await getStaff();
  if (!staff) return { error: 'Unauthorized.' };
  if (!STATUSES.includes(status)) return { error: 'Unknown status.' };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('job_tasks')
    .update({ status })
    .eq('id', taskId)
    .eq('studio_id', staff.studio_id)
    .select('id');

  if (error) {
    console.error('[moveTask]', error);
    return { error: error.message };
  }
  if (!data || data.length === 0) {
    return { error: 'That task is not yours to move.' };
  }

  revalidatePath('/tasks');
  return {};
}

/** Assigns or unassigns a task. Managing who does what needs jobs.write. */
export async function assignTask(
  taskId: string,
  assigneeId: string | null,
): Promise<{ error?: string }> {
  const ctx = await requireCapabilityCtx('jobs.write');
  if (!ctx) return { error: 'Unauthorized.' };

  const supabase = createClient();
  const { error } = await supabase
    .from('job_tasks')
    .update({ assignee_id: assigneeId })
    .eq('id', taskId)
    .eq('studio_id', ctx.studio_id);

  if (error) {
    console.error('[assignTask]', error);
    return { error: error.message };
  }

  revalidatePath('/tasks');
  return {};
}

export async function createTask(
  jobId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const ctx = await requireCapabilityCtx('jobs.write');
  if (!ctx) return { error: 'Unauthorized.' };

  const title = (formData.get('title') as string | null)?.trim();
  if (!title) return { error: 'Give the task a title.' };

  const stageId = (formData.get('stage_id') as string) || null;
  const assigneeId = (formData.get('assignee_id') as string) || null;
  const dueRaw = (formData.get('due_at') as string) || '';

  // Confirm the job belongs to this studio before writing a task onto it.
  const supabase = createClient();
  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('studio_id', ctx.studio_id)
    .maybeSingle();

  if (!job) return { error: 'Job not found.' };

  const { error } = await supabase.from('job_tasks').insert({
    studio_id: ctx.studio_id,
    job_id: jobId,
    stage_id: stageId,
    title,
    notes: (formData.get('notes') as string | null)?.trim() || null,
    assignee_id: assigneeId,
    due_at: dueRaw ? new Date(dueRaw).toISOString() : null,
  });

  if (error) {
    console.error('[createTask]', error);
    return { error: error.message };
  }

  revalidatePath('/tasks');
  revalidatePath(`/jobs/${jobId}`);
  return {};
}

export async function deleteTask(taskId: string): Promise<{ error?: string }> {
  const ctx = await requireCapabilityCtx('jobs.write');
  if (!ctx) return { error: 'Unauthorized.' };

  const supabase = createClient();
  const { error } = await supabase
    .from('job_tasks')
    .delete()
    .eq('id', taskId)
    .eq('studio_id', ctx.studio_id);

  if (error) {
    console.error('[deleteTask]', error);
    return { error: error.message };
  }

  revalidatePath('/tasks');
  return {};
}

// ─── Pipeline stages ────────────────────────────────────────────────────────

export async function createStage(formData: FormData): Promise<{ error?: string }> {
  const ctx = await requireCapabilityCtx('jobs.write');
  if (!ctx) return { error: 'Unauthorized.' };

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) return { error: 'Give the stage a name.' };

  const supabase = createClient();

  // Append to the end of the pipeline.
  const { data: last } = await supabase
    .from('task_stages')
    .select('sort_order')
    .eq('studio_id', ctx.studio_id)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder =
    ((last as { sort_order: number }[] | null)?.[0]?.sort_order ?? 0) + 10;

  const advances = (formData.get('advances_job_to') as string) || null;

  const { error } = await supabase.from('task_stages').insert({
    studio_id: ctx.studio_id,
    name,
    description: (formData.get('description') as string | null)?.trim() || null,
    default_role_id: (formData.get('default_role_id') as string) || null,
    advances_job_to: advances,
    sort_order: nextOrder,
  });

  if (error) {
    console.error('[createStage]', error);
    return { error: error.message };
  }

  revalidatePath('/settings');
  return {};
}

export async function updateStage(
  stageId: string,
  formData: FormData,
): Promise<{ error?: string }> {
  const ctx = await requireCapabilityCtx('jobs.write');
  if (!ctx) return { error: 'Unauthorized.' };

  const name = (formData.get('name') as string | null)?.trim();
  if (!name) return { error: 'Give the stage a name.' };

  const supabase = createClient();
  const { error } = await supabase
    .from('task_stages')
    .update({
      name,
      description: (formData.get('description') as string | null)?.trim() || null,
      default_role_id: (formData.get('default_role_id') as string) || null,
      advances_job_to: (formData.get('advances_job_to') as string) || null,
    })
    .eq('id', stageId)
    .eq('studio_id', ctx.studio_id);

  if (error) {
    console.error('[updateStage]', error);
    return { error: error.message };
  }

  revalidatePath('/settings');
  return {};
}

export async function toggleStage(
  stageId: string,
  isActive: boolean,
): Promise<{ error?: string }> {
  const ctx = await requireCapabilityCtx('jobs.write');
  if (!ctx) return { error: 'Unauthorized.' };

  const supabase = createClient();
  const { error } = await supabase
    .from('task_stages')
    .update({ is_active: isActive })
    .eq('id', stageId)
    .eq('studio_id', ctx.studio_id);

  if (error) return { error: error.message };
  revalidatePath('/settings');
  return {};
}

/**
 * Removes a stage. Tasks already in it are kept — their stage_id is set to NULL
 * by the FK, so no work is lost, it just stops belonging to a stage.
 */
export async function deleteStage(stageId: string): Promise<{ error?: string }> {
  const ctx = await requireCapabilityCtx('jobs.write');
  if (!ctx) return { error: 'Unauthorized.' };

  const supabase = createClient();
  const { error } = await supabase
    .from('task_stages')
    .delete()
    .eq('id', stageId)
    .eq('studio_id', ctx.studio_id);

  if (error) return { error: error.message };
  revalidatePath('/settings');
  return {};
}

/** Swaps a stage with its neighbour, so the pipeline reads in work order. */
export async function moveStage(
  stageId: string,
  direction: 'up' | 'down',
): Promise<{ error?: string }> {
  const ctx = await requireCapabilityCtx('jobs.write');
  if (!ctx) return { error: 'Unauthorized.' };

  const supabase = createClient();
  const { data } = await supabase
    .from('task_stages')
    .select('id, sort_order')
    .eq('studio_id', ctx.studio_id)
    .order('sort_order');

  const list = (data ?? []) as { id: string; sort_order: number }[];
  const i = list.findIndex((s) => s.id === stageId);
  const j = direction === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return {};

  await Promise.all([
    supabase.from('task_stages').update({ sort_order: list[j].sort_order }).eq('id', list[i].id),
    supabase.from('task_stages').update({ sort_order: list[i].sort_order }).eq('id', list[j].id),
  ]);

  revalidatePath('/settings');
  return {};
}

// ─── Allocation from the job's Tasks tab ────────────────────────────────────

/**
 * Sets any of assignee / deadline / status in one call.
 *
 * Status is separated from the other two on purpose: RLS lets an assignee move
 * their own task, but only jobs.write may allocate work or set deadlines. So a
 * status-only change goes through the user's own client (policy decides), while
 * touching assignee or due date requires the capability up front.
 */
export async function allocateTask(
  taskId: string,
  patch: { assigneeId?: string | null; dueAt?: string | null; status?: TaskStatus },
): Promise<{ error?: string }> {
  const staff = await getStaff();
  if (!staff) return { error: 'Unauthorized.' };

  const wantsAllocation = 'assigneeId' in patch || 'dueAt' in patch;
  if (wantsAllocation && !staff.permissions.includes('jobs.write')) {
    return { error: 'You cannot allocate work.' };
  }

  const update: Record<string, unknown> = {};
  if ('assigneeId' in patch) update.assignee_id = patch.assigneeId;
  if ('dueAt' in patch) {
    update.due_at = patch.dueAt ? new Date(patch.dueAt).toISOString() : null;
  }
  if (patch.status) {
    if (!STATUSES.includes(patch.status)) return { error: 'Unknown status.' };
    update.status = patch.status;
  }
  if (Object.keys(update).length === 0) return {};

  const supabase = createClient();
  const { data, error } = await supabase
    .from('job_tasks')
    .update(update)
    .eq('id', taskId)
    .eq('studio_id', staff.studio_id)
    .select('id, job_id');

  if (error) {
    console.error('[allocateTask]', error);
    return { error: error.message };
  }
  if (!data || data.length === 0) return { error: 'That task is not yours to change.' };

  const jobId = (data[0] as { job_id: string }).job_id;
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath('/tasks');
  return {};
}

/**
 * Pulls in any pipeline stages this job does not have a task for yet — for jobs
 * created before a stage was added, or before the pipeline existed at all.
 */
export async function syncJobTasks(jobId: string): Promise<{ error?: string; added?: number }> {
  const ctx = await requireCapabilityCtx('jobs.write');
  if (!ctx) return { error: 'Unauthorized.' };

  const supabase = createClient();

  // RLS proves the job is ours before we ask the function to write to it.
  const { data: job } = await supabase
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('studio_id', ctx.studio_id)
    .maybeSingle();

  if (!job) return { error: 'Job not found.' };

  const { data, error } = await supabase.rpc('seed_job_tasks', { p_job_id: jobId });
  if (error) {
    console.error('[syncJobTasks]', error);
    return { error: error.message };
  }

  revalidatePath(`/jobs/${jobId}`);
  revalidatePath('/tasks');
  return { added: (data as number) ?? 0 };
}

// ─── Comments ───────────────────────────────────────────────────────────────

export type TaskComment = {
  id: string;
  body: string;
  created_at: string;
  author_name: string | null;
  author_avatar: string | null;
  is_mine: boolean;
};

export async function listTaskComments(
  taskId: string,
): Promise<{ error?: string; comments: TaskComment[] }> {
  const me = await getStaff();
  if (!me) return { error: 'Unauthorized.', comments: [] };

  const supabase = createClient();
  const { data, error } = await supabase
    .from('task_comments')
    .select('id, body, created_at, author_id, staff(full_name, avatar_url)')
    .eq('task_id', taskId)
    .order('created_at');

  if (error) {
    console.error('[listTaskComments]', error);
    return { error: error.message, comments: [] };
  }

  const rows = (data ?? []) as unknown as {
    id: string;
    body: string;
    created_at: string;
    author_id: string | null;
    staff: { full_name: string; avatar_url: string | null } | null;
  }[];

  return {
    comments: rows.map((r) => ({
      id: r.id,
      body: r.body,
      created_at: r.created_at,
      author_name: r.staff?.full_name ?? null,
      author_avatar: r.staff?.avatar_url ?? null,
      is_mine: r.author_id === me.id,
    })),
  };
}

/**
 * Posts a comment as the caller.
 *
 * No capability check on purpose — the RLS policy allows any active staff to
 * comment as themselves, because the common case is an editor (who has no
 * jobs.write) asking for clarification on work allocated to them.
 */
export async function addTaskComment(
  taskId: string,
  body: string,
): Promise<{ error?: string }> {
  const me = await getStaff();
  if (!me) return { error: 'Unauthorized.' };

  const text = body.trim();
  if (!text) return { error: 'Write something first.' };
  if (text.length > 4000) return { error: 'That comment is too long.' };

  const supabase = createClient();

  // RLS proves the task is in our studio; this also stops a comment being
  // attached to another studio's task id.
  const { data: task } = await supabase
    .from('job_tasks')
    .select('id, job_id')
    .eq('id', taskId)
    .eq('studio_id', me.studio_id)
    .maybeSingle();

  if (!task) return { error: 'Task not found.' };

  const { error } = await supabase.from('task_comments').insert({
    studio_id: me.studio_id,
    task_id: taskId,
    author_id: me.id,
    body: text,
  });

  if (error) {
    console.error('[addTaskComment]', error);
    return { error: error.message };
  }

  revalidatePath('/tasks');
  revalidatePath(`/jobs/${(task as { job_id: string }).job_id}`);
  return {};
}

export async function deleteTaskComment(commentId: string): Promise<{ error?: string }> {
  const me = await getStaff();
  if (!me) return { error: 'Unauthorized.' };

  const supabase = createClient();
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId)
    .eq('studio_id', me.studio_id);

  if (error) return { error: error.message };
  revalidatePath('/tasks');
  return {};
}
