import Link from "next/link";
type Props = {
  page: number;
  totalPages: number;
  pathname: string;
  params?: Record<string, string>;
};

export default function Pagination({ page, totalPages, pathname, params = {} }: Props) {
  if (totalPages <= 1) return null;

  function href(p: number) {
    const qs = new URLSearchParams(params);
    if (p > 1) qs.set('page', String(p)); else qs.delete('page');
    const str = qs.toString();
    return str ? `${pathname}?${str}` : pathname;
  }

  const range = buildRange(page, totalPages);

  return (
    <div className="flex items-center gap-1 mt-6">
      <NavBtn href={page > 1 ? href(page - 1) : null} label="‹" />
      {range.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="w-8 text-center text-sm text-gray-400">…</span>
        ) : (
          <a
            key={p}
            href={href(p as number)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors
              ${p === page
                ? 'bg-[#0F3D2E] text-white font-semibold'
                : 'text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
          >
            {p}
          </a>
        )
      )}
      <NavBtn href={page < totalPages ? href(page + 1) : null} label="›" />
    </div>
  );
}

function NavBtn({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return (
      <span className="w-8 h-8 flex items-center justify-center rounded-lg text-sm text-gray-300 border border-gray-100">
        {label}
      </span>
    );
  }
  return (
    <Link href={href} className="w-8 h-8 flex items-center justify-center rounded-lg text-sm text-gray-600 border border-gray-200 hover:bg-gray-100 transition-colors">
      {label}
    </Link>
  );
}

function buildRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const delta = 2;
  const pages: (number | '...')[] = [1];
  if (current - delta > 2) pages.push('...');
  for (let p = Math.max(2, current - delta); p <= Math.min(total - 1, current + delta); p++) pages.push(p);
  if (current + delta < total - 1) pages.push('...');
  pages.push(total);
  return pages;
}
