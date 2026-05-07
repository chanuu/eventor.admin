import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updateAddon } from '../../../../actions';
import AddonEditForm from './AddonEditForm';

type Addon = {
  id: string;
  package_id: string;
  studio_id: string;
  name: string;
  description: string | null;
  price: number;
};

export default async function EditAddonPage({ params }: { params: { id: string; addonId: string } }) {
  const supabase = createClient();

  const { data: addonRaw } = await supabase
    .from('package_addons')
    .select('id, package_id, studio_id, name, description, price')
    .eq('id', params.addonId)
    .eq('package_id', params.id)
    .single();

  if (!addonRaw) notFound();
  const addon = addonRaw as Addon;

  const updateAction = updateAddon.bind(null, addon.id, addon.package_id, addon.studio_id);

  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ marginBottom: 24 }}>
        <a href={`/packages/${params.id}/edit`} style={{ fontSize: 13, color: '#6b7280' }}>
          ← Back to package
        </a>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginTop: 8 }}>Edit add-on</h1>
      </div>

      <AddonEditForm addon={addon} updateAction={updateAction} />
    </div>
  );
}
