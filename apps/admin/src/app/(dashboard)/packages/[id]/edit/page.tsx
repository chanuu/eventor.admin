import Link from "next/link";
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
    <div className="max-w-2xl">
      <h1 className="page-title flex items-center gap-2.5">
        {pkg.name}
        {!pkg.is_active && (
          <span className="text-[11px] font-medium bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Inactive</span>
        )}
      </h1>
      <p className="breadcrumb mb-6">
        Main Menu / <Link href="/packages" className="hover:text-[#0F3D2E]">Packages</Link> / <span className="text-[#0F3D2E]">Edit</span>
      </p>

      {searchParams.saved && (
        <p className="text-sm text-emerald-600 mb-4">Changes saved.</p>
      )}

      {/* Package details */}
      <div className="bg-white rounded-2xl shadow-card p-6 mb-4">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Package details</h2>
        <form action={updateAction} className="flex flex-col gap-4">
          <Field label="Package name" required>
            <input name="name" required defaultValue={pkg.name} className="input" />
          </Field>

          <Field label="Description">
            <textarea
              name="description"
              rows={2}
              defaultValue={pkg.description ?? ''}
              className="input h-auto py-2 resize-y"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Base price (LKR)" required>
              <input name="base_price" type="number" min="0" step="500" required defaultValue={pkg.base_price} className="input" />
            </Field>
            <Field label="Shoots included">
              <input name="shoots_included" type="number" min="1" defaultValue={pkg.shoots_included} className="input" />
            </Field>
          </div>

          <div>
            <button type="submit" className="btn-primary">Save changes</button>
          </div>
        </form>
      </div>

      {/* Add-ons */}
      <div className="bg-white rounded-2xl shadow-card p-6">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Add-ons</h2>

        {addons.length > 0 && (
          <div className="flex flex-col gap-2 mb-5">
            {addons.map((addon) => {
              const toggleAction = toggleAddonActive.bind(null, addon.id, pkg.id, !addon.is_active);
              const deleteAction = deleteAddon.bind(null, addon.id, pkg.id);
              return (
                <div
                  key={addon.id}
                  className={`flex items-center gap-3 px-4 py-3 border border-gray-100 rounded-xl ${addon.is_active ? '' : 'opacity-60'}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-800">{addon.name}</span>
                      {!addon.is_active && (
                        <span className="text-[11px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Inactive</span>
                      )}
                    </div>
                    {addon.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{addon.description}</p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">
                    + LKR {addon.price.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Link                       href={`/packages/${pkg.id}/addons/${addon.id}/edit`}
                      className="text-xs text-[#0F3D2E] hover:underline"
                    >
                      Edit
                    </Link>
                    <form action={toggleAction} className="inline">
                      <button type="submit" className="text-xs text-gray-500 border border-gray-200 rounded px-2 py-0.5 hover:bg-gray-50 cursor-pointer bg-transparent">
                        {addon.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </form>
                    <form action={deleteAction} className="inline">
                      <button
                        type="submit"
                        className="text-xs text-red-500 border border-red-200 rounded px-2 py-0.5 hover:bg-red-50 cursor-pointer bg-transparent"
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

        <div className={addons.length > 0 ? 'border-t border-gray-100 pt-5' : ''}>
          <p className="text-sm font-medium text-gray-700 mb-3">Add new add-on</p>
          <form action={createAddonAction} className="flex flex-col gap-3">
            <div className="grid grid-cols-[1fr_140px] gap-3">
              <Field label="Name" required>
                <input name="name" required className="input" placeholder="Extra hour coverage" />
              </Field>
              <Field label="Price (LKR)" required>
                <input name="price" type="number" min="0" step="500" required className="input" placeholder="15000" />
              </Field>
            </div>
            <Field label="Description">
              <input name="description" className="input" placeholder="Optional description" />
            </Field>
            <div>
              <button type="submit" className="btn-secondary">+ Add add-on</button>
            </div>
          </form>
        </div>
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
