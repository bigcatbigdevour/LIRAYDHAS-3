'use client';

import Link from 'next/link';
import Paywall from '@/components/Paywall';
import { useSubState, isPro, TRIAL_DAYS } from '@/lib/subscription';

/**
 * Standalone Pro page — what subscribing unlocks, the paywall, and the
 * cancel-anytime FAQ. Linked from /about and from any ProGate fallback.
 */
export default function ProPage() {
  const sub = useSubState();

  return (
    <main className="page max-w-md mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">Pro</p>
        <h1 className="h-display serif mt-3">Everything, unlocked.</h1>
        <p className="serif text-[14.5px] text-ink-dim mt-3 leading-relaxed">
          The free tier is everything you need to read your chart and
          journal a day. Pro removes every cap and turns on the
          conversational surfaces.
        </p>
      </header>

      <Paywall
        headline="A small monthly amount keeps the readings running, the model paid, and the journal yours."
      />

      <section className="mt-10 space-y-5">
        <h2
          className="small-label caps"
          style={{ letterSpacing: '0.18em' }}
        >
          questions
        </h2>
        <details className="border-l-2 border-hairline pl-3">
          <summary className="serif text-ink cursor-pointer text-[14px] py-1">
            How do I cancel?
          </summary>
          <p className="text-[13.5px] text-ink-dim serif mt-2 leading-relaxed pb-2">
            Settings → your Apple ID → Subscriptions → Liraydhas →
            Cancel. You keep access until the end of the period
            you&apos;ve already paid for.
          </p>
        </details>
        <details className="border-l-2 border-hairline pl-3">
          <summary className="serif text-ink cursor-pointer text-[14px] py-1">
            Will the free tier always be useful?
          </summary>
          <p className="text-[13.5px] text-ink-dim serif mt-2 leading-relaxed pb-2">
            Yes. The full chart, the daily reading, the journal with
            unlimited text notes, the arcs, the polarity bars — all
            stay free.
          </p>
        </details>
        <details className="border-l-2 border-hairline pl-3">
          <summary className="serif text-ink cursor-pointer text-[14px] py-1">
            What does the {TRIAL_DAYS}-day trial cover?
          </summary>
          <p className="text-[13.5px] text-ink-dim serif mt-2 leading-relaxed pb-2">
            Every Pro feature, no card needed. After the trial expires
            you drop back to free unless you subscribe. You can only
            start the trial once per device.
          </p>
        </details>
        <details className="border-l-2 border-hairline pl-3">
          <summary className="serif text-ink cursor-pointer text-[14px] py-1">
            Where does my money go?
          </summary>
          <p className="text-[13.5px] text-ink-dim serif mt-2 leading-relaxed pb-2">
            Apple takes 15–30%. The rest covers the language model that
            writes your daily paragraph, server hosting, and the
            developer&apos;s time. There are no investors, no ads, no
            data sales.
          </p>
        </details>
      </section>

      <section className="mt-10 space-y-2">
        <Link href="/today" className="btn-ghost block">today →</Link>
        <Link href="/about" className="btn-ghost block">about →</Link>
        <Link href="/privacy" className="btn-ghost block">privacy →</Link>
      </section>

      {sub.kind !== 'free' && (
        <p
          className="small-label caps text-ink-faint text-[10px] mt-8 italic"
          style={{ letterSpacing: '0.14em' }}
        >
          you are currently on the {sub.kind === 'trial' ? 'trial' : 'pro'} plan.
        </p>
      )}
    </main>
  );
}
