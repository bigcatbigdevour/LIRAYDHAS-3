import { NextResponse } from 'next/server';
import { handlePreflight, withCors } from '@/lib/cors';
import { rateLimit, readBoundedBody } from '@/lib/llm';
import { signAppleJWT, decodeJWSPayload } from '@/lib/iap/appleJwt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function OPTIONS(req: Request) {
  return handlePreflight(req);
}

/**
 * App Store subscription validation.
 *
 * Flow:
 *   1. The iOS client buys a Pro subscription via StoreKit
 *      (lib/iap/storekit.ts) and receives a transactionId.
 *   2. The client POSTs { transactionId } here.
 *   3. We authenticate to Apple's App Store Server API and ask for the
 *      subscription's CURRENT status, then return the resolved
 *      entitlement so the client can set its local Pro flag.
 *
 * Two correctness properties that earlier versions lacked:
 *
 *   RENEWALS — auto-renewable subscriptions mint a NEW transaction on
 *   every renewal; the original purchase's expiresDate goes stale after
 *   the first period. We therefore query the SUBSCRIPTION STATUSES
 *   endpoint (GET /inApps/v1/subscriptions/{transactionId}) which
 *   accepts any transaction belonging to the subscription and returns
 *   its live status + the latest signed transaction. The single-
 *   transaction endpoint remains only as a fallback for lookups the
 *   statuses endpoint rejects.
 *
 *   SANDBOX — App Review (and TestFlight) purchases are sandbox
 *   transactions. Production returns 404 for them. We automatically
 *   retry against the sandbox host on 404, per Apple's own guidance,
 *   so review-time purchases validate without any client-side
 *   environment guessing.
 *
 * Entitlement rule (fail-closed):
 *   status 1 (active) or 4 (billing grace period) → pro
 *   everything else (expired / retry / revoked / unreadable) → free
 *
 * Required env vars in production:
 *   - APP_STORE_KEY_ID        (10-char ID from App Store Connect)
 *   - APP_STORE_ISSUER_ID     (UUID from App Store Connect)
 *   - APP_STORE_PRIVATE_KEY   (full .p8 PEM contents, newlines preserved)
 *   - APP_STORE_BUNDLE_ID     (e.g. com.liraydhas.app)
 *
 * When those env vars aren't all present we fall back to a dev stub so
 * the UI can be exercised end-to-end without an Apple account; the
 * stub is locked out in production via NODE_ENV.
 *
 * Body:     { transactionId: string, environment?: 'sandbox' | 'production' }
 *           (environment is only a hint for which host to try FIRST)
 * Response: { ok: true, entitlement: 'pro' | 'free', expiresAt: number|null,
 *             productId: string|null, environment: string }
 *           { ok: false, reason: string }
 */

const HOSTS = {
  production: 'https://api.storekit.itunes.apple.com',
  sandbox: 'https://api.storekit-sandbox.itunes.apple.com',
} as const;
type AppleEnv = keyof typeof HOSTS;

/** Apple subscription status codes that count as entitled. */
const ENTITLED_STATUSES = new Set([1 /* active */, 4 /* grace period */]);

export async function POST(req: Request) {
  // Cheap per-IP throttle — each call fans out to Apple's API, so an
  // unauthenticated spammer could otherwise burn our serverless quota.
  const limited = rateLimit(req, 'iap');
  if (limited) return limited;

  const parsed = await readBoundedBody<{
    transactionId?: string;
    receiptData?: string;
    environment?: AppleEnv;
  }>(req, 4 * 1024);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

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
        NextResponse.json({ ok: false, reason: 'IAP not configured' }, { status: 501 }),
        req,
      );
    }
    if (body.transactionId || body.receiptData) {
      return withCors(NextResponse.json({
        ok: true,
        entitlement: 'pro',
        expiresAt: Date.now() + 30 * 86400_000,
        productId: null,
        environment: 'stub',
        stub: true,
      }), req);
    }
    return withCors(NextResponse.json({
      ok: true, entitlement: 'free', expiresAt: null, productId: null,
      environment: 'stub', stub: true,
    }), req);
  }

  const transactionId = body.transactionId;
  if (!transactionId || !/^[0-9A-Za-z._-]{1,64}$/.test(transactionId)) {
    return withCors(
      NextResponse.json({ ok: false, reason: 'missing or malformed transactionId' }, { status: 400 }),
      req,
    );
  }

  let token: string;
  try {
    token = signAppleJWT({ keyId, issuerId, privateKey, bundleId });
  } catch (e) {
    console.error('[api/iap/validate] JWT signing failed:', e);
    return withCors(
      NextResponse.json({ ok: false, reason: 'auth signing failed' }, { status: 500 }),
      req,
    );
  }

  // Try the client's hinted environment first, then the other one.
  const envOrder: AppleEnv[] =
    body.environment === 'sandbox' ? ['sandbox', 'production'] : ['production', 'sandbox'];

  async function appleGet(env: AppleEnv, path: string): Promise<Response | null> {
    try {
      return await fetch(`${HOSTS[env]}${path}`, {
        headers: { Authorization: `Bearer ${token}` },
        // Keep the user-facing round-trip bounded if Apple is slow.
        signal: AbortSignal.timeout(8000),
      });
    } catch (e) {
      console.error(`[api/iap/validate] Apple fetch failed (${env}):`, e);
      return null;
    }
  }

  // ---- Primary: subscription statuses (renewal-aware) ----
  let hadServerError = false;
  for (const env of envOrder) {
    const res = await appleGet(env, `/inApps/v1/subscriptions/${encodeURIComponent(transactionId)}`);
    if (!res) { hadServerError = true; continue; }
    if (res.status === 404) continue; // wrong env for this transaction — try the next
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error(`[api/iap/validate] statuses ${env} error`, res.status, txt);
      hadServerError = true;
      continue;
    }

    let statuses: {
      data?: { lastTransactions?: { status?: number; signedTransactionInfo?: string }[] }[];
    };
    try {
      statuses = (await res.json()) as typeof statuses;
    } catch {
      hadServerError = true;
      continue;
    }

    // Walk every subscription-group entry; find the strongest claim.
    let best: { entitled: boolean; expiresAt: number | null; productId: string | null } | null = null;
    for (const group of statuses.data ?? []) {
      for (const last of group.lastTransactions ?? []) {
        if (!last.signedTransactionInfo) continue;
        let info: AppleTransactionPayload;
        try {
          info = decodeJWSPayload<AppleTransactionPayload>(last.signedTransactionInfo);
        } catch {
          continue; // unreadable entry can never grant — fail closed
        }
        if (info.bundleId && info.bundleId !== bundleId) continue; // foreign app
        const revocationMs = parseAppleTimestamp(info.revocationDate);
        const revoked = revocationMs !== null && revocationMs <= Date.now();
        const entitled =
          !revoked && typeof last.status === 'number' && ENTITLED_STATUSES.has(last.status);
        const expiresAt = parseAppleTimestamp(info.expiresDate);
        const candidate = { entitled, expiresAt, productId: info.productId ?? null };
        if (
          best === null ||
          (candidate.entitled && !best.entitled) ||
          (candidate.entitled === best.entitled &&
            (candidate.expiresAt ?? 0) > (best.expiresAt ?? 0))
        ) {
          best = candidate;
        }
      }
    }

    if (best === null) {
      // Statuses came back but held nothing for our bundle — treat as
      // not found in this environment and keep looking.
      continue;
    }
    return withCors(
      NextResponse.json({
        ok: true,
        entitlement: best.entitled ? 'pro' : 'free',
        expiresAt: best.expiresAt,
        productId: best.productId,
        environment: env,
      }),
      req,
    );
  }

  // ---- Fallback: single-transaction lookup ----
  // Covers transaction ids the statuses endpoint rejects (e.g. a
  // non-subscription product, should we ever ship one).
  for (const env of envOrder) {
    const res = await appleGet(env, `/inApps/v1/transactions/${encodeURIComponent(transactionId)}`);
    if (!res) { hadServerError = true; continue; }
    if (res.status === 404) continue;
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      console.error(`[api/iap/validate] transactions ${env} error`, res.status, txt);
      hadServerError = true;
      continue;
    }

    let payload: { signedTransactionInfo?: string };
    try {
      payload = (await res.json()) as typeof payload;
    } catch {
      hadServerError = true;
      continue;
    }
    if (!payload.signedTransactionInfo) { hadServerError = true; continue; }

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

    if (info.bundleId && info.bundleId !== bundleId) {
      return withCors(
        NextResponse.json({ ok: false, reason: 'transaction is for a different app' }, { status: 403 }),
        req,
      );
    }

    // Fail-closed timestamps: an UNREADABLE expiresDate is treated as
    // already expired so a malformed payload can never grant Pro.
    const expiresMs = parseAppleTimestamp(info.expiresDate);
    const revocationMs = parseAppleTimestamp(info.revocationDate);
    const now = Date.now();
    const expired = expiresMs === null || expiresMs <= now;
    const revoked = revocationMs !== null && revocationMs <= now;
    const entitled = !revoked && !expired;

    return withCors(
      NextResponse.json({
        ok: true,
        entitlement: entitled ? 'pro' : 'free',
        expiresAt: expiresMs,
        productId: info.productId ?? null,
        environment: env,
      }),
      req,
    );
  }

  if (hadServerError) {
    return withCors(
      NextResponse.json({ ok: false, reason: 'could not reach Apple' }, { status: 502 }),
      req,
    );
  }
  // Clean 404s in both environments on both endpoints: the transaction
  // genuinely doesn't exist — likely a forged or mistyped id.
  return withCors(
    NextResponse.json({ ok: false, reason: 'transaction not found' }, { status: 404 }),
    req,
  );
}

/**
 * Apple's transaction payload usually carries timestamps as int64
 * milliseconds since epoch, but we've seen ISO 8601 strings too.
 * Returns null when the value is missing or unparseable.
 */
function parseAppleTimestamp(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    // Numeric string ("1735689600000") — coerce.
    const asNum = Number(v);
    if (Number.isFinite(asNum) && asNum > 0) return asNum;
    // ISO 8601 ("2025-01-01T00:00:00Z") — Date.parse.
    const asDate = Date.parse(v);
    if (Number.isFinite(asDate)) return asDate;
  }
  return null;
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
