'use client';

import { useRouter } from 'next/navigation';
import Lottie from './Lottie';

export type Column<T> = {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'right' | 'center';
  /** Heads the mobile card instead of appearing as a labelled field. Defaults to the first column. */
  primary?: boolean;
  /** Hidden on the mobile card — for row actions the whole card already links to. */
  hideOnCard?: boolean;
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
      <div className="rounded-2xl border-2 border-dashed border-line bg-white
                      flex flex-col items-center text-center px-6 pt-6 pb-10">
        <Lottie kind="empty" size={190} />
        <div className="text-[13.5px] text-ink-mid -mt-2">{emptyMessage}</div>
      </div>
    );
  }

  // The first column is the row's identity; the rest become labelled fields on
  // the mobile card. A column marked `primary` overrides that choice.
  const primaryIndex = Math.max(0, columns.findIndex((c) => c.primary));
  const primary = columns[primaryIndex];
  const secondary = columns.filter((c, i) => i !== primaryIndex && !c.hideOnCard);

  return (
    <>
      {/* ── Mobile: one card per row ── */}
      <div className="md:hidden flex flex-col gap-2.5">
        {rows.map((row, i) => {
          const href = getRowHref?.(row);
          const Card = href ? 'a' : 'div';
          return (
            <Card
              key={i}
              {...(href ? { href } : {})}
              className={`block bg-white border border-line rounded-2xl p-4 ${href ? 'active:bg-panel' : ''}`}
            >
              <div className="text-[15px] text-ink-strong">{primary.render(row)}</div>

              <div className="mt-3 pt-3 border-t border-line-soft flex flex-col gap-2">
                {secondary.map((col) => (
                  <div key={col.key} className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted shrink-0">
                      {col.label}
                    </span>
                    <span className="text-sm text-ink-body text-right min-w-0">{col.render(row)}</span>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── Desktop: the table ── */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-line">
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
    </>
  );
}
