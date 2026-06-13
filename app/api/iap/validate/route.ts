import { NextResponse } from 'next/server';
import { handlePreflight, withCors } from '@/lib/cors';
import { signAppleJWT, decodeJWSPayload } from '@/lib/iap/appleJwt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

/**
 * App Store receipt validation.
 *
 * Flow:
 *   1. The iOS client buys a Pro subscription via StoreKit.
 *   2. StoreKit hands the client a transactionId.
 *   3. The client POSTs { transactionId, environment } here.
 *   4. We sign a JWT to authenticate to Apple's App Store Server API,
 *      fetch the signedTransactionInfo for that transactionId, decode
 *      the JWS payload, and return the resolved entitlement so the
 *      client can flip its local Pro flag.
 *
 * Required env vars in production:
 *   - APP_STORE_KEY_ID        (10-char ID from App Store Connect)
 *   - APP_STORE_ISSUER_ID     (UUID from App Store Connect)
 *   - APP_STORE_PRIVATE_KEY   (full .p8 PEM contents, newlines preserved)
 *   - APP_STORE_BUNDLE_ID     (e.g. app.liraydhas)
 *
 * When those env vars aren't all present we fall back to a dev stub so
 * the UI can be exercised end-to-end without an Apple account; the
 * stub is locked out in production via NODE_ENV.
 *
 * Body:
 *   {
 *     transactionId: string,
 *     environment?: 'sandbox' | 'production'  (defaults to 'production')
 *   }
 *
 * Response:
 *   { ok: true, entitlement: 'pro' | 'free', expiresAt?: number, productId?: string }
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

  const keyId = process.env.APP_STORE_KEY_ID;
  const issuerId = process.env.APP_STORE_ISSUER_ID;
  const privateKey = process.env.APP_STORE_PRIVATE_KEY;
  const bundleId = process.env.APP_STORE_BUNDLE_ID;
  const hasAppStoreServer = !!(keyId && issuerId && privateKey && bundleId);

  if (!hasAppStoreServer) {
    // Stub response — only safe in dev. In production you MUST configure
    // the env vars before shipping.
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

  if (!body.transactionId) {
    return withCors(
      NextResponse.json({ ok: false, reason: 'missing transactionId' }, { status: 400 }),
      req,
    );
  }

  const env = body.environment ?? 'production';
  const host = env === 'sandbox'
    ? 'https://api.storekit-sandbox.itunes.apple.com'
    : 'https://api.storekit.itunes.apple.com';

  let token: string;
  try {
    token = signAppleJWT({ keyId: keyId!, issuerId: issuerId!, privateKey: privateKey!, bundleId: bundleId! });
  } catch (e) {
    console.error('[api/iap/validate] JWT signing failed:', e);
    return withCors(
      NextResponse.json({ ok: false, reason: 'auth signing failed' }, { status: 500 }),
      req,
    );
  }

  let appleRes: Response;
  try {
    appleRes = await fetch(
      `${host}/inApps/v1/transactions/${encodeURIComponent(body.transactionId)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        // Don't hang for minutes if Apple is slow — keep the user-facing
        // validate round-trip bounded.
        signal: AbortSignal.timeout(8000),
      },
    );
  } catch (e) {
    console.error('[api/iap/validate] Apple API fetch failed:', e);
    return withCors(
      NextResponse.json({ ok: false, reason: 'could not reach Apple' }, { status: 502 }),
      req,
    );
  }

  if (appleRes.status === 404) {
    // The transactionId doesn't exist in Apple's records — either a
    // forged client request, or a sandbox transaction sent against
    // production (or vice-versa).
    return withCors(
      NextResponse.json({ ok: false, reason: 'transaction not found' }, { status: 404 }),
      req,
    );
  }
  if (!appleRes.ok) {
    const txt = await appleRes.text().catch(() => '');
    console.error('[api/iap/validate] Apple API error', appleRes.status, txt);
    return withCors(
      NextResponse.json({ ok: false, reason: `Apple returned ${appleRes.status}` }, { status: 502 }),
      req,
    );
  }

  let payload: { signedTransactionInfo?: string };
  try {
    payload = (await appleRes.json()) as typeof payload;
  } catch {
    return withCors(
      NextResponse.json({ ok: false, reason: 'malformed Apple response' }, { status: 502 }),
      req,
    );
  }
  if (!payload.signedTransactionInfo) {
    return withCors(
      NextResponse.json({ ok: false, reason: 'Apple response missing signedTransactionInfo' }, { status: 502 }),
      req,
    );
  }

  let info: AppleTransactionPayload;
  try {
    info = decodeJWSPayload<AppleTransactionPayload>(payload.signedTransactionInfo);
  } catch (e) {
    console.error('[api/iap/validate] could not decode JWS:', e);
    return withCors(
      NextResponse.json({ ok: false, reason: 'malformed signed transaction' }, { status: 502 }),
      req,
    );
  }

  // Bundle ID match — guards against another app's transactionId being
  // submitted (which Apple would happily return data for, but isn't ours).
  if (info.bundleId && info.bundleId !== bundleId) {
    return withCors(
      NextResponse.json({ ok: false, reason: 'transaction is for a different app' }, { status: 403 }),
      req,
    );
  }

  const now = Date.now();
  const revoked = typeof info.revocationDate === 'number' && info.revocationDate <= now;
  const expired = typeof info.expiresDate === 'number' && info.expiresDate <= now;
  const entitled = !revoked && !expired;

  return withCors(
    NextResponse.json({
      ok: true,
      entitlement: entitled ? 'pro' : 'free',
      expiresAt: info.expiresDate ?? null,
      productId: info.productId ?? null,
      revoked,
    }),
    req,
  );
}

/**
 * Shape of the JSON payload Apple wraps inside signedTransactionInfo.
 * See https://developer.apple.com/documentation/appstoreserverapi/jwstransactiondecodedpayload
 * for the full schema. We only consume the fields we need.
 */
interface AppleTransactionPayload {
  bundleId?: string;
  productId?: string;
  /** Milliseconds since epoch. */
  expiresDate?: number;
  /** Milliseconds since epoch; set only if Apple revoked the entitlement. */
  revocationDate?: number;
  transactionId?: string;
  originalTransactionId?: string;
  type?: string;
}
