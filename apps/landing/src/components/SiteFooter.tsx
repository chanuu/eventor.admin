const COLUMNS: { title: string; links: [string, string][] }[] = [
  {
    title: 'Studio Manager',
    links: [['/studio-manager#albums', 'Album design'], ['/studio-manager#retouch', 'Magic Retouch'], ['/studio-manager#cards', 'Thank you cards'], ['/studio-manager#faq', 'Questions']],
  },
  {
    title: 'CRM',
    links: [['/crm#crm', 'Bookings and clients'], ['/crm#proofing', 'Photo proofing'], ['/crm#album', 'Virtual album'], ['/crm#pricing', 'Pricing']],
  },
  {
    title: 'Eventor',
    links: [['/', 'Home'], ['/get-started', 'Get started'], ['https://app.eventorcrm.com', 'Sign in']],
  },
];

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-row">
        <div>
          <div className="site-footer-word">Ev<span>e</span>ntor</div>
          <p>Photography studio platform<br />Colombo, Sri Lanka</p>
        </div>
        <div className="site-footer-cols">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3>{col.title}</h3>
              {col.links.map(([href, label]) => <a key={label} href={href}>{label}</a>)}
            </div>
          ))}
        </div>
      </div>
      <div className="site-footer-legal">© 2026 Eventor. All rights reserved.</div>
    </footer>
  );
}
