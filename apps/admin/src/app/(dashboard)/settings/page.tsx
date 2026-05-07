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
    return <p style={{ color: '#dc2626', fontSize: 14 }}>Only admins can access settings.</p>;
  }

  const { data: studioRaw } = await supabase
    .from('studios')
    .select('id, name, address, email, phone, logo_url')
    .eq('id', staff.studio_id)
    .single();
  const studio = studioRaw as Studio | null;
  if (!studio) return <p style={{ color: '#dc2626', fontSize: 14 }}>Studio not found.</p>;

  const updateAction = updateStudioSettings.bind(null, studio.id);

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Studio Settings</h1>
        <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>
          This information is used in client contracts.
        </p>
      </div>

      {searchParams.saved && (
        <p style={{ fontSize: 13, color: '#16a34a', marginBottom: 16 }}>Settings saved.</p>
      )}

      {/* Contact details */}
      <div style={card}>
        <h2 style={heading}>Studio details</h2>
        <form action={updateAction} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="Studio name" required>
            <input name="name" required defaultValue={studio.name} style={inputStyle} />
          </Field>
          <Field label="Address">
            <textarea
              name="address"
              rows={2}
              defaultValue={studio.address ?? ''}
              placeholder="Street, City, Province, Sri Lanka"
              style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
            />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <Field label="Phone">
              <input name="phone" defaultValue={studio.phone ?? ''} style={inputStyle} placeholder="+94 77 XXX XXXX" />
            </Field>
            <Field label="Email">
              <input name="email" type="email" defaultValue={studio.email ?? ''} style={inputStyle} placeholder="studio@example.com" />
            </Field>
          </div>
          <div>
            <button type="submit" style={primaryBtn}>Save settings</button>
          </div>
        </form>
      </div>

      {/* Logo */}
      <div style={card}>
        <h2 style={heading}>Logo</h2>
        {studio.logo_url ? (
          <div style={{ marginBottom: 14 }}>
            <img src={studio.logo_url} alt="Studio logo" style={{ maxHeight: 64, maxWidth: 220, objectFit: 'contain' }} />
          </div>
        ) : (
          <p style={{ fontSize: 13, color: '#9ca3af', marginBottom: 14 }}>No logo uploaded yet.</p>
        )}
        <LogoUploadForm studioId={studio.id} hasLogo={!!studio.logo_url} />
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 500 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      {children}
    </div>
  );
}

const card:       React.CSSProperties = { background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 16 };
const heading:    React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 };
const inputStyle: React.CSSProperties = { height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const primaryBtn: React.CSSProperties = { height: 36, borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer', padding: '0 18px', fontSize: 14 };
