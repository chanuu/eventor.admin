import { requireCapability, getStaff } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { updateStudioSettings } from './actions';
import LogoUploadForm from './LogoUploadForm';
import ChangePassword from './ChangePassword';
import AgreementTerms from './AgreementTerms';
import { buildAgreementHtml, defaultTermsText } from '@/lib/agreement';

type Studio = {
  id: string;
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  agreement_intro: string | null;
  agreement_terms: string | null;
};

export default async function SettingsPage({ searchParams }: { searchParams: { saved?: string } }) {
  await requireCapability('settings.manage');
  // requireCapability at the top of this component already redirected anyone
  // without settings.manage, so the studio lookup can rely on that context.
  const staff = await getStaff();
  if (!staff) redirect('/login');

  const supabase = createClient();
  const { data: studioRaw } = await supabase
    .from('studios')
    .select('id, name, address, email, phone, logo_url, agreement_intro, agreement_terms')
    .eq('id', staff.studio_id)
    .single();
  const studio = studioRaw as Studio | null;
  if (!studio) return <p className="text-sm text-red-500">Studio not found.</p>;

  const updateAction = updateStudioSettings.bind(null, studio.id);

  const previewHtml = buildAgreementHtml({
    studio_name: studio.name,
    studio_address: studio.address ?? '',
    studio_phone: studio.phone ?? '',
    studio_email: studio.email ?? '',
    studio_logo: studio.logo_url ?? '',
    client_name: 'Sample Client',
    client_email: 'client@example.com',
    client_phone: '077 000 0000',
    job_title: 'Sample Wedding',
    event_type: 'Wedding',
    package_name: 'Sample Package',
    total_price: '150,000',
    contract_date: new Date().toLocaleDateString('en-LK', { dateStyle: 'long' }),
    intro: studio.agreement_intro,
    terms: studio.agreement_terms,
  });

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

      <AgreementTerms
        studioId={studio.id}
        studioName={studio.name}
        intro={studio.agreement_intro ?? ''}
        terms={studio.agreement_terms ?? ''}
        defaultTerms={defaultTermsText(studio.name)}
        previewHtml={previewHtml}
      />

      <ChangePassword />
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
