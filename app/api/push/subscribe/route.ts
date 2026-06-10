import { NextResponse } from 'next/server';
import { handlePreflight, withCors } from '@/lib/cors';
import { addSub, removeSub, DEFAULT_PREFS, type SubscriptionPrefs } from '@/lib/pushStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

interface SubscribeBody {
  /** "apns" for native iOS, otherwise treated as web push. */
  kind?: 'apns' | 'web';
  /** Web push endpoint URL. */
  endpoint?: string;
  /** Web push VAPID keys. */
  keys?: { p256dh?: string; auth?: string };
  /** APNs device token (hex). */
  token?: string;
  prefs?: Partial<SubscriptionPrefs>;
}

function normalizePrefs(p: Partial<SubscriptionPrefs> | undefined): SubscriptionPrefs {
  const merged = { ...DEFAULT_PREFS, ...(p ?? {}) };
  // Clamp hour 0..23 and tzOffset -720..840 (-12h to +14h covers all
  // real timezones including Kiritimati at +14).
  merged.hourLocal = Math.max(0, Math.min(23, Math.floor(merged.hourLocal)));
  merged.tzOffsetMin = Math.max(-720, Math.min(840, Math.floor(merged.tzOffsetMin)));
  merged.types = {
    daily: !!merged.types?.daily,
    anniversary: !!merged.types?.anniversary,
    weekly: !!merged.types?.weekly,
  };
  return merged;
}

/**
 * POST: register the user's PushSubscription with the server.
 * DELETE: forget a subscription by endpoint.
 *
 * Both routes accept the same body shape (PushSubscription JSON) for
 * convenience. The server-side store is currently in-memory only; see
 * lib/pushStore.ts for the swap-this-for-real-DB notes.
 */
export async function POST(req: Request) {
  let body: SubscribeBody;
  try {
    body = (await req.json()) as SubscribeBody;
  } catch {
    return withCors(NextResponse.json({ error: 'invalid json' }, { status: 400 }), req);
  }
  if (body.kind === 'apns') {
    // Native iOS subscription via Capacitor. APNs tokens are hex strings.
    if (typeof body.token !== 'string' || !/^[0-9a-fA-F]+$/.test(body.token)) {
      return withCors(
        NextResponse.json({ error: 'missing or invalid APNs token' }, { status: 400 }),
        req,
      );
    }
    await addSub({
      kind: 'apns',
      token: body.token.toLowerCase(),
      createdAt: Date.now(),
      prefs: normalizePrefs(body.prefs),
    });
    return withCors(NextResponse.json({ ok: true }), req);
  }

  // Web push.
  if (
    !body.endpoint ||
    !body.keys ||
    typeof body.keys.p256dh !== 'string' ||
    typeof body.keys.auth !== 'string'
  ) {
    return withCors(
      NextResponse.json({ error: 'missing endpoint / keys' }, { status: 400 }),
      req,
    );
  }
  await addSub({
    kind: 'web',
    endpoint: body.endpoint,
    keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
    createdAt: Date.now(),
    prefs: normalizePrefs(body.prefs),
  });
  return withCors(NextResponse.json({ ok: true }), req);
}

export async function DELETE(req: Request) {
  let body: SubscribeBody;
  try {
    body = (await req.json()) as SubscribeBody;
  } catch {
    return withCors(NextResponse.json({ error: 'invalid json' }, { status: 400 }), req);
  }
  const key = body.kind === 'apns' ? body.token : body.endpoint;
  if (!key) {
    return withCors(NextResponse.json({ error: 'missing endpoint / token' }, { status: 400 }), req);
  }
  await removeSub(body.kind === 'apns' ? key.toLowerCase() : key);
  return withCors(NextResponse.json({ ok: true }), req);
}
