'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';

export default function Root() {
  const router = useRouter();
  const blueprint = useStore((s) => s.blueprint);
  // zustand persist sets the value asynchronously on the client; wait one tick.
  useEffect(() => {
    const t = setTimeout(() => {
      router.replace(blueprint ? '/today' : '/onboarding');
    }, 30);
    return () => clearTimeout(t);
  }, [router, blueprint]);

  return (
    <main className="page flex items-center justify-center">
      <p className="caps small-label">liraydhas</p>
    </main>
  );
}
