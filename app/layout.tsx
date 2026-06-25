import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Minecraft',
  description: 'A Minecraft-like voxel game in the browser',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
