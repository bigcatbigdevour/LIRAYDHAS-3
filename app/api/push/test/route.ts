import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { handlePreflight, withCors } from '@/lib/cors';
import { listSubs, toWebPush, removeSub } from '@/lib/pushStore';
import { sendApns, getApnsClient } from '@/lib/apnsClient';

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
  const hasWeb = !!(pub && priv && subject);
  const hasApns = !!getApnsClient();
  if (!hasWeb && !hasApns) {
    return withCors(
      NextResponse.json({ error: 'no push provider configured' }, { status: 501 }),
      req,
    );
  }
  if (hasWeb) webpush.setVapidDetails(subject as string, pub as string, priv as string);

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

  const subs = await listSubs();
  if (subs.length === 0) {
    return withCors(NextResponse.json({ sent: 0, message: 'no subscribers' }), req);
  }

  let sent = 0;
  let failed = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        if (s.kind === 'apns') {
          if (!hasApns) return;
          await sendApns({
            token: s.token,
            title: body.title || 'Liraydhas',
            body: body.body || 'a test reminder',
            url: body.url || '/today',
          });
          sent++;
        } else {
          if (!hasWeb) return;
          await webpush.sendNotification(toWebPush(s), payload);
          sent++;
        }
      } catch (e: unknown) {
        failed++;
        const msg = e instanceof Error ? e.message : String(e);
        const isWebDead = /statusCode.{0,5}(404|410)/.test(msg);
        const isApnsDead = /BadDeviceToken|Unregistered|410|invalid token/i.test(msg);
        if (isWebDead || isApnsDead) {
          await removeSub(s.kind === 'apns' ? s.token : s.endpoint);
        } else {
          console.error('[push test] send failed:', e);
        }
      }
    }),
  );
  return withCors(NextResponse.json({ sent, failed }), req);
}
