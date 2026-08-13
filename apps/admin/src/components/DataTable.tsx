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
  columns, rows, getRowHref, emptyMessage = 'No results found.',
}: Props<T>) {
  const router = useRouter();

  if (rows.length === 0) {
    return (
      <div className="py-16 text-center text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-2xl">
        {emptyMessage}
      </div>
    );
  }

  return (
    // Tables scroll sideways on phones rather than squashing or overflowing the page.
    <div className="overflow-x-auto rounded-2xl border border-line">
      <table className="w-full border-collapse min-w-[640px]">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={`px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-white
                  ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {rows.map((row, i) => {
            const href = getRowHref?.(row);
            return (
              <tr
                key={i}
                onClick={href ? () => router.push(href) : undefined}
                onMouseEnter={href ? (e) => { e.currentTarget.style.background = '#f9fafb'; } : undefined}
                onMouseLeave={href ? (e) => { e.currentTarget.style.background = ''; } : undefined}
                className={`border-b border-gray-50 last:border-0 transition-colors ${href ? 'cursor-pointer' : ''}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-5 py-3.5 text-sm text-gray-700 align-middle
                      ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
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
