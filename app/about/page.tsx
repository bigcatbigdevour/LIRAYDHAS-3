'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';
import { fullOverviewText } from '@/lib/fullOverview';
import { buildFullExport, exportFilename } from '@/lib/fullExport';
import { importFromFile } from '@/lib/fullImport';
import { clearAllAttachments } from '@/lib/attachments';
import { buildLabel } from '@/lib/buildInfo';
import PushNotificationsSection from '@/components/PushNotificationsSection';
import { useRef, useState } from 'react';

export default function AboutPage() {
  const router = useRouter();
  const blueprint = useStore((s) => s.blueprint);
  const reset = useStore((s) => s.reset);
  // Import flow state — file picker ref + last-result message.
  const importFile = useRef<HTMLInputElement | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  return (
    <main className="page max-w-md mx-auto fade-in">
      <header className="pb-6">
        <p className="small-label caps">about</p>
        <h1 className="h-display serif mt-3">What this is.</h1>
      </header>

      <section className="space-y-4 body-prose serif text-ink-dim">
        <p>
          Liraydhas is a daily reading of two systems at once: tropical
          astrology and the body chart that comes out of your birth
          moment. Both are computed from your exact birth time and your
          exact birth location.
        </p>
        <p>
          The math runs on your phone. The daily paragraph is written by
          a language model fed only your tightest current transits and
          the outline of your chart — sent over once per day. Your
          blueprint itself lives only in this browser. Erase the app and
          it's gone.
        </p>
      </section>

      <h2 className="h-display serif mt-12 mb-3" style={{ fontSize: '1.5rem' }}>The five tabs.</h2>
      <dl className="space-y-3 text-[14px]">
        <Item k="Today" v="One short paragraph from the live transits, your current sky, and a recap of the past week." />
        <Item k="Arcs"  v="Every cycle that returns over a human lifespan, drawn end to end. Solar, Mars, Jupiter, Saturn, Nodal, Chiron, Progressed Moon." />
        <Item k="Polarity" v="Whether each of those cycles is currently rising or descending. The stack reads as one weather." />
        <Item k="Chart" v="Your body chart, the 26 activations that produced it, and your natal astrology wheel." />
        <Item k="Saved" v="Days you marked, with optional notes. A private journal that lives on your phone. Anniversaries appear on Today." />
      </dl>

      <h2 className="h-display serif mt-12 mb-3" style={{ fontSize: '1.5rem' }}>Aspects, briefly.</h2>
      <dl className="space-y-2 text-[13px]">
        <Item k="conjunction" v="Same place. Two planets fused — their themes merge." />
        <Item k="sextile" v="60° apart. A small flow, an open door." />
        <Item k="square" v="90° apart. Tension. The kind of friction that produces growth." />
        <Item k="trine" v="120° apart. Easy. Maybe too easy." />
        <Item k="opposition" v="180° apart. A see-saw. Two themes pulling against each other across your chart." />
      </dl>

      <h2 className="h-display serif mt-12 mb-3" style={{ fontSize: '1.5rem' }}>The body chart, briefly.</h2>
      <p className="text-[14px] text-ink-dim serif leading-relaxed">
        Two charts are computed and overlaid: one at the moment of birth
        (the conscious side, right column, cream), one at the moment when
        the Sun was exactly 88° of ecliptic longitude earlier (the
        unconscious side, left column, wine). Each chart contributes 13
        activations — Sun, Earth, Moon, North &amp; South Nodes, and the
        seven planets — totalling 26. Each activation maps to one of 64
        gates. A center is defined when both gates of a channel
        terminating in it are activated. Type, authority, and profile
        fall out of which centers and lines are lit.
      </p>

      <h2 className="h-display serif mt-12 mb-3" style={{ fontSize: '1.5rem' }}>Polarity, briefly.</h2>
      <p className="text-[14px] text-ink-dim serif leading-relaxed">
        Every cycle has two halves. The first half is <em>rising</em> —
        building, accumulating, opening. The second half is{' '}
        <em>descending</em> — completing, releasing, integrating. Most
        people live their whole lives inside these tides without noticing
        when they flip. The Polarity tab shows the flip dates for every
        cycle and tells you, right now, how many are rising vs descending.
      </p>
      <p className="text-[14px] text-ink-dim serif leading-relaxed mt-3">
        A "stack" of mostly rising cycles tends to feel like an opening
        season of life; mostly descending feels like a releasing one.
        Recent flips in the slower cycles — Saturn, Chiron, Nodal — are
        rarely subtle. Watch those.
      </p>

      <h2 className="h-display serif mt-12 mb-3" style={{ fontSize: '1.5rem' }}>Stations, briefly.</h2>
      <p className="text-[14px] text-ink-dim serif leading-relaxed">
        Some ages feel universal — adolescence at twelve, the Saturn return
        at twenty-nine, midlife around forty-five, the Chiron return at
        fifty. These are points where multiple cycles cross at the same
        place on the timeline. "Everyone goes through this at X" is the
        math literally stacking. The Arcs tab marks fourteen of these
        stations with diamonds on the chart and explains each one.
      </p>

      <h2 className="h-display serif mt-12 mb-3" style={{ fontSize: '1.5rem' }}>The seven cycles.</h2>
      <dl className="space-y-2 text-[13px]">
        <Item k="Solar return" v="Every year. The annual reset, birthday to birthday." />
        <Item k="Mars synodic" v="Every 2.135 years. Action and friction. What you are fighting for." />
        <Item k="Jupiter return" v="Every 11.86 years. Expansion. What you trust the world to give." />
        <Item k="Nodal return" v="Every 18.6 years. Direction. The pull of fate." />
        <Item k="Progressed lunar" v="Every 27.3 years (in 12 phases). Inner emotional weather slowed down." />
        <Item k="Saturn return" v="Every 29.5 years. Structure and consequence. Reckonings at ~29 and ~59." />
        <Item k="Chiron return" v="Every 50.4 years. The original wound and the original teacher. Once a lifetime." />
      </dl>

      <h2 className="h-display serif mt-12 mb-3" style={{ fontSize: '1.5rem' }}>Settings.</h2>
      <PushNotificationsSection />
      <div className="space-y-3 mt-4">
        <Link href="/chart" className="btn-ghost block">go to your chart →</Link>
        <Link href="/year" className="btn-ghost block">your year ahead →</Link>
        <Link href="/saved" className="btn-ghost block">saved readings →</Link>
        <Link href="/compat" className="btn-ghost block">compatibility →</Link>
        <Link href="/pro" className="btn-ghost block">subscription →</Link>
        <Link href="/support" className="btn-ghost block">get in touch →</Link>
        <Link href="/learn" className="btn-ghost block">learn the system →</Link>
        <Link href="/onboarding?edit=1" className="btn-ghost block">edit my birth data →</Link>
        <Link href="/privacy" className="btn-ghost block">privacy →</Link>
        {blueprint && (
          <button
            className="btn-ghost text-left"
            onClick={async () => {
              const txt = fullOverviewText(blueprint);
              try {
                if (navigator.share) await navigator.share({ title: 'My blueprint', text: txt });
                else {
                  await navigator.clipboard.writeText(txt);
                  const el = document.getElementById('overview-toast');
                  if (el) { el.style.opacity = '1'; window.setTimeout(() => { el.style.opacity = '0'; }, 1500); }
                }
              } catch {/* cancelled */}
            }}
          >
            export full overview (text)
          </button>
        )}
        <div id="overview-toast" className="small-label caps text-accent text-right" style={{ opacity: 0, transition: 'opacity 300ms ease', height: '1em' }}>copied</div>
        <button
          className="btn-ghost text-left"
          onClick={() => {
            // Full snapshot of everything the app stores about the user
            // on this device: blueprint, every saved journal entry, and
            // intro/welcome UI flags. JSON for portability + future
            // re-import.
            const data = buildFullExport(blueprint ?? null);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = exportFilename();
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
        >
          download all my data (json)
        </button>
        <label className="btn-ghost text-left cursor-pointer block">
          import journal from a json file
          <input
            ref={importFile}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = '';
              if (!file) return;
              setImportMsg('importing…');
              const r = await importFromFile(file);
              if (!r.ok) {
                setImportMsg(r.reason);
                return;
              }
              // The blueprint write went through localStorage directly,
              // so refresh to pull it into the Zustand store too.
              const parts: string[] = [];
              if (r.blueprintReplaced) parts.push('blueprint updated');
              if (r.addedDays > 0) parts.push(`${r.addedDays} new entries`);
              if (r.updatedDays > 0) parts.push(`${r.updatedDays} updated`);
              if (r.skippedDays > 0) parts.push(`${r.skippedDays} skipped (older)`);
              if (r.addedPartners > 0) parts.push(`${r.addedPartners} partners added`);
              if (r.skippedPartners > 0) parts.push(`${r.skippedPartners} partners already here`);
              setImportMsg(parts.join(' · ') || 'nothing new to import.');
              // A soft reload picks up the new persist state + saved days.
              setTimeout(() => window.location.reload(), 1200);
            }}
          />
        </label>
        {importMsg && (
          <p
            className="small-label caps text-ink-faint text-[10px] -mt-1"
            style={{ letterSpacing: '0.16em' }}
          >
            {importMsg}
          </p>
        )}
        <p
          className="small-label caps text-ink-faint text-[10px] -mt-1"
          style={{ letterSpacing: '0.14em' }}
        >
          export + import = manual cross-device sync · photos &amp; voice notes stay on the device they were captured on
        </p>
        <button
          className="btn-ghost text-left"
          onClick={() => {
            // Clear every dismissed-intro flag so the first-time
            // explainer panels reappear on each tab. Useful if you
            // want to re-show the explainers to someone, or for testing.
            try {
              const keys: string[] = [];
              for (let i = 0; i < window.localStorage.length; i++) {
                const k = window.localStorage.key(i);
                if (k && k.startsWith('liraydhas.') && k.includes('.intro.dismissed')) {
                  keys.push(k);
                }
              }
              keys.forEach((k) => window.localStorage.removeItem(k));
              window.localStorage.removeItem('liraydhas.welcome.v1');
              const el = document.getElementById('tutorials-toast');
              if (el) { el.style.opacity = '1'; window.setTimeout(() => { el.style.opacity = '0'; }, 1500); }
            } catch { /* ignore */ }
          }}
        >
          show all tutorials again
        </button>
        <div id="tutorials-toast" className="small-label caps text-accent text-right" style={{ opacity: 0, transition: 'opacity 300ms ease', height: '1em' }}>reset</div>
        <button
          className="btn-ghost text-left"
          onClick={() => {
            if (confirm('Erase every saved reading, journal note, and attached photo? This cannot be undone.')) {
              try {
                window.localStorage.removeItem('liraydhas.savedDays.v1');
                // Also wipe attached photos / audio from IndexedDB so a
                // "clear" really is total — orphaned blobs would otherwise
                // linger consuming storage with no UI to surface them.
                void clearAllAttachments();
                const el = document.getElementById('journal-toast');
                if (el) { el.style.opacity = '1'; window.setTimeout(() => { el.style.opacity = '0'; }, 1500); }
              } catch { /* ignore */ }
            }
          }}
        >
          clear saved journal
        </button>
        <div id="journal-toast" className="small-label caps text-accent text-right" style={{ opacity: 0, transition: 'opacity 300ms ease', height: '1em' }}>cleared</div>
        {blueprint && (
          <button
            className="btn-ghost"
            onClick={() => {
              if (confirm('Erase your blueprint and start over? Your saved journal will be kept — clear it separately if you want it gone too.')) {
                reset();
                router.replace('/onboarding');
              }
            }}
          >
            erase blueprint (keeps journal)
          </button>
        )}
        <button
          className="btn-ghost text-left text-accent border border-accent/30"
          onClick={async () => {
            // App Store requirement: a single explicit "delete everything"
            // action. Wipes blueprint, every saved-day entry, all IDB
            // attachments (photos + voice notes), every UI flag, and
            // unregisters push notifications so we stop sending to a
            // device whose owner just said "remove me."
            if (!confirm(
              'Delete everything? This removes your blueprint, every saved reading, every note, every photo, every voice note, and unregisters notifications. It cannot be undone.',
            )) return;
            if (!confirm('Are you sure? This is final.')) return;
            try {
              // 1. Unregister any active push subscriptions before wiping
              //    local state — otherwise we'd lose the endpoint.
              try {
                const { unsubscribePush } = await import('@/lib/push');
                await unsubscribePush();
              } catch {/* ignore */}
              try {
                const { unregisterNativePush, isNativeRuntime } = await import('@/lib/nativePush');
                if (isNativeRuntime()) await unregisterNativePush();
              } catch {/* ignore */}
              // 2. Wipe IDB attachments.
              await clearAllAttachments();
              // 3. Wipe every liraydhas-namespaced localStorage key.
              const toRemove: string[] = [];
              for (let i = 0; i < window.localStorage.length; i++) {
                const k = window.localStorage.key(i);
                if (k && (k.startsWith('liraydhas') || k.startsWith('liraydhas-store'))) {
                  toRemove.push(k);
                }
              }
              toRemove.forEach((k) => window.localStorage.removeItem(k));
              // 4. Reset Zustand state.
              reset();
              router.replace('/onboarding');
            } catch (e) {
              console.error('full wipe failed', e);
              alert("Couldn't fully delete everything — try again.");
            }
          }}
        >
          delete all my data
        </button>
      </div>

      <footer className="mt-16 pb-2 border-t border-hairline pt-6 space-y-2">
        <p
          className="small-label caps text-ink-faint text-[10px]"
          style={{ letterSpacing: '0.18em' }}
        >
          build · {buildLabel()}
        </p>
        <p
          className="small-label caps text-ink-faint text-[10px]"
          style={{ letterSpacing: '0.18em' }}
        >
          © {new Date().getFullYear()} liraydhas · all rights reserved
        </p>
        <p className="text-[12px] text-ink-faint serif italic">
          Liraydhas is a personal-use observational tool. It is not a
          mental-health service, medical service, or substitute for one.
        </p>
      </footer>
    </main>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-b border-hairline pb-2">
      <dt className="small-label caps">{k}</dt>
      <dd className="text-ink-dim mt-0.5 serif">{v}</dd>
    </div>
  );
}
