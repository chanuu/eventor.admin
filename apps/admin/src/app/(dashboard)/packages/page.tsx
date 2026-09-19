import { requireCapability, requireFeature } from '@/lib/staff';
import { createClient } from '@/lib/supabase/server';
import Pagination from '@/components/Pagination';
import PackagesTable, { type PackageRow } from './PackagesTable';
import NewPackageDialog from './NewPackageDialog';

const PACKAGES_PER_PAGE = 10;

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  await requireCapability('packages.manage');
  await requireFeature('jobs');
  const supabase = createClient();

  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);
  const rangeFrom = (page - 1) * PACKAGES_PER_PAGE;

  const [{ data: raw }, { count: total }] = await Promise.all([
    supabase
      .from('packages')
      .select('id, name, description, base_price, shoots_included, is_active, created_at')
      .order('created_at', { ascending: false })
      .range(rangeFrom, rangeFrom + PACKAGES_PER_PAGE - 1),
    supabase.from('packages').select('id', { count: 'exact', head: true }),
  ]);

  const rows = (raw ?? []) as Omit<PackageRow, 'addonCount'>[];
  const pageCount = Math.max(1, Math.ceil((total ?? 0) / PACKAGES_PER_PAGE));

  // Count add-ons per package in the database rather than fetching every
  // package_addons row for the studio. Bounded by the page size.
  const addonCounts = await Promise.all(
    rows.map(async (pkg) => {
      const { count } = await supabase
        .from('package_addons')
        .select('id', { count: 'exact', head: true })
        .eq('package_id', pkg.id)
        .eq('is_active', true);
      return count ?? 0;
    }),
  );

  const packages: PackageRow[] = rows.map((pkg, i) => ({ ...pkg, addonCount: addonCounts[i] }));

  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-6">
        <div>
          <h1 className="page-title">Packages</h1>
          <p className="breadcrumb">
            {total ?? 0} package{(total ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>

        <NewPackageDialog />
      </div>

      <PackagesTable rows={packages} />

      <Pagination page={page} totalPages={pageCount} pathname="/packages" />
    </div>
  );
}
