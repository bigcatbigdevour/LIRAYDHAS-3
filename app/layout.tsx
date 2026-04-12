import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LIRAYDHAS',
  description:
    'LIRAYDHAS — a questioning. Love Isn’t Real And You Don’t Have A Soul. Love Is Real And You Do Have A Soul.',
  icons: {
    icon: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22%3E%3Ccircle cx=%2216%22 cy=%2216%22 r=%228%22 fill=%22none%22 stroke=%22%231f3a8a%22 stroke-width=%221%22/%3E%3Ccircle cx=%2216%22 cy=%2216%22 r=%2213%22 fill=%22none%22 stroke=%22%231f3a8a%22 stroke-width=%220.6%22/%3E%3C/svg%3E',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
