import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = createClient();

  const [{ count: jobCount }, { count: clientCount }, { count: shootCount }] = await Promise.all([
    supabase.from('jobs').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('shoots').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
  ]);

  const stats = [
    { label: 'Total Jobs', value: jobCount ?? 0 },
    { label: 'Clients', value: clientCount ?? 0 },
    { label: 'Upcoming Shoots', value: shootCount ?? 0 },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 24 }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '20px 24px' }}>
            <div style={{ fontSize: 13, color: '#6b7280' }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <p style={{ color: '#6b7280', fontSize: 13 }}>
        Use the sidebar to manage jobs, clients, packages, and more.
      </p>
    </div>
  );
}
