import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { updatePackage, createAddon, toggleAddonActive, deleteAddon } from '../../actions';

type Addon = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
};

type Package = {
  id: string;
  studio_id: string;
  name: string;
  description: string | null;
  base_price: number;
  shoots_included: number;
  is_active: boolean;
};

export default async function EditPackagePage({ params, searchParams }: {
  params: { id: string };
  searchParams: { saved?: string };
}) {
  const supabase = createClient();

  const { data: pkgRaw } = await supabase
    .from('packages')
    .select('id, studio_id, name, description, base_price, shoots_included, is_active')
    .eq('id', params.id)
    .single();

  if (!pkgRaw) notFound();
  const pkg = pkgRaw as Package;

  const { data: addonsRaw } = await supabase
    .from('package_addons')
    .select('id, name, description, price, is_active')
    .eq('package_id', params.id)
    .order('created_at', { ascending: true });

  const addons = (addonsRaw ?? []) as Addon[];

  const updateAction = updatePackage.bind(null, pkg.id, pkg.studio_id);
  const createAddonAction = createAddon.bind(null, pkg.id, pkg.studio_id);

  return (
    <div style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 24 }}>
        <a href="/packages" style={{ fontSize: 13, color: '#6b7280' }}>← Packages</a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600 }}>{pkg.name}</h1>
          {!pkg.is_active && (
            <span style={{ fontSize: 11, background: '#f3f4f6', color: '#9ca3af', padding: '2px 8px', borderRadius: 10, fontWeight: 500 }}>
              Inactive
            </span>
          )}
        </div>
        {searchParams.saved && (
          <p style={{ fontSize: 13, color: '#16a34a', marginTop: 4 }}>Changes saved.</p>
        )}
      </div>

      {/* Package edit form */}
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Package details</h2>
        <form action={updateAction} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Package name" required>
            <input name="name" required defaultValue={pkg.name} style={inputStyle} />
          </Field>

          <Field label="Description">
            <textarea
              name="description"
              rows={2}
              defaultValue={pkg.description ?? ''}
              style={{ ...inputStyle, height: 'auto', padding: '8px 12px', resize: 'vertical' }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="Base price (LKR)" required>
              <input name="base_price" type="number" min="0" step="500" required defaultValue={pkg.base_price} style={inputStyle} />
            </Field>
            <Field label="Shoots included">
              <input name="shoots_included" type="number" min="1" defaultValue={pkg.shoots_included} style={inputStyle} />
            </Field>
          </div>

          <div>
            <button type="submit" style={primaryBtn}>Save changes</button>
          </div>
        </form>
      </section>

      {/* Add-ons */}
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Add-ons</h2>

        {addons.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {addons.map((addon) => {
              const toggleAction = toggleAddonActive.bind(null, addon.id, pkg.id, !addon.is_active);
              const deleteAction = deleteAddon.bind(null, addon.id, pkg.id);
              return (
                <div
                  key={addon.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    opacity: addon.is_active ? 1 : 0.6,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>{addon.name}</span>
                      {!addon.is_active && (
                        <span style={{ fontSize: 11, background: '#f3f4f6', color: '#9ca3af', padding: '1px 6px', borderRadius: 8 }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    {addon.description && (
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{addon.description}</div>
                    )}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    + LKR {addon.price.toLocaleString()}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <a
                      href={`/packages/${pkg.id}/addons/${addon.id}/edit`}
                      style={{ fontSize: 12, color: '#2563eb' }}
                    >
                      Edit
                    </a>
                    <form action={toggleAction} style={{ display: 'inline' }}>
                      <button type="submit" style={ghostBtn}>
                        {addon.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </form>
                    <form action={deleteAction} style={{ display: 'inline' }}>
                      <button
                        type="submit"
                        style={{ ...ghostBtn, color: '#dc2626', borderColor: '#fca5a5' }}
                        onClick={() => {}} // handled server-side
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ borderTop: addons.length > 0 ? '1px solid #f3f4f6' : 'none', paddingTop: addons.length > 0 ? 20 : 0 }}>
          <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 12 }}>Add new add-on</p>
          <form action={createAddonAction} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
              <Field label="Name" required>
                <input name="name" required style={inputStyle} placeholder="Extra hour coverage" />
              </Field>
              <Field label="Price (LKR)" required>
                <input name="price" type="number" min="0" step="500" required style={{ ...inputStyle, width: 130 }} placeholder="15000" />
              </Field>
            </div>
            <Field label="Description">
              <input name="description" style={inputStyle} placeholder="Optional description" />
            </Field>
            <div>
              <button type="submit" style={secondaryBtn}>+ Add add-on</button>
            </div>
          </form>
        </div>
      </section>
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

const inputStyle: React.CSSProperties = { height: 36, borderRadius: 6, border: '1px solid #d1d5db', padding: '0 12px', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const primaryBtn: React.CSSProperties = { height: 36, borderRadius: 6, background: '#2563eb', color: '#fff', border: 'none', fontWeight: 500, cursor: 'pointer', padding: '0 18px', fontSize: 14 };
const secondaryBtn: React.CSSProperties = { height: 34, borderRadius: 6, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', fontWeight: 500, cursor: 'pointer', padding: '0 16px', fontSize: 13 };
const ghostBtn: React.CSSProperties = { fontSize: 12, color: '#6b7280', background: 'none', border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 8px', cursor: 'pointer' };
