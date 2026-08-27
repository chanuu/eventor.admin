import Link from "next/link";
import Lottie from './Lottie';

/**
 * Empty grid/table state — animation, a line explaining what's missing, and the
 * action that fills it.
 */
export function EmptyState({ title, description, action, compact }: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
  /** Smaller animation for panels and cards, rather than a full-page grid. */
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center px-6 ${compact ? 'pt-2 pb-6' : 'pt-7 pb-10'}`}>
      <Lottie kind="empty" size={compact ? 130 : 200} />
      <p className="text-[15px] font-bold text-primary mt-1">{title}</p>
      {description && (
        <p className="text-[13px] text-ink-muted mt-1.5 max-w-[280px]">{description}</p>
      )}
      {action && (
        <Link href={action.href} className="btn-primary mt-4">{action.label}</Link>
      )}
    </div>
  );
}

/** Inline loading state, for Suspense fallbacks and pending panels. */
export function LoadingState({ title = 'Loading', description }: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-line shadow-card p-5 flex items-center gap-4">
      <Lottie kind="loading" size={64} />
      <div className="min-w-0">
        <p className="text-sm font-bold text-primary">{title}</p>
        {description && <p className="text-[13px] text-ink-muted mt-0.5">{description}</p>}
      </div>
    </div>
  );
}
