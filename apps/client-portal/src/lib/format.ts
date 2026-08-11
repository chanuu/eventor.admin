/** Sri Lankan rupee amounts, rendered as the design does: "Rs. 150,000". */
export function money(amount: number | null | undefined): string {
  const n = Number(amount ?? 0);
  return `Rs. ${Math.round(n).toLocaleString('en-LK')}`;
}

export function shortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return 'Not scheduled';
  return new Date(iso).toLocaleString('en-LK', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export function timeOnly(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-LK', { hour: 'numeric', minute: '2-digit' });
}

/** Whole days from today until `iso`. Negative once the date has passed. */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(iso); end.setHours(0, 0, 0, 0);
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/** "in 24 days" / "24 days ago" / "today". */
export function relativeDays(iso: string | null | undefined): string {
  const d = daysUntil(iso);
  if (d === null) return '';
  if (d === 0) return 'today';
  if (d > 0) return `in ${d} day${d === 1 ? '' : 's'}`;
  return `${-d} day${d === -1 ? '' : 's'} ago`;
}

/** Photos are stored as full S3 URLs; older rows hold a Supabase storage path. */
export function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}
