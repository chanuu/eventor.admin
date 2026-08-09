import { createClient } from '@/lib/supabase/server';
import Pagination from '@/components/Pagination';
import JobsTable, { type JobRow } from './JobsTable';

const PAGE_SIZE = 25;

const STATUS_ORDER = ['lead', 'quoted', 'contracted', 'active', 'editing', 'proofing', 'delivered', 'archived'];

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const supabase  = createClient();
  const page      = Math.max(1, Number(searchParams.page) || 1);
  const from      = (page - 1) * PAGE_SIZE;
  const to        = from + PAGE_SIZE - 1;

  let query = supabase
    .from('jobs')
    .select('id, title, event_type, status, total_price, created_at, clients(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (searchParams.status) query = query.eq('status', searchParams.status);

  const { data: raw, count } = await query;
  const jobs       = (raw ?? []) as unknown as JobRow[];
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const paginationParams: Record<string, string> = {};
  if (searchParams.status) paginationParams.status = searchParams.status;

  const emptyMessage = searchParams.status
    ? `No jobs with status "${searchParams.status}".`
    : (
      <span>
        No jobs yet.{' '}
        <a href="/jobs/new" style={{ color: '#2563eb' }}>Create your first job</a>
      </span>
    );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Jobs</h1>
        <a
          href="/jobs/new"
          style={{ background: '#2563eb', color: '#fff', padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}
        >
          + New job
        </a>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <FilterTab href="/jobs" label="All" active={!searchParams.status} />
        {STATUS_ORDER.map((s) => (
          <FilterTab
            key={s}
            href={`/jobs?status=${s}`}
            label={s}
            active={searchParams.status === s}
          />
        ))}
      </div>

      {/* Row count */}
      {totalCount > 0 && (
        <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
          {from + 1}–{Math.min(to + 1, totalCount)} of {totalCount} job{totalCount !== 1 ? 's' : ''}
        </div>
      )}

      <JobsTable jobs={jobs} emptyMessage={emptyMessage} />

      <Pagination
        page={page}
        totalPages={totalPages}
        pathname="/jobs"
        params={paginationParams}
      />
    </div>
  );
}

function FilterTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <a
      href={href}
      style={{
        padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
        background: active ? '#2563eb' : '#f3f4f6',
        color: active ? '#fff' : '#374151',
        textDecoration: 'none',
        textTransform: 'capitalize',
      }}
    >
      {label}
    </a>
  );
}
