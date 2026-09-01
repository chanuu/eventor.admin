import Link from 'next/link';
import { requirePlatformAdmin, type PlatformOverview, type TenantRow } from '@/lib/platform';
import { createClient } from '@/lib/supabase/server';

export default async function PlatformDashboard() {
  await requirePlatformAdmin();
  const supabase = createClient();

  const [{ data: overviewRaw }, { data: tenantsRaw }] = await Promise.all([
    supabase.rpc('platform_overview'),
    supabase.rpc('platform_tenants'),
  ]);

  const o = ((overviewRaw ?? []) as PlatformOverview[])[0];
  const tenants = (tenantsRaw ?? []) as TenantRow[];

  const stats: { label: string; value: string; sub?: string }[] = [
    { label: 'Studios', value: String(o?.studios ?? 0), sub: `${o?.active_subscriptions ?? 0} on an active plan` },
    { label: 'Monthly recurring', value: `Rs. ${(o?.mrr_lkr ?? 0).toLocaleString('en-LK')}`, sub: 'From active subscriptions' },
    { label: 'Staff accounts', value: String(o?.staff ?? 0) },
    { label: 'Clients', value: String(o?.clients ?? 0) },
    { label: 'Jobs & events', value: String(o?.jobs ?? 0), sub: `${o?.shoots ?? 0} shoots scheduled` },
    { label: 'Digital albums', value: String(o?.albums ?? 0), sub: `${o?.published_albums ?? 0} published · ${o?.shared_albums ?? 0} shared publicly` },
    { label: 'Galleries', value: String(o?.galleries ?? 0), sub: `${(o?.photos ?? 0).toLocaleString('en-LK')} photos stored` },
    { label: 'Signed agreements', value: String(o?.contracts_signed ?? 0) },
  ];

  return (
    <div style={{ maxWidth: 1100 }}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Platform</h1>
          <p className="breadcrumb">Every studio on Eventor</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/platform/lead-sources" className="btn-secondary">Lead sources</Link>
          <Link href="/platform/plans" className="btn-primary">Package configuration →</Link>
        </div>
      </div>

      {/* Figures across all tenants */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-line shadow-card p-5">
            <div className="label-xs">{s.label}</div>
            <div className="text-2xl font-extrabold text-primary mt-2">{s.value}</div>
            {s.sub && <div className="text-[11.5px] text-ink-muted mt-1">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Tenants */}
      <h2 className="text-sm font-extrabold text-primary mt-8 mb-3">
        Tenants ({tenants.length})
      </h2>

      <div className="bg-white rounded-2xl border border-line overflow-x-auto">
        <table className="w-full border-collapse min-w-[820px]">
          <thead>
            <tr className="border-b border-line bg-panel">
              {['Studio', 'Plan', 'Staff', 'Clients', 'Jobs', 'Albums', 'Photos', 'Joined'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-ink-muted whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.studio_id} className="border-b border-line-soft last:border-0">
                <td className="px-4 py-3.5">
                  <div className="text-[13.5px] font-semibold text-ink-strong">{t.name}</div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {t.last_job_at
                      ? `Last job ${new Date(t.last_job_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}`
                      : 'No jobs yet'}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  {t.plan_name ? (
                    <span className="pill-good">{t.plan_name}</span>
                  ) : (
                    <span className="pill-pending">No plan</span>
                  )}
                  {t.price_lkr != null && (
                    <div className="text-[11px] text-ink-muted mt-1">
                      Rs. {t.price_lkr.toLocaleString('en-LK')}/mo
                    </div>
                  )}
                </td>
                <td className="px-4 py-3.5 text-[13px] text-ink-body">{t.staff_count}</td>
                <td className="px-4 py-3.5 text-[13px] text-ink-body">{t.client_count}</td>
                <td className="px-4 py-3.5 text-[13px] text-ink-body">{t.job_count}</td>
                <td className="px-4 py-3.5 text-[13px] text-ink-body">
                  {t.album_count}
                  {t.published_album_count > 0 && (
                    <span className="text-ink-muted"> ({t.published_album_count} live)</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-[13px] text-ink-body">{t.photo_count.toLocaleString('en-LK')}</td>
                <td className="px-4 py-3.5 text-[13px] text-ink-muted whitespace-nowrap">
                  {new Date(t.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[13px] text-ink-muted">
                  No studios have signed up yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
