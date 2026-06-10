import { NextResponse } from 'next/server';
import { handlePreflight, withCors } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

/**
 * Returns the VAPID public key so the client can include it in its
 * pushManager.subscribe() call. The corresponding private key never
 * leaves the server.
 *
 * Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your environment.
 * Generate a pair with:
 *   npx web-push generate-vapid-keys --json
 */
export async function GET(req: Request) {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return withCors(
      NextResponse.json({ error: 'VAPID not configured' }, { status: 501 }),
      req,
    );
  }
  return withCors(NextResponse.json({ key }), req);
}
