import { NextResponse } from 'next/server';
import { handlePreflight, withCors } from '@/lib/cors';
import { addSub, removeSub } from '@/lib/pushStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

interface SubscribeBody {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
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
