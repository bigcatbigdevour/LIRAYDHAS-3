'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/lib/store';
import { tap } from '@/lib/haptics';

const TABS = [
  { href: '/today',    label: 'Today',    Icon: SunIcon },
  { href: '/arcs',     label: 'Arcs',     Icon: ArcIcon },
  { href: '/polarity', label: 'Polarity', Icon: PolarityIcon },
  { href: '/chart',    label: 'Chart',    Icon: WheelIcon },
];

export default function TabBar() {
  const pathname = usePathname();
  const blueprint = useStore((s) => s.blueprint);

  // Don't render the tab bar on onboarding or before there's a blueprint.
  if (!blueprint) return null;
  if (pathname === '/onboarding' || pathname === '/') return null;

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 bg-bg border-t border-hairline"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="grid grid-cols-4">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={() => { if (!active) tap('light'); }}
                className={`flex flex-col items-center justify-center gap-1 py-3 text-[10px] ${
                  active ? 'text-ink' : 'text-ink-faint'
                }`}
                style={{ letterSpacing: '0.18em' }}
              >
                <Icon active={active} />
                <span className="uppercase">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SunIcon({ active }: { active: boolean }) {
  const c = active ? '#f4f1ea' : '#666';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="4" stroke={c} strokeWidth="1" />
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="0.6" />
    </svg>
  );
}
function ArcIcon({ active }: { active: boolean }) {
  const c = active ? '#f4f1ea' : '#666';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M3 17 Q12 4 21 17" stroke={c} strokeWidth="1" fill="none" />
      <path d="M3 19 L21 19" stroke={c} strokeWidth="0.6" />
    </svg>
  );
}
function PolarityIcon({ active }: { active: boolean }) {
  const c = active ? '#f4f1ea' : '#666';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M5 4 L12 11 L19 4 Z" stroke={c} strokeWidth="1" fill="none" />
      <path d="M5 20 L12 13 L19 20 Z" stroke={c} strokeWidth="1" fill="none" />
    </svg>
  );
}
function WheelIcon({ active }: { active: boolean }) {
  const c = active ? '#f4f1ea' : '#666';
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={c} strokeWidth="0.8" />
      <path d="M12 3 V21 M3 12 H21" stroke={c} strokeWidth="0.6" />
      <path d="M5 5 L19 19 M19 5 L5 19" stroke={c} strokeWidth="0.4" />
    </svg>
  );
}
