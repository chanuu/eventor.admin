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
    : <span>No jobs yet. <a href="/jobs/new" className="text-[#2D6A4F] hover:underline">Create your first job</a></span>;

  return (
    <div>
      {/* Page heading */}
      <h1 className="page-title">Jobs</h1>
      <p className="breadcrumb mb-6">
        Main Menu / <span className="text-[#2D6A4F]">Jobs</span>
      </p>

      {/* Content panel */}
      <div className="bg-white rounded-2xl shadow-card p-6">

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-5">
          {/* Search */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 h-10 flex-1 max-w-md">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" placeholder="Search here..." className="flex-1 bg-transparent text-sm text-gray-600 placeholder-gray-400 outline-none" />
          </div>

          <div className="flex-1" />

          {/* Status filters */}
          <div className="flex gap-1.5 flex-wrap">
            <FilterTab href="/jobs" label="All" active={!searchParams.status} />
            {STATUS_ORDER.map((s) => (
              <FilterTab key={s} href={`/jobs?status=${s}`} label={s} active={searchParams.status === s} />
            ))}
          </div>

          {/* New job */}
          <a href="/jobs/new" className="btn-primary ml-2 px-5 whitespace-nowrap">
            + New Job
          </a>
        </div>

        {/* Row count */}
        {totalCount > 0 && (
          <p className="text-xs text-gray-400 mb-3">
            {from + 1}–{Math.min(to + 1, totalCount)} of {totalCount} job{totalCount !== 1 ? 's' : ''}
          </p>
        )}

        <JobsTable jobs={jobs} emptyMessage={emptyMessage} />

        <Pagination page={page} totalPages={totalPages} pathname="/jobs" params={paginationParams} />
      </div>
    </div>
  );
}

function FilterTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <a
      href={href}
      className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors
        ${active ? 'bg-[#2D6A4F] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
    >
      {label}
    </a>
  );
}
