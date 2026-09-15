import { redirect } from 'next/navigation';
import { getStaff } from '@/lib/staff';
import SettingsTabs, { type SettingsTabId } from './SettingsTabs';
import BillingPanel from './BillingPanel';
import RolesPanel from './RolesPanel';
import { createClient } from '@/lib/supabase/server';
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
  portal_url: string | null;
  agreement_intro: string | null;
  agreement_terms: string | null;
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { saved?: string; tab?: string; locked?: string };
}) {
  const me = await getStaff();
  if (!me) redirect('/login');

  // Each tab carries its own entitlement rather than one blanket check: a custom
  // role could hold staff.manage without settings.manage, and would otherwise
  // lose access to Roles entirely by it moving in here.
  const canSettings = me.permissions.includes('settings.manage');
  const canRoles = me.permissions.includes('staff.manage') && me.features.includes('staff');

  const available: SettingsTabId[] = [
    ...(canSettings ? (['studio', 'billing'] as SettingsTabId[]) : []),
    ...(canRoles ? (['roles'] as SettingsTabId[]) : []),
  ];
  if (available.length === 0) redirect('/dashboard');

  const requested = (searchParams.tab ?? 'studio') as SettingsTabId;
  const tab = available.includes(requested) ? requested : available[0];

  if (tab !== 'studio') {
    return (
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="breadcrumb mb-6">
          Main Menu / <span className="text-[#0F3D2E]">Settings</span>
        </p>
        <SettingsTabs active={tab} available={available} />
        {tab === 'billing' ? (
          <BillingPanel searchParams={searchParams} />
        ) : (
          <RolesPanel searchParams={searchParams} />
        )}
      </div>
    );
  }

  // requireCapability at the top of this component already redirected anyone
  // without settings.manage, so the studio lookup can rely on that context.
  const staff = await getStaff();
  if (!staff) redirect('/login');

  const supabase = createClient();
  const { data: studioRaw } = await supabase
    .from('studios')
    .select('id, name, address, email, phone, logo_url, portal_url, agreement_intro, agreement_terms')
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
    <div>
      <h1 className="page-title">Settings</h1>
      <p className="breadcrumb mb-6">
        Main Menu / <span className="text-[#0F3D2E]">Settings</span>
      </p>

      <SettingsTabs active="studio" available={available} />

      <div className="max-w-2xl">

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

          <Field label="Client portal address">
            <input
              name="portal_url"
              defaultValue={studio.portal_url ?? ''}
              className="input"
              placeholder="https://portal.eventor.lk"
            />
            <p className="text-xs text-ink-muted mt-1">
              Where your clients sign in. Used to build shareable album links — leave it blank and those
              links will point at localhost.
            </p>
          </Field>
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
