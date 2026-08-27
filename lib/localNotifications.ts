/**
 * Capacitor local notifications — anniversary pings for saved journal
 * entries.
 *
 * Why local and not server: anniversary detection needs the user's
 * saved-day list, which lives on the device. Uploading it to the
 * server would break the privacy story. Local notifications are
 * scheduled by the OS itself; the app doesn't need to be running for
 * them to fire.
 *
 * Schedule policy: for each saved entry, schedule a "this day a year
 * ago" ping for the same calendar date next year at the user's
 * preferred hour. iOS caps pending local notifications at 64 per app,
 * so we cap our scheduled set at 60 (4 reserved for future use) and
 * prefer the most-recently-saved entries when over the cap.
 *
 * Reschedule whenever:
 *   · a new entry is saved
 *   · the user changes their preferred hour
 *   · the user changes the anniversary toggle
 *
 * No-op outside the Capacitor runtime.
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { listSavedDays } from './savedDays';
import { readClientPrefs } from './push';

/** iOS hard limit on pending local notifications per app. */
const PENDING_CAP = 60;

/** Notification ID prefix range — keep these stable so reschedule
 *  doesn't accidentally collide with future plugin notification IDs. */
const ID_RANGE_START = 100_000;

function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Permission gate. Returns true if the OS will let us schedule.
 * Requests permission if not yet granted.
 */
async function ensurePermission(): Promise<boolean> {
  if (!isNative()) return false;
  let perm = await LocalNotifications.checkPermissions();
  if (perm.display !== 'granted') {
    perm = await LocalNotifications.requestPermissions();
  }
  return perm.display === 'granted';
}

/**
 * Generate a stable numeric ID from a dateIso. iOS local-notification
 * IDs are 32-bit ints; we hash with FNV-1a 32 then OR with the range
 * start so they don't collide with other notification systems.
 */
function idForDate(dateIso: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < dateIso.length; i++) {
    h ^= dateIso.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // Mask to keep within positive int range, OR the prefix.
  return ((h & 0x7fffff) | ID_RANGE_START) >>> 0;
}

/**
 * Compute "next anniversary trigger" for a saved entry. If the
 * anniversary has already passed this year, schedule it for the
 * following year.
 */
function nextAnniversaryAt(dateIso: string, hourLocal: number, now = new Date()): Date | null {
  // The dateIso is the calendar day the entry was saved. We want the
  // SAME calendar day (month+day) next time it rolls around.
  const [y, m, d] = dateIso.split('-').map(Number);
  if (!y || !m || !d) return null;
  // Start with this year's recurrence of that day.
  let target = new Date(now.getFullYear(), m - 1, d, hourLocal, 0, 0, 0);
  // If it's already passed (today's date + hour beyond), jump a year.
  if (target.getTime() <= now.getTime()) {
    target = new Date(now.getFullYear() + 1, m - 1, d, hourLocal, 0, 0, 0);
  }
  // Don't schedule anniversaries for entries dated in the future
  // (shouldn't happen, but defensive).
  return target;
}

/**
 * Re-schedule the user's anniversary pings from the current saved-day
 * list and prefs. Idempotent — cancels existing anniversary
 * notifications first, then schedules a fresh set.
 */
export async function rescheduleAnniversaries(): Promise<{ scheduled: number } | { skipped: string }> {
  if (!isNative()) return { skipped: 'not native' };

  const prefs = readClientPrefs();
  if (!prefs.types.anniversary) {
    // Toggle off — cancel any existing anniversary pings and stop.
    try {
      const pending = await LocalNotifications.getPending();
      const ours = pending.notifications
        .map((n) => n.id)
        .filter((id) => id >= ID_RANGE_START && id < ID_RANGE_START + 0x7fffff);
      if (ours.length > 0) {
        await LocalNotifications.cancel({ notifications: ours.map((id) => ({ id })) });
      }
    } catch (e) {
      console.warn('[localNotifications] cancel failed', e);
    }
    return { skipped: 'anniversary toggle off' };
  }

  const ok = await ensurePermission();
  if (!ok) return { skipped: 'permission denied' };

  const days = listSavedDays();
  if (days.length === 0) return { scheduled: 0 };

  // Cap to 60 most recently saved entries to stay under iOS's 64 limit.
  const toSchedule = days
    .slice()
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, PENDING_CAP);

  // Cancel previous run's anniversary pings before re-scheduling so we
  // don't accumulate stale entries (e.g. for days the user has since
  // unsaved).
  try {
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications
      .map((n) => n.id)
      .filter((id) => id >= ID_RANGE_START && id < ID_RANGE_START + 0x7fffff);
    if (ours.length > 0) {
      await LocalNotifications.cancel({ notifications: ours.map((id) => ({ id })) });
    }
  } catch (e) {
    console.warn('[localNotifications] cancel failed', e);
  }

  const now = new Date();
  const notifs = toSchedule
    .map((d) => {
      const at = nextAnniversaryAt(d.dateIso, prefs.hourLocal, now);
      if (!at) return null;
      return {
        id: idForDate(d.dateIso),
        title: 'Liraydhas',
        body: 'a year ago today — open your journal.',
        schedule: { at, allowWhileIdle: true },
        extra: { url: '/saved', dateIso: d.dateIso },
      };
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);

  if (notifs.length === 0) return { scheduled: 0 };

  try {
    await LocalNotifications.schedule({ notifications: notifs });
    return { scheduled: notifs.length };
  } catch (e) {
    console.error('[localNotifications] schedule failed', e);
    return { skipped: e instanceof Error ? e.message : 'schedule failed' };
  }
}
