'use client';

import DataTable, { type Column } from '@/components/DataTable';

export type GalleryRow = {
  id: string;
  title: string;
  status: string;
  selection_deadline: string | null;
  selection_submitted_at: string | null;
  created_at: string;
  photoCount: number;
};

const STATUS_PILL: Record<string, { cls: string; label: string }> = {
  hidden: { cls: 'pill-neutral', label: 'Hidden' },
  proofing: { cls: 'pill-pending', label: 'Proofing' },
  approved: { cls: 'pill-good', label: 'Approved' },
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-LK', { dateStyle: 'medium' });
}

const COLUMNS: Column<GalleryRow>[] = [
  {
    key: 'title',
    label: 'Gallery',
    primary: true,
    render: (g) => (
      <div className="min-w-0">
        <p className="font-medium text-gray-900 truncate">{g.title}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {g.photoCount} photo{g.photoCount !== 1 ? 's' : ''}
        </p>
      </div>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    width: '190px',
    render: (g) => {
      const pill = STATUS_PILL[g.status] ?? STATUS_PILL.hidden;
      return (
        <div className="flex items-center gap-1.5 flex-wrap justify-end md:justify-start">
          <span className={pill.cls}>{pill.label}</span>
          {g.status === 'proofing' && g.selection_submitted_at && (
            <span className="pill-good">Selection in</span>
          )}
        </div>
      );
    },
  },
  {
    key: 'deadline',
    label: 'Deadline',
    width: '150px',
    render: (g) => <span className="text-gray-700">{formatDate(g.selection_deadline)}</span>,
  },
  {
    key: 'open',
    label: '',
    width: '110px',
    align: 'right',
    hideOnCard: true,
    render: () => (
      <span className="text-[13px] font-medium text-[#0F3D2E] whitespace-nowrap">Open →</span>
    ),
  },
];

/**
 * Column definitions carry render functions, which cannot cross the server
 * boundary — so, like JobsTable and ClientsTable, they live in a client
 * component and the page passes plain rows.
 */
export default function GalleriesTable({ rows, jobId }: { rows: GalleryRow[]; jobId: string }) {
  return (
    <DataTable
      columns={COLUMNS}
      rows={rows}
      getRowHref={(g) => `/jobs/${jobId}/gallery/${g.id}`}
      emptyMessage="No galleries yet. Create one to upload proofs and share them with the client."
    />
  );
}
