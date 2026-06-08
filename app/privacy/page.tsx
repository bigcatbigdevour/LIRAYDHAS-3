'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="page max-w-md mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">privacy</p>
        <h1 className="h-display serif mt-3">What we collect.</h1>
      </header>

      <section className="space-y-4 body-prose serif text-ink-dim">
        <p>
          Liraydhas runs almost entirely on your device. Your birth date,
          time, and place are stored only in your browser&rsquo;s local
          storage (or, in the iOS app, the WebView&rsquo;s local storage).
          We do not have a database. We do not have user accounts.
        </p>

        <h2 className="caps small-label pt-4">What leaves your device</h2>
        <p>
          When you load the daily, polarity, or chart-narrative reading,
          the app sends your computed astrology + Human Design
          blueprint &mdash; <em>not</em> your raw birth data &mdash; to
          our server, which forwards a prompt to Anthropic&rsquo;s Claude
          API to generate the paragraph. The blueprint contains your
          natal planetary positions, defined centers, channels, type,
          authority, and profile. It does not include your birth time,
          birth city, or any identifier.
        </p>
        <p>
          We do not log these requests. Anthropic processes the prompt
          per its own API terms (see anthropic.com/legal).
        </p>

        <h2 className="caps small-label pt-4">Geocoding</h2>
        <p>
          During onboarding, when you type a city, the app calls the free
          Open-Meteo geocoding API to resolve it to a latitude/longitude
          and timezone. That request contains only the text you typed.
        </p>

        <h2 className="caps small-label pt-4">Analytics</h2>
        <p>
          None. There are no third-party trackers, no advertising SDKs,
          no Google Analytics, no Mixpanel, no Sentry.
        </p>

        <h2 className="caps small-label pt-4">Your data, on your terms</h2>
        <p>
          From the About page you can reset your blueprint at any time,
          which clears local storage. Uninstalling the iOS app also
          deletes everything.
        </p>

        <h2 className="caps small-label pt-4">Children</h2>
        <p>
          Liraydhas is not directed to children under 13 and we do not
          knowingly collect data from them.
        </p>

        <h2 className="caps small-label pt-4">Contact</h2>
        <p>
          Questions: open an issue at the project&rsquo;s GitHub
          repository.
        </p>

        <p className="text-ink-faint pt-6">Last updated: 2026-06-08.</p>
      </section>

      <div className="pt-8">
        <Link href="/about" className="caps small-label text-accent">
          &larr; back
        </Link>
      </div>
    </main>
  );
}
