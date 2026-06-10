'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore, useStoreHydrated } from '@/lib/store';

/**
 * Root route — bounces to /today if the user has a saved blueprint, or to
 * /onboarding if not.
 *
 * Critical: WAIT for Zustand persist to finish reading localStorage before
 * deciding. A returning user's blueprint sits in localStorage; if we read
 * `blueprint` before hydration completes we'd see null and redirect them
 * to /onboarding even though they're already onboarded. That feels like
 * "the app logged me out" — and it would happen on every cold start.
 */
export default function Root() {
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const blueprint = useStore((s) => s.blueprint);

  useEffect(() => {
    if (!hydrated) return;
    router.replace(blueprint ? '/today' : '/onboarding');
  }, [hydrated, blueprint, router]);

  return (
    <main className="page flex items-center justify-center">
      <p className="caps small-label text-ink-faint">liraydhas</p>
    </main>
  );
}
