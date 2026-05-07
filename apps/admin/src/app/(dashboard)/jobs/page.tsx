import { createClient } from '@/lib/supabase/server';

type JobRow = {
  id: string;
  title: string;
  event_type: string | null;
  status: string;
  total_price: number;
  created_at: string;
  clients: { full_name: string } | null;
};

const STATUS_ORDER = ['lead', 'quoted', 'contracted', 'active', 'editing', 'proofing', 'delivered', 'archived'];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  lead:       { bg: '#f3f4f6', color: '#6b7280' },
  quoted:     { bg: '#fef3c7', color: '#92400e' },
  contracted: { bg: '#dbeafe', color: '#1e40af' },
  active:     { bg: '#dcfce7', color: '#166534' },
  editing:    { bg: '#ede9fe', color: '#5b21b6' },
  proofing:   { bg: '#fce7f3', color: '#9d174d' },
  delivered:  { bg: '#d1fae5', color: '#065f46' },
  archived:   { bg: '#f3f4f6', color: '#9ca3af' },
};

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { status?: string; client?: string };
}) {
  const supabase = createClient();

  let query = supabase
    .from('jobs')
    .select('id, title, event_type, status, total_price, created_at, clients(full_name)')
    .order('created_at', { ascending: false });

  if (searchParams.status) query = query.eq('status', searchParams.status);
  if (searchParams.client) query = query.eq('client_id', searchParams.client);

  const { data: raw } = await query;
  const jobs = (raw ?? []) as unknown as JobRow[];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Jobs</h1>
        <a
          href="/jobs/new"
          style={{ background: '#2563eb', color: '#fff', padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500 }}
        >
          + New job
        </a>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        <a
          href="/jobs"
          style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
            background: !searchParams.status ? '#2563eb' : '#f3f4f6',
            color: !searchParams.status ? '#fff' : '#374151',
            textDecoration: 'none',
          }}
        >
          All
        </a>
        {STATUS_ORDER.map((s) => (
          <a
            key={s}
            href={`/jobs?status=${s}`}
            style={{
              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
              background: searchParams.status === s ? '#2563eb' : '#f3f4f6',
              color: searchParams.status === s ? '#fff' : '#374151',
              textDecoration: 'none',
              textTransform: 'capitalize',
            }}
          >
            {s}
          </a>
        ))}
      </div>

      {jobs.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', border: '2px dashed #e5e7eb', borderRadius: 8 }}>
          No jobs{searchParams.status ? ` with status "${searchParams.status}"` : ''}.{' '}
          {!searchParams.status && (
            <a href="/jobs/new" style={{ color: '#2563eb' }}>Create your first job</a>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {jobs.map((job) => {
            const badge = STATUS_COLORS[job.status] ?? STATUS_COLORS.lead;
            const clientName = (job.clients as { full_name: string } | null)?.full_name ?? '—';
            return (
              <a
                key={job.id}
                href={`/jobs/${job.id}`}
                style={{
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{job.title}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                    {clientName}{job.event_type ? ` · ${job.event_type}` : ''}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                    background: badge.bg, color: badge.color, whiteSpace: 'nowrap',
                    textTransform: 'capitalize',
                  }}
                >
                  {job.status}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', color: '#111827' }}>
                  LKR {job.total_price.toLocaleString()}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
