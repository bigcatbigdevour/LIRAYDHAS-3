import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Liraydhas',
    short_name: 'Liraydhas',
    description: 'A daily reading of the sky, and your design.',
    start_url: '/today',
    scope: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    orientation: 'portrait',
    categories: ['lifestyle', 'productivity', 'utilities'],
    // Two purposes per size: 'any' for general use, 'maskable' so
    // Android adaptive icons don't crop the cardinal cross. The icon
    // centers everything within a safe inner circle, satisfying the
    // maskable spec. (Next.js's manifest types want one purpose per
    // entry, so we list both variants explicitly.)
    icons: [
      { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
