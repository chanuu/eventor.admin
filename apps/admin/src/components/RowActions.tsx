import Link from 'next/link';

/**
 * Icon-only row actions, following the Spark pattern: a bare 16px glyph with no
 * button chrome, several sitting together in a row. Text labels made every
 * table's last column wide and shouty; icons keep the data the loudest thing on
 * the row.
 *
 * Every action carries a title and aria-label, because an icon alone is not a
 * label for anyone using a screen reader or hovering to check what it does.
 */

const ICONS = {
  edit: (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
    </>
  ),
  delete: (
    <>
      <path d="M3 6h18" />
      <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  view: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  power: (
    <>
      <path d="M12 2v10" />
      <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
    </>
  ),
} as const;

export type RowActionIcon = keyof typeof ICONS;

function Glyph({ icon, size = 16 }: { icon: RowActionIcon; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {ICONS[icon]}
    </svg>
  );
}

const base =
  'text-ink-muted hover:text-primary transition-colors cursor-pointer disabled:opacity-40';
const danger = 'text-ink-muted hover:text-red-600 transition-colors cursor-pointer';

/** Wrapper that spaces a row's actions the way Spark does. */
export function RowActions({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-4 justify-end">{children}</div>;
}

export function RowActionLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: RowActionIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      // Rows are often click-through; this must not trigger the row as well.
      onClick={(e) => e.stopPropagation()}
      className={icon === 'delete' ? danger : base}
    >
      <Glyph icon={icon} />
    </Link>
  );
}

export function RowActionButton({
  icon,
  label,
  onClick,
  type = 'button',
  disabled,
}: {
  icon: RowActionIcon;
  label: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={`border-0 bg-transparent p-0 ${icon === 'delete' ? danger : base}`}
    >
      <Glyph icon={icon} />
    </button>
  );
}
