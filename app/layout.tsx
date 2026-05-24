import type { Metadata } from 'next';
import { Inter, DM_Serif_Display } from 'next/font/google';
import './globals.css';
import TabBar from '@/components/TabBar';

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
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='6' fill='none' stroke='%23f4f1ea' stroke-width='1'/%3E%3Ccircle cx='16' cy='16' r='13' fill='none' stroke='%23f4f1ea' stroke-width='0.6'/%3E%3C/svg%3E",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0a0a0a',
  maximumScale: 1,
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
        <TabBar />
      </body>
    </html>
  );
}
