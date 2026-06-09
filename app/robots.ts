import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // The app is entirely personal-data-driven and routes off /api/* are
      // pure JSON. Indexing it serves nobody.
      { userAgent: '*', disallow: '/api/' },
      { userAgent: '*', allow: '/' },
    ],
  };
}
