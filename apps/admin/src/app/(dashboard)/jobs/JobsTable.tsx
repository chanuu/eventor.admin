'use client';

import DataTable, { type Column } from '@/components/DataTable';

export type JobRow = {
  id: string;
  title: string;
  event_type: string | null;
  status: string;
  total_price: number;
  created_at: string;
  clients: { full_name: string } | null;
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  lead:       { bg: '#f3f4f6', color: '#6b7280' },
  quoted:     { bg: '#fef3c7', color: '#92400e' },
  contracted: { bg: '#dbeafe', color: '#1e40af' },
  active:     { bg: '#dcfce7', color: '#166534' },
  editing:    { bg: '#ede9fe', color: '#5b21b6' },
  proofing:   { bg: '#fce7f3', color: '#9d174d' },
  delivered:  { bg: '#d1fae5', color: '#065f46' },
  archived:   { bg: '#f3f4f6', color: '#9ca3af' },
};

const COLUMNS: Column<JobRow>[] = [
  {
    key: 'title',
    label: 'Job',
    render: (job) => {
      const client = (job.clients as { full_name: string } | null)?.full_name ?? '—';
      return (
        <div>
          <div style={{ fontWeight: 500, color: '#111827' }}>{job.title}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
            {client}{job.event_type ? ` · ${job.event_type}` : ''}
          </div>
        </div>
      );
    },
  },
  {
    key: 'status',
    label: 'Status',
    width: '130px',
    render: (job) => {
      const { bg, color } = STATUS_COLORS[job.status] ?? STATUS_COLORS.lead;
      return (
        <span style={{
          fontSize: 11, fontWeight: 600,
          padding: '3px 10px', borderRadius: 10,
          background: bg, color,
          textTransform: 'capitalize', whiteSpace: 'nowrap',
        }}>
          {job.status}
        </span>
      );
    },
  },
  {
    key: 'total_price',
    label: 'Total',
    align: 'right',
    width: '150px',
    render: (job) => (
      <span style={{ fontWeight: 600, color: '#111827' }}>
        LKR {job.total_price.toLocaleString()}
      </span>
    ),
  },
];

export default function JobsTable({
  jobs,
  emptyMessage,
}: {
  jobs: JobRow[];
  emptyMessage?: React.ReactNode;
}) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={jobs}
      getRowHref={(job) => `/jobs/${job.id}`}
      emptyMessage={emptyMessage}
    />
  );
}
