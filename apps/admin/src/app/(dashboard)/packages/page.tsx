import { createClient } from '@/lib/supabase/server';
import { togglePackageActive } from './actions';

type PackageRow = {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  shoots_included: number;
  is_active: boolean;
  created_at: string;
};

export default async function PackagesPage() {
  const supabase = createClient();

  const { data: raw } = await supabase
    .from('packages')
    .select('id, name, description, base_price, shoots_included, is_active, created_at')
    .order('created_at', { ascending: false });

  const packages = (raw ?? []) as PackageRow[];

  // Addon counts per package
  const { data: addonRaw } = await supabase
    .from('package_addons')
    .select('package_id')
    .eq('is_active', true);

  const addonCounts: Record<string, number> = {};
  ((addonRaw ?? []) as { package_id: string }[]).forEach(({ package_id }) => {
    addonCounts[package_id] = (addonCounts[package_id] ?? 0) + 1;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Packages</h1>
        <a
          href="/packages/new"
          style={{ background: '#2563eb', color: '#fff', padding: '7px 16px', borderRadius: 6, fontSize: 13, fontWeight: 500 }}
        >
          + New package
        </a>
      </div>

      {packages.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#9ca3af', border: '2px dashed #e5e7eb', borderRadius: 8 }}>
          No packages yet.{' '}
          <a href="/packages/new" style={{ color: '#2563eb' }}>Create your first package</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                opacity: pkg.is_active ? 1 : 0.6,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{pkg.name}</span>
                  {!pkg.is_active && (
                    <span style={{ fontSize: 11, background: '#f3f4f6', color: '#9ca3af', padding: '1px 7px', borderRadius: 10, fontWeight: 500 }}>
                      Inactive
                    </span>
                  )}
                </div>
                {pkg.description && (
                  <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pkg.description}
                  </div>
                )}
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4, display: 'flex', gap: 12 }}>
                  <span>{pkg.shoots_included} shoot{pkg.shoots_included !== 1 ? 's' : ''} included</span>
                  <span>{addonCounts[pkg.id] ?? 0} add-on{(addonCounts[pkg.id] ?? 0) !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div style={{ fontSize: 16, fontWeight: 700, whiteSpace: 'nowrap' }}>
                LKR {pkg.base_price.toLocaleString()}
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                <a
                  href={`/packages/${pkg.id}/edit`}
                  style={{ fontSize: 13, color: '#2563eb', fontWeight: 500 }}
                >
                  Edit
                </a>
                <form action={togglePackageActive.bind(null, pkg.id, !pkg.is_active)}>
                  <button
                    type="submit"
                    style={{ fontSize: 12, color: '#6b7280', background: 'none', border: '1px solid #d1d5db', borderRadius: 4, padding: '3px 10px', cursor: 'pointer' }}
                  >
                    {pkg.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
