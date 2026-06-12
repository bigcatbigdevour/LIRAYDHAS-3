'use client';

import { useState } from 'react';
import Link from 'next/link';
import { buildLabel } from '@/lib/buildInfo';
import { useStore } from '@/lib/store';
import { listSavedDays } from '@/lib/savedDays';
import { listPartners } from '@/lib/partners';
import { tap as hapticTap } from '@/lib/haptics';

/**
 * In-app support / contact surface. App Review checks that users have a
 * documented way to reach the developer — putting it on a real page
 * (rather than a buried link in a privacy policy) makes that review
 * box trivial to check.
 *
 * The page does two things:
 *   1. Offer a pre-filled mailto link with diagnostic info the user can
 *      optionally include (build hash, blueprint presence, journal
 *      count). No personal data leaks unless the user actually opens
 *      the mail client AND sends.
 *   2. Show the "where else to find help" surface — privacy, learn,
 *      about, plus a one-line "what this is and isn't" reminder.
 */

const CONTACT_EMAIL = 'support@liraydhas.app';

export default function SupportPage() {
  const blueprint = useStore((s) => s.blueprint);
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);
  const [topic, setTopic] = useState<string>('a question');

  const diag = useDiagnosticsLine(blueprint != null);

  const subject = `Liraydhas — ${topic}`;
  const body = includeDiagnostics
    ? `\n\n\n— diagnostic info (helps me debug) —\n${diag}`
    : '';
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <main className="page max-w-md mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">Support</p>
        <h1 className="h-display serif mt-3">Get in touch.</h1>
      </header>

      <section className="space-y-4 body-prose serif text-ink-dim">
        <p>
          If something feels off, or a date isn't lining up, or you wish
          this app did one specific thing it doesn't yet — I'd like to
          know. The faster I hear about a problem, the faster it gets
          fixed.
        </p>
      </section>

      <section className="mt-8 border-l-2 border-accent pl-3 py-2 space-y-3">
        <p
          className="small-label caps text-accent"
          style={{ letterSpacing: '0.18em' }}
        >
          send an email
        </p>
        <label className="block">
          <span
            className="small-label caps text-ink-faint text-[10px] block mb-1"
            style={{ letterSpacing: '0.16em' }}
          >
            what's this about
          </span>
          <select
            value={topic}
            onChange={(e) => setTopic(e.currentTarget.value)}
            className="bg-bg border border-hairline px-2 py-1 text-[13px] text-ink"
          >
            <option value="a question">a question</option>
            <option value="a bug">a bug</option>
            <option value="a wrong reading">a wrong reading</option>
            <option value="a feature idea">a feature idea</option>
            <option value="something else">something else</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-[12.5px] text-ink-dim cursor-pointer">
          <input
            type="checkbox"
            checked={includeDiagnostics}
            onChange={(e) => setIncludeDiagnostics(e.currentTarget.checked)}
            className="accent-accent"
          />
          include diagnostic info (build / device basics — no personal data)
        </label>
        <a
          href={mailto}
          onClick={() => hapticTap('light')}
          className="btn-ghost inline-block"
        >
          open mail · {CONTACT_EMAIL}
        </a>
      </section>

      <section className="mt-10 space-y-2">
        <p
          className="small-label caps text-ink-faint mb-2"
          style={{ letterSpacing: '0.18em' }}
        >
          while you wait
        </p>
        <Link href="/learn" className="btn-ghost block">
          read the system guide →
        </Link>
        <Link href="/privacy" className="btn-ghost block">
          privacy policy →
        </Link>
        <Link href="/about" className="btn-ghost block">
          about the app →
        </Link>
      </section>

      <p
        className="text-[11.5px] text-ink-faint serif italic mt-10 leading-relaxed"
      >
        Liraydhas is a personal-use observational tool. Not a
        mental-health service, not a medical service, not a substitute
        for professional support. If you're in crisis, please reach out
        to a local helpline.
      </p>

      <p
        className="small-label caps text-ink-faint text-[10px] mt-4"
        style={{ letterSpacing: '0.16em' }}
      >
        build · {buildLabel()}
      </p>
    </main>
  );
}

/**
 * One-line diagnostic string included in the support email if the user
 * opts in. Avoids putting birth data or journal text in the body —
 * just counts and identifiers.
 */
function useDiagnosticsLine(hasBlueprint: boolean): string {
  const savedDays = typeof window !== 'undefined' ? listSavedDays().length : 0;
  const partners = typeof window !== 'undefined' ? listPartners().length : 0;
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '(unknown)';
  const lang = typeof navigator !== 'undefined' ? navigator.language : '(unknown)';
  const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '(unknown)';
  return [
    `build: ${buildLabel()}`,
    `blueprint: ${hasBlueprint ? 'present' : 'none'}`,
    `saved entries: ${savedDays}`,
    `partners: ${partners}`,
    `timezone: ${tz}`,
    `language: ${lang}`,
    `device: ${ua}`,
  ].join('\n');
}
