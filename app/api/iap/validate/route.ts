import { NextResponse } from 'next/server';
import { handlePreflight, withCors } from '@/lib/cors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

/**
 * App Store receipt validation.
 *
 * Status: scaffold. Production sets up:
 *   1. App Store Server API (https://developer.apple.com/documentation/appstoreserverapi)
 *      with an APP_STORE_PRIVATE_KEY env var (a different .p8 from APNs).
 *   2. Pulls the signed transaction info for the given transactionId.
 *   3. Verifies the signature against Apple's public keys.
 *   4. Returns the entitlement state: pro / trial / free.
 *
 * For TestFlight builds the legacy verifyReceipt endpoint also works
 * (https://sandbox.itunes.apple.com/verifyReceipt) using the receipt
 * data the StoreKit plugin returns.
 *
 * In dev / web, this route trusts the client and returns "pro" so the
 * UI can be exercised end-to-end without an Apple account. Production
 * builds must NOT use this stub — wire the App Store Server API path
 * before going to TestFlight.
 *
 * Body:
 *   {
 *     transactionId?: string,   // App Store Server API path
 *     receiptData?: string,     // base64 receipt for legacy verifyReceipt
 *     environment?: 'sandbox' | 'production',
 *   }
 *
 * Response:
 *   { ok: true, entitlement: 'pro' | 'trial' | 'free', expiresAt?: number }
 *   { ok: false, reason: string }
 */
export async function POST(req: Request) {
  let body: {
    transactionId?: string;
    receiptData?: string;
    environment?: 'sandbox' | 'production';
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return withCors(NextResponse.json({ ok: false, reason: 'invalid json' }, { status: 400 }), req);
  }

  // Production gate: only run if real env vars are configured. Without
  // them we return a stub so the client UI works end-to-end during dev.
  const hasAppStoreServer = !!(
    process.env.APP_STORE_KEY_ID &&
    process.env.APP_STORE_ISSUER_ID &&
    process.env.APP_STORE_PRIVATE_KEY
  );

  if (!hasAppStoreServer) {
    // Stub response — only safe in dev. In production you MUST wire the
    // real App Store Server API path before shipping.
    if (process.env.NODE_ENV === 'production') {
      return withCors(
        NextResponse.json(
          { ok: false, reason: 'IAP not configured' },
          { status: 501 },
        ),
        req,
      );
    }
    if (body.transactionId || body.receiptData) {
      return withCors(NextResponse.json({
        ok: true,
        entitlement: 'pro',
        expiresAt: Date.now() + 30 * 86400_000,
        stub: true,
      }), req);
    }
    return withCors(NextResponse.json({
      ok: true,
      entitlement: 'free',
      stub: true,
    }), req);
  }

  // TODO real path. Pseudo-code below for the eventual implementation:
  //
  //   import jwt from 'jsonwebtoken';
  //
  //   const env = body.environment ?? 'production';
  //   const host = env === 'sandbox'
  //     ? 'https://api.storekit-sandbox.itunes.apple.com'
  //     : 'https://api.storekit.itunes.apple.com';
  //
  //   const token = jwt.sign({}, process.env.APP_STORE_PRIVATE_KEY!, {
  //     algorithm: 'ES256',
  //     keyid: process.env.APP_STORE_KEY_ID!,
  //     issuer: process.env.APP_STORE_ISSUER_ID!,
  //     audience: 'appstoreconnect-v1',
  //     expiresIn: '5m',
  //   });
  //
  //   const res = await fetch(
  //     `${host}/inApps/v1/transactions/${body.transactionId}`,
  //     { headers: { Authorization: `Bearer ${token}` } },
  //   );
  //   const { signedTransactionInfo } = await res.json();
  //   // Decode the JWS, verify against Apple's public keys, extract the
  //   // expiresDate, return the entitlement.

  return withCors(
    NextResponse.json(
      { ok: false, reason: 'real validation path not yet wired' },
      { status: 501 },
    ),
    req,
  );
}
