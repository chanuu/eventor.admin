'use client';

import Link from 'next/link';
import DataTable, { type Column } from '@/components/DataTable';
import { RowActions, RowActionLink, RowActionButton } from '@/components/RowActions';
import { togglePackageActive } from './actions';

export type PackageRow = {
  id: string;
  name: string;
  description: string | null;
  base_price: number;
  shoots_included: number;
  is_active: boolean;
  created_at: string;
  addonCount: number;
};

const COLUMNS: Column<PackageRow>[] = [
  {
    key: 'name',
    label: 'Package',
    primary: true,
    render: (pkg) => (
      <div className={`min-w-0 ${pkg.is_active ? '' : 'opacity-60'}`}>
        <div className="flex items-center gap-2">
          <Link
            href={`/packages/${pkg.id}/edit`}
            className="font-medium text-gray-900 hover:text-[#0F3D2E] truncate"
          >
            {pkg.name}
          </Link>
          {!pkg.is_active && <span className="pill-neutral">Inactive</span>}
        </div>
        {pkg.description && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{pkg.description}</p>
        )}
      </div>
    ),
  },
  {
    key: 'includes',
    label: 'Includes',
    width: '200px',
    render: (pkg) => (
      <span className="text-gray-700 whitespace-nowrap">
        {pkg.shoots_included} shoot{pkg.shoots_included !== 1 ? 's' : ''}
        {' · '}
        {pkg.addonCount} add-on{pkg.addonCount !== 1 ? 's' : ''}
      </span>
    ),
  },
  {
    key: 'price',
    label: 'Price',
    width: '150px',
    align: 'right',
    render: (pkg) => (
      <span className="font-bold text-gray-900 whitespace-nowrap">
        LKR {pkg.base_price.toLocaleString('en-LK')}
      </span>
    ),
  },
  {
    key: 'actions',
    label: '',
    width: '110px',
    align: 'right',
    render: (pkg) => (
      <RowActions>
        <RowActionLink href={`/packages/${pkg.id}/edit`} icon="edit" label="Edit package" />
        <form action={togglePackageActive.bind(null, pkg.id, !pkg.is_active)}>
          <RowActionButton
            type="submit"
            icon="power"
            label={pkg.is_active ? 'Deactivate package' : 'Activate package'}
          />
        </form>
      </RowActions>
    ),
  },
];

/**
 * Rows are deliberately not click-through: each carries its own Edit link and
 * activate/deactivate form, and DataTable renders a clickable row as an anchor
 * on mobile — a form nested inside an anchor is invalid markup.
 */
export default function PackagesTable({ rows }: { rows: PackageRow[] }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={rows}
      emptyMessage="No packages yet. Create one so you can quote jobs and add extras to them."
    />
  );
}
