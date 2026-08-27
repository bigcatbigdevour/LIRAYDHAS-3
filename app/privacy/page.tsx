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
          time, place, journal entries, notes, tags, photos, and voice
          notes are stored only in your browser&rsquo;s local storage
          (or, in the iOS app, the WebView&rsquo;s storage and a private
          IndexedDB database). We do not have a database that holds your
          personal data. We do not have user accounts.
        </p>

        <h2 className="caps small-label pt-4">What leaves your device</h2>
        <p>
          When you load the daily, polarity, or chart-narrative reading,
          the app sends your computed blueprint to our server, which
          forwards a prompt to Anthropic&rsquo;s Claude API to generate
          the paragraph. The blueprint contains your natal planetary
          positions, defined centers, channels, type, authority, and
          profile. It also includes your birth time and location because
          the model uses them to time today&rsquo;s transits.
        </p>
        <p>
          We do not store these requests beyond the response. Anthropic
          processes the prompt per its own API terms
          (see anthropic.com/legal).
        </p>

        <h2 className="caps small-label pt-4">Geocoding</h2>
        <p>
          During onboarding, when you type a city, the app calls the
          free Open-Meteo geocoding API to resolve it to a
          latitude/longitude and timezone. That request contains only
          the text you typed.
        </p>

        <h2 className="caps small-label pt-4">Push notifications</h2>
        <p>
          If you enable daily reminders from the About page, your push
          subscription (a long random identifier from Apple/Google/the
          browser&rsquo;s push service) and your preferred local hour
          are stored on our server. We do not associate that
          subscription with your birth data. We send a single quiet
          notification when you ask us to, no targeting, no tracking.
          Disabling reminders deletes the subscription.
        </p>

        <h2 className="caps small-label pt-4">Analytics</h2>
        <p>
          None. There are no third-party trackers, no advertising SDKs,
          no Google Analytics, no Mixpanel, no Sentry.
        </p>

        <h2 className="caps small-label pt-4">Your data, on your terms</h2>
        <p>
          From the About page you can:
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>Download your full data as JSON.</li>
          <li>Import a previous export onto another device.</li>
          <li>Clear your saved journal (notes, tags, photos, voice notes).</li>
          <li>Erase your blueprint and start over.</li>
          <li><span className="text-ink">Delete all your data</span> &mdash; a single button that removes the blueprint, every saved entry, every photo and voice note, every preference flag, and unregisters notifications.</li>
        </ul>
        <p>
          Uninstalling the iOS app also deletes everything that lives on
          your device.
        </p>

        <h2 className="caps small-label pt-4">Children</h2>
        <p>
          Liraydhas is not directed to children under 13 and we do not
          knowingly collect data from them.
        </p>

        <h2 className="caps small-label pt-4">Contact</h2>
        <p>
          Questions or a bug to report: visit the{' '}
          <Link href="/support" className="text-accent underline">
            Support page
          </Link>{' '}
          inside the app. There&rsquo;s a pre-filled email link there.
        </p>

        <p className="text-ink-faint pt-6">Last updated: 2026-06-10.</p>
      </section>

      <div className="pt-8">
        <Link href="/about" className="caps small-label text-accent">
          &larr; back
        </Link>
      </div>
    </main>
  );
}
