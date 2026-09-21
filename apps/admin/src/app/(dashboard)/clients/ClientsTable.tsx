'use client';

import DataTable, { type Column } from '@/components/DataTable';
import { RowActions, RowActionLink } from '@/components/RowActions';

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
    render: (c) => <span className="font-medium text-ink-strong">{c.full_name}</span>,
  },
  {
    key: 'email',
    label: 'Email',
    width: '240px',
    render: (c) =>
      c.email ? (
        // stopPropagation so the mail client opens instead of the row navigating.
        <a
          href={`mailto:${c.email}`}
          onClick={(e) => e.stopPropagation()}
          className="text-ink-mid hover:text-primary truncate block"
          title={c.email}
        >
          {c.email}
        </a>
      ) : (
        <span className="text-ink-muted">—</span>
      ),
  },
  {
    key: 'phone',
    label: 'Phone',
    width: '170px',
    render: (c) =>
      c.phone ? (
        <a
          href={`tel:${c.phone.replace(/s+/g, '')}`}
          onClick={(e) => e.stopPropagation()}
          className="text-ink-mid hover:text-primary whitespace-nowrap"
        >
          {c.phone}
        </a>
      ) : (
        <span className="text-ink-muted">—</span>
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
    label: '',
    align: 'right',
    width: '90px',
    hideOnCard: true,   // the whole card already opens the client
    render: (c) => (
      <RowActions>
        <RowActionLink href={`/clients/${c.id}/edit`} icon="edit" label="Edit client" />
      </RowActions>
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
