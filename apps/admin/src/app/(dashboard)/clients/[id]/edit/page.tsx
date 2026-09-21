import Link from "next/link";
import { notFound } from 'next/navigation';
import { createClient as createSupabaseClient } from '@/lib/supabase/server';
import { updateClient } from '../../actions';
import ClientEditForm from './ClientEditForm';

type ClientRow = {
  id: string;
  studio_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export default async function EditClientPage({ params, searchParams }: {
  params: { id: string };
  searchParams: { saved?: string };
}) {
  const supabase = createSupabaseClient();

  const { data: raw } = await supabase
    .from('clients')
    .select('id, studio_id, full_name, email, phone, notes')
    .eq('id', params.id)
    .single();

  if (!raw) notFound();
  const client = raw as ClientRow;

  const updateAction = updateClient.bind(null, client.id, client.studio_id);

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/clients" className="text-sm text-ink-muted">← Clients</Link>
        <h1 className="page-title mt-2">{client.full_name}</h1>
        {searchParams.saved && (
          <p className="text-sm text-green-700 font-semibold mt-1">Changes saved.</p>
        )}
      </div>

      <ClientEditForm client={client} updateAction={updateAction} />

      <div className="mt-5">
        <Link href={`/jobs?client=${client.id}`} className="text-sm font-semibold text-primary">
          View jobs for this client →
        </Link>
      </div>
    </div>
  );
}
