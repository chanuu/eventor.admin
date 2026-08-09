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

const STATUS_STYLES: Record<string, string> = {
  lead:       'bg-gray-100 text-gray-600',
  quoted:     'bg-amber-50 text-amber-700',
  contracted: 'bg-blue-50 text-blue-700',
  active:     'bg-green-50 text-[#2D6A4F]',
  editing:    'bg-violet-50 text-violet-700',
  proofing:   'bg-pink-50 text-pink-700',
  delivered:  'bg-emerald-50 text-emerald-700',
  archived:   'bg-gray-100 text-gray-400',
};

const COLUMNS: Column<JobRow>[] = [
  {
    key: 'title',
    label: 'Job',
    render: (job) => {
      const client = (job.clients as { full_name: string } | null)?.full_name ?? '—';
      return (
        <div>
          <p className="font-medium text-gray-900">{job.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {client}{job.event_type ? ` · ${job.event_type}` : ''}
          </p>
        </div>
      );
    },
  },
  {
    key: 'status',
    label: 'Status',
    width: '130px',
    render: (job) => (
      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[job.status] ?? STATUS_STYLES.lead}`}>
        {job.status}
      </span>
    ),
  },
  {
    key: 'total_price',
    label: 'Total',
    align: 'right',
    width: '150px',
    render: (job) => (
      <span className="font-semibold text-gray-900">
        LKR {job.total_price.toLocaleString()}
      </span>
    ),
  },
  {
    key: 'actions',
    label: 'Actions',
    align: 'center',
    width: '90px',
    render: (job) => (
      <div className="flex items-center justify-center gap-2">
        <a
          href={`/jobs/${job.id}`}
          onClick={(e) => e.stopPropagation()}
          className="text-[#2D6A4F] hover:text-[#1B4332] transition-colors"
          title="View"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
        </a>
      </div>
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
