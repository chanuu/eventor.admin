import type { Metadata, Viewport } from 'next';
import './globals.css';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
