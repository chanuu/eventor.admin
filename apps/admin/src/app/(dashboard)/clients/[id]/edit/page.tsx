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
    <div style={{ maxWidth: 520 }}>
      <div style={{ marginBottom: 24 }}>
        <a href="/clients" style={{ fontSize: 13, color: '#6b7280' }}>← Clients</a>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>{client.full_name}</h1>
        {searchParams.saved && (
          <p style={{ fontSize: 13, color: '#16a34a', marginTop: 4 }}>Changes saved.</p>
        )}
      </div>

      <ClientEditForm client={client} updateAction={updateAction} />

      <div style={{ marginTop: 20 }}>
        <a
          href={`/jobs?client=${client.id}`}
          style={{ fontSize: 13, color: '#2563eb' }}
        >
          View jobs for this client →
        </a>
      </div>
    </div>
  );
}
