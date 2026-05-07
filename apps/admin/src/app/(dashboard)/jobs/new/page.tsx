import { createClient } from '@/lib/supabase/server';
import NewJobForm from './NewJobForm';

type ClientOption = { id: string; full_name: string };
type PackageOption = { id: string; name: string; base_price: number };

export default async function NewJobPage() {
  const supabase = createClient();

  const [{ data: clientsRaw }, { data: packagesRaw }] = await Promise.all([
    supabase.from('clients').select('id, full_name').order('full_name'),
    supabase.from('packages').select('id, name, base_price').eq('is_active', true).order('name'),
  ]);

  const clients = (clientsRaw ?? []) as ClientOption[];
  const packages = (packagesRaw ?? []) as PackageOption[];

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 24 }}>
        <a href="/jobs" style={{ fontSize: 13, color: '#6b7280' }}>← Jobs</a>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>New job</h1>
      </div>
      <NewJobForm clients={clients} packages={packages} />
    </div>
  );
}
