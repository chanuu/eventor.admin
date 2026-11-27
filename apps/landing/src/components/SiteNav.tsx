import { T } from '@/lib/content';

type Product = 'studio-manager' | 'crm' | null;

const PRODUCTS: { key: Exclude<Product, null>; href: string; label: string }[] = [
  { key: 'studio-manager', href: '/studio-manager', label: 'Studio Manager' },
  { key: 'crm', href: '/crm', label: 'CRM' },
];

/**
 * The bar at the top of every page: the two products first, then the current page's own
 * sections, then signing in. `dark` suits the Studio Manager page, which matches the app.
 */
export default function SiteNav({
  current = null, links = [], dark = false,
}: {
  current?: Product;
  links?: [string, string][];
  dark?: boolean;
}) {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'https://app.eventorcrm.com';
  return (
    <div className={`site-nav ${dark ? 'dark' : ''}`}>
      <div className="site-nav-row">
        <a href="/" className="site-logo" aria-label="Eventor home">
          <span className="site-logo-mark">e</span>
          <span className="site-logo-word">Eventor</span>
        </a>

        <nav className="site-products" aria-label="Products">
          {PRODUCTS.map((p) => (
            <a key={p.key} href={p.href} className={current === p.key ? 'on' : ''} aria-current={current === p.key ? 'page' : undefined}>
              {p.label}
            </a>
          ))}
        </nav>

        {links.length > 0 && (
          <nav className="site-sections" aria-label="On this page">
            {links.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
          </nav>
        )}

        <div className="site-nav-end">
          <a href={adminUrl} className="site-signin">Sign in</a>
          <a href="/get-started" className="site-start" style={{ background: T.gradient }}>Get started</a>
        </div>
      </div>
    </div>
  );
}
