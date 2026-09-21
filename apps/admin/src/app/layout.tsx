import type { Metadata, Viewport } from 'next';
import { Nunito } from 'next/font/google';
import './globals.css';

// Spark's typeface. Loaded through next/font so it is self-hosted and does not
// flash — the weights here cover body, labels, buttons and headings.
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Eventor — Studio Admin',
  description: 'Photography studio management',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Studios pinch-zoom photo thumbnails on site; don't block it.
  maximumScale: 5,
  themeColor: '#0F3D2E',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={nunito.variable}>
      <body>{children}</body>
    </html>
  );
}
