import { createClient } from '@/lib/supabase/server';

type ClientRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
};

export default async function ClientsPage() {
  const supabase = createClient();

  const { data: raw } = await supabase
    .from('clients')
    .select('id, full_name, email, phone, created_at')
    .order('created_at', { ascending: false });

  const clients = (raw ?? []) as ClientRow[];

  // Job counts per client
  const { data: jobRaw } = await supabase
    .from('jobs')
    .select('client_id');

  const jobCounts: Record<string, number> = {};
  ((jobRaw ?? []) as { client_id: string }[]).forEach(({ client_id }) => {
    jobCounts[client_id] = (jobCounts[client_id] ?? 0) + 1;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Clients</h1>
        <a
          href="/clients/new"
          style={{ background: '#2563eb', color: '#fff', padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500 }}
        >
          + New client
        </a>
      </div>

      {clients.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', border: '2px dashed #e5e7eb', borderRadius: 8 }}>
          No clients yet.{' '}
          <a href="/clients/new" style={{ color: '#2563eb' }}>Add your first client</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {clients.map((c) => (
            <div
              key={c.id}
              style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16 }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{c.full_name}</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2, display: 'flex', gap: 10 }}>
                  {c.email && <span>{c.email}</span>}
                  {c.phone && <span>{c.phone}</span>}
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                {jobCounts[c.id] ?? 0} job{(jobCounts[c.id] ?? 0) !== 1 ? 's' : ''}
              </div>
              <a href={`/clients/${c.id}/edit`} style={{ fontSize: 13, color: '#2563eb', fontWeight: 500, flexShrink: 0 }}>
                Edit
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
