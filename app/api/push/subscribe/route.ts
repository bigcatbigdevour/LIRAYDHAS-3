import { NextResponse } from 'next/server';
import { handlePreflight, withCors } from '@/lib/cors';
import { addSub, removeSub, DEFAULT_PREFS, type SubscriptionPrefs } from '@/lib/pushStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

interface SubscribeBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
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
  if (!body.endpoint) {
    return withCors(NextResponse.json({ error: 'missing endpoint' }, { status: 400 }), req);
  }
  await removeSub(body.endpoint);
  return withCors(NextResponse.json({ ok: true }), req);
}
