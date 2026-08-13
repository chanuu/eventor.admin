import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { updateStudioSettings } from './actions';
import LogoUploadForm from './LogoUploadForm';

type Studio = {
  id: string;
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
};

export default async function SettingsPage({ searchParams }: { searchParams: { saved?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: staffRaw } = await supabase
    .from('staff')
    .select('studio_id, role')
    .eq('user_id', user.id)
    .single();
  const staff = staffRaw as { studio_id: string; role: string } | null;

  if (!staff || staff.role !== 'admin') {
    return <p className="text-sm text-red-500">Only admins can access settings.</p>;
  }

  const { data: studioRaw } = await supabase
    .from('studios')
    .select('id, name, address, email, phone, logo_url')
    .eq('id', staff.studio_id)
    .single();
  const studio = studioRaw as Studio | null;
  if (!studio) return <p className="text-sm text-red-500">Studio not found.</p>;

  const updateAction = updateStudioSettings.bind(null, studio.id);

  return (
    <div className="max-w-xl">
      <h1 className="page-title">Settings</h1>
      <p className="breadcrumb mb-6">
        Main Menu / <span className="text-[#0F3D2E]">Settings</span>
      </p>

      {searchParams.saved && (
        <p className="text-sm text-emerald-600 mb-4">Settings saved.</p>
      )}

      {/* Studio details */}
      <div className="bg-white rounded-2xl shadow-card p-6 mb-4">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Studio details</h2>
        <form action={updateAction} className="flex flex-col gap-4">
          <Field label="Studio name" required>
            <input name="name" required defaultValue={studio.name} className="input" />
          </Field>
          <Field label="Address">
            <textarea
              name="address"
              rows={2}
              defaultValue={studio.address ?? ''}
              placeholder="Street, City, Province, Sri Lanka"
              className="input h-auto py-2 resize-y"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Phone">
              <input name="phone" defaultValue={studio.phone ?? ''} className="input" placeholder="+94 77 XXX XXXX" />
            </Field>
            <Field label="Email">
              <input name="email" type="email" defaultValue={studio.email ?? ''} className="input" placeholder="studio@example.com" />
            </Field>
          </div>
          <div>
            <button type="submit" className="btn-primary">Save settings</button>
          </div>
        </form>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Logo</h2>
        {studio.logo_url ? (
          <div className="mb-4">
            <img src={studio.logo_url} alt="Studio logo" className="max-h-16 max-w-[220px] object-contain" />
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-4">No logo uploaded yet.</p>
        )}
        <LogoUploadForm studioId={studio.id} hasLogo={!!studio.logo_url} />
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-700">
        {label}{required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}
