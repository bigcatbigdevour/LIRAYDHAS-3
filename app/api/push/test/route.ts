import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { handlePreflight, withCors } from '@/lib/cors';
import { listSubs, toWebPush, removeSub } from '@/lib/pushStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

/**
 * Test-send endpoint. Fires a single push to every stored subscription
 * with the body provided (or a default). Used by the "send test
 * notification" button on /about so the user can confirm their setup
 * actually wakes up their phone.
 *
 * Requires VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT in env.
 * VAPID_SUBJECT must be a mailto: URL or https: URL identifying the
 * sender (e.g. "mailto:you@example.com").
 */
export async function POST(req: Request) {
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subject) {
    return withCors(
      NextResponse.json({ error: 'VAPID not configured' }, { status: 501 }),
      req,
    );
  }
  webpush.setVapidDetails(subject, pub, priv);

  let body: { title?: string; body?: string; url?: string };
  try {
    body = (await req.json().catch(() => ({}))) as {
      title?: string; body?: string; url?: string;
    };
  } catch {
    body = {};
  }
  const payload = JSON.stringify({
    title: body.title || 'Liraydhas',
    body: body.body || "your reading is ready.",
    url: body.url || '/today',
  });

  const subs = listSubs();
  if (subs.length === 0) {
    return withCors(NextResponse.json({ sent: 0, message: 'no subscribers' }), req);
  }

  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(toWebPush(s), payload);
        sent++;
      } catch (e: unknown) {
        failed++;
        // 404 / 410 → subscription is dead, drop it.
        if (
          e instanceof Error &&
          /statusCode.{0,5}(404|410)/.test(e.message)
        ) {
          removeSub(s.endpoint);
        } else {
          console.error('[push test] send failed:', e);
        }
      }
    }),
  );
  return withCors(NextResponse.json({ sent, failed }), req);
}
