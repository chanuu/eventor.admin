import Link from "next/link";
import { createClient } from '@/lib/supabase/server';
import Pagination from '@/components/Pagination';
import JobsTable, { type JobRow } from './JobsTable';
import StatusFilter from './StatusFilter';
import SearchInput from '@/components/SearchInput';

const PAGE_SIZE = 25;
const STATUS_ORDER = ['lead', 'quoted', 'contracted', 'active', 'editing', 'proofing', 'delivered', 'archived'];

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string; q?: string };
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

  // Title only: client name lives on a joined table and cannot be filtered here.
  const term = (searchParams.q ?? '').trim();
  if (term) query = query.ilike('title', `%${term}%`);

  const { data: raw, count } = await query;
  const jobs       = (raw ?? []) as unknown as JobRow[];
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const paginationParams: Record<string, string> = {};
  if (searchParams.status) paginationParams.status = searchParams.status;
  if (term) paginationParams.q = term;

  const emptyMessage = term
    ? `No jobs match “${term}”.`
    : searchParams.status
    ? `No jobs with status "${searchParams.status}".`
    : <span>No jobs yet. <Link href="/jobs/new" className="text-[#0F3D2E] hover:underline">Create your first job</Link></span>;

  return (
    <div>
      {/* Page heading */}
      <h1 className="page-title">Jobs</h1>
      <p className="breadcrumb mb-6">
        Main Menu / <span className="text-[#0F3D2E]">Jobs</span>
      </p>

      {/* Content panel */}
      <div className="bg-white rounded-2xl border border-line shadow-card p-4 sm:p-6">

        {/* Toolbar — stacks on phones, single row from md up */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
          <SearchInput placeholder="Search jobs by title…" className="w-full md:flex-1 md:max-w-xs" />

          <div className="hidden md:block md:flex-1" />

          <StatusFilter statuses={STATUS_ORDER} current={searchParams.status} />

          <Link href="/jobs/new" className="btn-primary px-5 whitespace-nowrap w-full md:w-auto">
            + New Job
          </Link>
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

