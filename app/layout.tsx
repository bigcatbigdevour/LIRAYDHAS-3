import type { Metadata } from 'next';
import { Inter, DM_Serif_Display } from 'next/font/google';
import './globals.css';
import TabBar from '@/components/TabBar';
import AddToHomeScreen from '@/components/AddToHomeScreen';
import PixelCreatures from '@/components/PixelCreatures';

const sans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const serif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'Liraydhas',
  description: 'A daily reading of the sky, and your design.',
  applicationName: 'Liraydhas',
  appleWebApp: {
    capable: true,
    title: 'Liraydhas',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icon-192.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/icon-512.svg' },
    ],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
  maximumScale: 1,
  viewportFit: 'cover' as const,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`}>
      <body>
        <div className="grain" aria-hidden />
        {children}
        <PixelCreatures />
        <TabBar />
        <AddToHomeScreen />
      </body>
    </html>
  );
}
