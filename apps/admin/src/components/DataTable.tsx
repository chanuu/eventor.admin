'use client';

import { useRouter } from 'next/navigation';

export type Column<T> = {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => React.ReactNode;
};

type Props<T extends object> = {
  columns: Column<T>[];
  rows: T[];
  getRowHref?: (row: T) => string;
  emptyMessage?: React.ReactNode;
};

export default function DataTable<T extends object>({
  columns,
  rows,
  getRowHref,
  emptyMessage = 'No results found.',
}: Props<T>) {
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <div style={{
        padding: 48, textAlign: 'center', color: '#9ca3af',
        border: '2px dashed #e5e7eb', borderRadius: 8, fontSize: 13,
      }}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: '10px 16px',
                  fontSize: 11, fontWeight: 600,
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: col.align ?? 'left',
                  width: col.width,
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const href = getRowHref?.(row);
            return (
              <tr
                key={i}
                onClick={href ? () => router.push(href) : undefined}
                onMouseEnter={href ? (e) => { e.currentTarget.style.background = '#f9fafb'; } : undefined}
                onMouseLeave={href ? (e) => { e.currentTarget.style.background = '#fff'; } : undefined}
                style={{
                  borderTop: '1px solid #f3f4f6',
                  cursor: href ? 'pointer' : 'default',
                  background: '#fff',
                }}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: '12px 16px',
                      fontSize: 13,
                      textAlign: col.align ?? 'left',
                      verticalAlign: 'middle',
                    }}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
