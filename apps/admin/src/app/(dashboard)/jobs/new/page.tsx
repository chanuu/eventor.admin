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
    <div className="max-w-xl">
      <h1 className="page-title">New Job</h1>
      <p className="breadcrumb mb-6">
        Main Menu / <a href="/jobs" className="hover:text-[#2D6A4F]">Jobs</a> / <span className="text-[#2D6A4F]">New</span>
      </p>
      <NewJobForm clients={clients} packages={packages} />
    </div>
  );
}
