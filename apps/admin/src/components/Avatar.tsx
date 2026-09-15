/**
 * A staff member's picture, falling back to their initials.
 *
 * Server-safe (no hooks), so it can be used in both server pages and client
 * components. Sizes are explicit pixel values rather than Tailwind classes so a
 * caller can ask for any size without the class being purged from the build.
 */
export function initialsOf(name: string | null | undefined): string {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '—';
}

export default function Avatar({
  name,
  url,
  size = 32,
  className = '',
}: {
  name: string | null;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  const label = name ?? 'Unassigned';

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- S3 URLs, not next/image
      <img
        src={url}
        alt={label}
        title={label}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        style={{ width: size, height: size }}
        className={`rounded-full object-cover bg-panel shrink-0 ${className}`}
      />
    );
  }

  return (
    <span
      title={label}
      aria-label={label}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.36)) }}
      className={`rounded-full grid place-items-center font-bold shrink-0
        ${name
          ? 'bg-primary text-white'
          : 'bg-panel text-ink-muted border border-dashed border-line'}
        ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}
