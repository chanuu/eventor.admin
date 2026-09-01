import { EmptyState } from '@/components/states';
import Link from "next/link";
import { createClient } from '@/lib/supabase/server';
import dynamic from 'next/dynamic';
import type { MonthlyPoint, EventTypePoint, StatusPoint } from './DashboardCharts';

const MonthlyRevenueChart = dynamic(
  () => import('./DashboardCharts').then((m) => m.MonthlyRevenueChart),
  { ssr: false, loading: () => <div className="h-48 bg-gray-50 rounded-xl animate-pulse" /> },
);
const EventTypeChart = dynamic(
  () => import('./DashboardCharts').then((m) => m.EventTypeChart),
  { ssr: false, loading: () => <div className="h-40 bg-gray-50 rounded-xl animate-pulse" /> },
);
const JobStatusPipeline = dynamic(
  () => import('./DashboardCharts').then((m) => m.JobStatusPipeline),
  { ssr: false },
);

const STATUS_ORDER = ['lead', 'quoted', 'contracted', 'active', 'editing', 'proofing', 'delivered', 'archived'];

export default async function DashboardPage({ searchParams }: { searchParams: { denied?: string } }) {
  const supabase = createClient();

  const [
    { count: jobCount },
    { count: clientCount },
    { count: shootCount },
    { data: upcomingRaw },
    { data: pendingPaymentsRaw },
    { data: paidPaymentsRaw },
    { data: jobsRaw },
  ] = await Promise.all([
    supabase.from('jobs').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('shoots').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
    supabase
      .from('shoots')
      .select('id, shoot_type, scheduled_at, venue, status, jobs(id, title)')
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(5),
    supabase
      .from('payments')
      .select('id, type, amount, status, paid_at, jobs(title, clients(full_name))')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('payments')
      .select('amount, paid_at')
      .eq('status', 'paid'),
    supabase
      .from('jobs')
      .select('event_type, total_price, status, lead_source'),
  ]);

  const paidPayments = (paidPaymentsRaw ?? []) as { amount: number; paid_at: string | null }[];
  const jobs         = (jobsRaw ?? []) as { event_type: string | null; total_price: number; status: string; lead_source: string | null }[];
  const upcoming     = (upcomingRaw ?? []) as any[];
  const payments     = (pendingPaymentsRaw ?? []) as any[];

  // ── Total revenue ────────────────────────────────────────────
  const totalRevenue = paidPayments.reduce((s, p) => s + Number(p.amount), 0);

  // ── Monthly revenue — last 6 months ─────────────────────────
  const monthlyMap = new Map<string, number>();
  for (const p of paidPayments) {
    if (!p.paid_at) continue;
    const d   = new Date(p.paid_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + Number(p.amount));
  }
  const monthlyRevenue: MonthlyPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const month = d.toLocaleDateString('en-LK', { month: 'short' });
    monthlyRevenue.push({ month, revenue: monthlyMap.get(key) ?? 0 });
  }

  // ── Revenue by event type ────────────────────────────────────
  const eventMap = new Map<string, { revenue: number; count: number }>();
  for (const j of jobs) {
    const type = j.event_type?.trim() || 'Other';
    const e    = eventMap.get(type) ?? { revenue: 0, count: 0 };
    eventMap.set(type, { revenue: e.revenue + Number(j.total_price), count: e.count + 1 });
  }
  const eventTypeRevenue: EventTypePoint[] = Array.from(eventMap.entries())
    .map(([type, d]) => ({ type, ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 7);

  // ── Job status breakdown ─────────────────────────────────────
  const statusMap = new Map<string, number>();
  for (const j of jobs) statusMap.set(j.status, (statusMap.get(j.status) ?? 0) + 1);
  const statusCounts: StatusPoint[] = STATUS_ORDER
    .map((s) => ({ status: s, count: statusMap.get(s) ?? 0 }))
    .filter((s) => s.count > 0);

  // ── Where enquiries come from ────────────────────────────────
  const sourceMap = new Map<string, { count: number; value: number }>();
  for (const j of jobs) {
    const key = j.lead_source?.trim() || 'Not recorded';
    const e = sourceMap.get(key) ?? { count: 0, value: 0 };
    sourceMap.set(key, { count: e.count + 1, value: e.value + Number(j.total_price) });
  }
  const leadSources = Array.from(sourceMap.entries())
    .map(([source, d]) => ({ source, ...d }))
    .sort((a, b) => b.count - a.count);
  const leadTotal = leadSources.reduce((s, l) => s + l.count, 0);

  // ── Stat cards ───────────────────────────────────────────────
  const stats = [
    {
      label: 'Total Jobs',
      value: (jobCount ?? 0).toString(),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
        </svg>
      ),
      color: 'bg-emerald-50 text-[#0F3D2E]',
    },
    {
      label: 'Clients',
      value: (clientCount ?? 0).toString(),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Upcoming Shoots',
      value: (shootCount ?? 0).toString(),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>
      ),
      color: 'bg-violet-50 text-violet-600',
    },
    {
      label: 'Total Revenue',
      value: `Rs.${(totalRevenue / 1000).toFixed(0)}k`,
      sub: totalRevenue > 0 ? `Rs.${totalRevenue.toLocaleString()}` : undefined,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      ),
      color: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="breadcrumb mb-6">Main Menu</p>

      {searchParams.denied && (
        <div className="mb-5 rounded-xl border border-[#F3D9BC] bg-[#FFF3E6] px-4 py-3">
          <p className="text-[13px] font-bold text-[#a8631f]">You don’t have access to that page</p>
          <p className="text-[12.5px] text-[#8a6a45] mt-0.5">
            Ask a studio admin if you need it added to your role.
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-card p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
              {s.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              {s.sub && <p className="text-[10px] text-gray-400">{s.sub}</p>}
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Where enquiries come from */}
      <div className="bg-white rounded-2xl shadow-card p-5 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h2 className="text-sm font-extrabold text-primary">Where your enquiries come from</h2>
          <span className="text-[11.5px] text-ink-muted">{leadTotal} job{leadTotal === 1 ? '' : 's'}</span>
        </div>

        {leadSources.length === 0 ? (
          <EmptyState compact title="No enquiries yet" description="Record a lead source on a job and the breakdown appears here." />
        ) : (
          <div className="flex flex-col gap-3">
            {leadSources.map((l) => {
              const pct = leadTotal ? Math.round((l.count / leadTotal) * 100) : 0;
              return (
                <div key={l.source}>
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="text-[13px] font-semibold text-ink-strong">{l.source}</span>
                    <span className="text-[12px] text-ink-muted whitespace-nowrap">
                      {l.count} · Rs. {Math.round(l.value).toLocaleString('en-LK')} · {pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-line-soft overflow-hidden">
                    <div
                      className={l.source === 'Not recorded' ? 'h-full bg-line-btn' : 'h-full bg-lime'}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Revenue chart + Job pipeline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">

        {/* Monthly revenue */}
        <div className="col-span-2 bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Revenue Overview</h2>
              <p className="text-xs text-gray-400 mt-0.5">Collected payments — last 6 months</p>
            </div>
            <span className="text-xs font-semibold bg-emerald-50 text-[#0F3D2E] px-2.5 py-1 rounded-full">
              Rs.{totalRevenue.toLocaleString()} total
            </span>
          </div>
          <MonthlyRevenueChart data={monthlyRevenue} />
        </div>

        {/* Job status pipeline */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between flex-wrap mb-4">
            <h2 className="text-sm font-bold text-gray-800">Job Pipeline</h2>
            <span className="text-xs font-semibold bg-[#8BC53F] text-white px-2.5 py-1 rounded-full">
              {jobCount ?? 0} Jobs
            </span>
          </div>
          <JobStatusPipeline data={statusCounts} />
        </div>

      </div>

      {/* Event type revenue + Upcoming shoots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">

        {/* Revenue by event type */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between flex-wrap mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Revenue by Event Type</h2>
              <p className="text-xs text-gray-400 mt-0.5">Total job value per category</p>
            </div>
          </div>
          <EventTypeChart data={eventTypeRevenue} />
        </div>

        {/* Upcoming shoots */}
        <div className="bg-white rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between flex-wrap mb-4">
            <h2 className="text-sm font-bold text-gray-800">Upcoming Shoots</h2>
            <span className="text-xs font-semibold bg-[#8BC53F] text-white px-2.5 py-1 rounded-full">
              {upcoming.length} Jobs
            </span>
          </div>

          {upcoming.length === 0 ? (
            <EmptyState compact title="No upcoming shoots" description="Scheduled shoots across all jobs appear here." />
          ) : (
            <div className="flex flex-col gap-2">
              {upcoming.map((shoot: any) => (
                <Link                   key={shoot.id}
                  href={`/jobs/${shoot.jobs?.id}`}
                  className="flex items-center justify-between flex-wrap p-3 rounded-xl border border-gray-100 hover:border-[#8BC53F] hover:bg-gray-50 transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400">
                      {shoot.scheduled_at
                        ? new Date(shoot.scheduled_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })
                        : 'Not scheduled'}
                    </p>
                    <p className="text-sm font-medium text-gray-800 truncate">{shoot.jobs?.title ?? 'Shoot'}</p>
                    {shoot.venue && <p className="text-xs text-gray-400">{shoot.venue}</p>}
                  </div>
                  <span className="text-xs font-medium text-[#0F3D2E] border border-[#0F3D2E] px-3 py-1 rounded-lg group-hover:bg-[#0F3D2E] group-hover:text-white transition-colors shrink-0 ml-3">
                    view
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Pending payments */}
      <div className="bg-white rounded-2xl shadow-card p-5">
        <div className="flex items-center justify-between flex-wrap mb-4">
          <h2 className="text-sm font-bold text-gray-800">Pending Payments</h2>
          <span className="text-xs font-semibold bg-[#8BC53F] text-white px-2.5 py-1 rounded-full">
            {payments.length} Records
          </span>
        </div>

        {payments.length === 0 ? (
          <EmptyState compact title="Nothing outstanding" description="Payments awaiting collection show up here." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-3">
            {payments.map((p: any) => (
              <div key={p.id} className="p-3 rounded-xl border border-gray-100">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
                    Pending
                  </span>
                  <span className="text-sm font-bold text-gray-900">Rs.{p.amount.toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">Client</p>
                <p className="text-sm font-medium text-gray-800">
                  {(p.jobs as any)?.clients?.full_name ?? '—'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5 truncate">
                  {(p.jobs as any)?.title ?? '—'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
