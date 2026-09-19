import Link from 'next/link';
import { requireCapability, requireFeature } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';
import Pagination from '@/components/Pagination';
import SearchInput from '@/components/SearchInput';
import ClientsTable, { type ClientRow } from './ClientsTable';

const PAGE_SIZE = 25;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  await requireCapability('clients.manage');
  await requireFeature('clients');
  const supabase = createClient();

  const term = (searchParams.q ?? '').trim();
  const page = Math.max(1, Number(searchParams.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  let query = supabase
    .from('clients')
    .select('id, full_name, email, phone, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  // Name, email or phone — whichever the studio remembers.
  if (term) {
    const like = `%${term}%`;
    query = query.or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`);
  }

  const { data: raw, count } = await query;
  const rows = (raw ?? []) as Omit<ClientRow, 'jobCount'>[];

  // Job counts for the clients on this page only.
  const ids = rows.map((c) => c.id);
  const { data: jobRaw } = ids.length
    ? await supabase.from('jobs').select('client_id').in('client_id', ids)
    : { data: [] };

  const jobCounts: Record<string, number> = {};
  ((jobRaw ?? []) as { client_id: string }[]).forEach(({ client_id }) => {
    jobCounts[client_id] = (jobCounts[client_id] ?? 0) + 1;
  });

  const clients: ClientRow[] = rows.map((c) => ({ ...c, jobCount: jobCounts[c.id] ?? 0 }));

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const paginationParams: Record<string, string> = {};
  if (term) paginationParams.q = term;

  const emptyMessage = term
    ? <span>No clients match “{term}”.</span>
    : <span>No clients yet. <Link href="/clients/new" className="text-primary hover:underline">Add your first client</Link></span>;

  return (
    <div>
      <h1 className="page-title">Clients</h1>
      <p className="breadcrumb mb-6">
        Main Menu / <span className="text-primary">Clients</span>
      </p>

      <div className="bg-white rounded-2xl border border-line shadow-card p-4 sm:p-6">
        {/* Toolbar — stacks on phones, single row from md up */}
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-5">
          <SearchInput placeholder="Search name, email or phone…" className="w-full md:flex-1 md:max-w-xs" />
          <div className="hidden md:block md:flex-1" />
          <Link href="/clients/new" className="btn-primary px-5 whitespace-nowrap w-full md:w-auto">
            + New Client
          </Link>
        </div>

        {totalCount > 0 && (
          <p className="text-xs text-ink-muted mb-3">
            {from + 1}–{Math.min(to + 1, totalCount)} of {totalCount} client{totalCount !== 1 ? 's' : ''}
            {term ? ` matching “${term}”` : ''}
          </p>
        )}

        <ClientsTable clients={clients} emptyMessage={emptyMessage} />

        <Pagination page={page} totalPages={totalPages} pathname="/clients" params={paginationParams} />
      </div>
    </div>
  );
}
