'use client';

import { useEffect, useState } from 'react';

/**
 * Subtle "scroll down for more" affordance that fades out once the user
 * actually scrolls past it. A small chevron + label. Positioned where the
 * caller places it (below a visualization).
 */
export default function ScrollHint({ label = 'keep scrolling' }: { label?: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    function onScroll() {
      if (window.scrollY > 80) setVisible(false);
      else setVisible(true);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      aria-hidden
      className="flex flex-col items-center gap-1 mt-6 transition-opacity duration-500"
      style={{ opacity: visible ? 0.7 : 0 }}
    >
      <span
        className="small-label caps text-ink-faint"
        style={{ letterSpacing: '0.22em' }}
      >
        {label}
      </span>
      <svg width="14" height="20" viewBox="0 0 14 20" fill="none" className="text-ink-faint">
        <path d="M7 2 L7 16 M2 11 L7 16 L12 11" stroke="currentColor" strokeWidth="1" />
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
      </svg>
    </div>
  );
}
