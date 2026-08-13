import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Eventor — Photography Studio SaaS for Sri Lanka',
  description: 'Manage your photography studio end-to-end. Jobs, clients, galleries, contracts, and payments in one place.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#111' }}>
        {children}
      </body>
    </html>
  );
}
