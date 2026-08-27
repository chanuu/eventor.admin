'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Debounced search that lives in the URL, so the result set is shareable and
 * survives a refresh. Filtering happens server-side against the query string.
 */
export default function SearchInput({
  placeholder = 'Search here…',
  paramName = 'q',
  className = '',
}: {
  placeholder?: string;
  paramName?: string;
  className?: string;
}) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const [value, setValue] = useState(params.get(paramName) ?? '');
  const first = useRef(true);

  // Keep in step when the URL changes from elsewhere (back button, filter reset).
  useEffect(() => {
    setValue(params.get(paramName) ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get(paramName)]);

  useEffect(() => {
    if (first.current) { first.current = false; return; }

    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set(paramName, value.trim());
      else next.delete(paramName);
      next.delete('page');            // a new search starts at page one

      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 300);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className={`flex items-center gap-2 border border-line rounded-xl px-3 h-10 bg-white ${className}`}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8b968f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent text-sm text-ink-mid placeholder-ink-muted outline-none"
      />
      {value && (
        <button
          onClick={() => setValue('')}
          aria-label="Clear search"
          className="text-ink-muted hover:text-ink-mid text-lg leading-none px-1"
        >
          ×
        </button>
      )}
    </div>
  );
}
