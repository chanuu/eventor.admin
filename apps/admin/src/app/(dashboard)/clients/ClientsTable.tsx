'use client';

import Link from 'next/link';
import DataTable, { type Column } from '@/components/DataTable';

export type ClientRow = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
  jobCount: number;
};

const COLUMNS: Column<ClientRow>[] = [
  {
    key: 'name',
    label: 'Client',
    render: (c) => (
      <div className="min-w-0">
        <p className="font-medium text-ink-strong">{c.full_name}</p>
        <p className="text-xs text-ink-muted mt-0.5 truncate">
          {[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact details'}
        </p>
      </div>
    ),
  },
  {
    key: 'jobs',
    label: 'Jobs',
    align: 'right',
    width: '110px',
    render: (c) => (
      <span className="font-semibold text-ink-strong">
        {c.jobCount} job{c.jobCount !== 1 ? 's' : ''}
      </span>
    ),
  },
  {
    key: 'created_at',
    label: 'Added',
    align: 'right',
    width: '140px',
    render: (c) => (
      <span className="text-ink-mid">
        {new Date(c.created_at).toLocaleDateString('en-LK', { dateStyle: 'medium' })}
      </span>
    ),
  },
  {
    key: 'actions',
    label: 'Actions',
    align: 'center',
    width: '90px',
    hideOnCard: true,   // the whole card already opens the client
    render: (c) => (
      <Link
        href={`/clients/${c.id}/edit`}
        onClick={(e) => e.stopPropagation()}
        className="text-primary hover:text-primary-dark font-semibold text-[13px]"
      >
        Edit
      </Link>
    ),
  },
];

export default function ClientsTable({
  clients, emptyMessage,
}: {
  clients: ClientRow[];
  emptyMessage?: React.ReactNode;
}) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={clients}
      getRowHref={(c) => `/clients/${c.id}/edit`}
      emptyMessage={emptyMessage}
    />
  );
}
