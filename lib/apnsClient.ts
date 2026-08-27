/**
 * APNs (Apple Push Notification service) sender — App Store push.
 *
 * Uses apns2 with token-based authentication. Required env vars:
 *
 *   APNS_KEY_ID       — the 10-char Key ID from Apple Developer.
 *   APNS_TEAM_ID      — your 10-char Team ID.
 *   APNS_BUNDLE_ID    — the iOS bundle id (e.g. com.liraydhas.app).
 *   APNS_KEY_P8       — the .p8 file contents, ONE LINE, with literal
 *                       `\n` for newlines. (Easier in env vars than a
 *                       real multi-line value.)
 *   APNS_ENVIRONMENT  — "production" (App Store builds) or "development"
 *                       (Xcode debug builds). Default: production.
 *
 * Apple Developer one-time setup:
 *   1. Apple Developer → Certificates, Identifiers & Profiles → Keys.
 *   2. Create a new Key, enable APNs, download the .p8 (only once!).
 *   3. Note the Key ID printed beside the key, and your Team ID at the
 *      top-right of the Apple Developer site.
 *   4. Your Xcode project → Signing & Capabilities → "Push Notifications"
 *      capability.
 */

import { ApnsClient, Notification } from 'apns2';

let cached: ApnsClient | null = null;

export function getApnsClient(): ApnsClient | null {
  if (cached) return cached;
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const p8 = process.env.APNS_KEY_P8;
  if (!keyId || !teamId || !p8) return null;
  const env = (process.env.APNS_ENVIRONMENT || 'production').toLowerCase();
  cached = new ApnsClient({
    team: teamId,
    keyId,
    signingKey: p8.replace(/\\n/g, '\n'),
    defaultTopic: process.env.APNS_BUNDLE_ID || 'com.liraydhas.app',
    requestTimeout: 10_000,
    host: env === 'development' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com',
  });
  return cached;
}

export interface SendApnsArgs {
  token: string;
  title: string;
  body: string;
  /** Where the notification should deep-link inside the app. */
  url?: string;
}

/**
 * Send a single APNs push. Returns the apns2 response or throws on
 * non-recoverable errors. Caller is responsible for catching and
 * pruning dead tokens.
 */
export async function sendApns(args: SendApnsArgs): Promise<void> {
  const client = getApnsClient();
  if (!client) {
    throw new Error('APNs not configured');
  }
  const note = new Notification(args.token, {
    alert: { title: args.title, body: args.body },
    sound: 'default',
    data: { url: args.url || '/today' },
  });
  await client.send(note);
}
