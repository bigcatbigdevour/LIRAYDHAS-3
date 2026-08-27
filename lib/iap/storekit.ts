/**
 * Real StoreKit bridge for the iOS build, via cordova-plugin-purchase
 * (v13, by Fovea). Chosen over RevenueCat deliberately: no third-party
 * account, no API key, no revenue share beyond Apple's — the plugin
 * talks straight to StoreKit and we validate against Apple's App Store
 * Server API with our own /api/iap/validate endpoint.
 *
 * HOW IT LOADS
 * The plugin registers itself on `window.CdvPurchase` when Capacitor
 * boots the native webview. This module NEVER imports the npm package —
 * it only reads that global, guarded — so the web bundle stays clean
 * and web builds work with the plugin entirely absent. The npm package
 * exists in package.json solely so `npx cap sync ios` installs the
 * native pod into the Xcode project.
 *
 * PURCHASE FLOW
 *   1. initStoreKit(): register both subscription SKUs, attach the
 *      `approved` listener, initialize the Apple platform adapter.
 *      Idempotent — safe to call from app boot AND paywall mount.
 *   2. purchaseNative(productId): places the order (Apple's payment
 *      sheet opens). Resolution happens via the approved listener:
 *      transaction → our server validates with Apple → entitled?
 *      → grant local Pro → tx.finish(). The listener also catches
 *      renewals and unfinished transactions replayed at app launch,
 *      so entitlement heals itself on every boot.
 *   3. If OUR server is unreachable at approval time we grant
 *      optimistically (Apple already charged the user — locking a
 *      paying user out over our downtime is the worse failure) and
 *      reconcile at next boot via revalidateNative(), which is
 *      fail-closed server-side.
 *
 * RESTORE
 *   store.restorePurchases() replays owned transactions through the
 *   same approved listener; afterwards we scan local receipts for the
 *   newest transaction on either SKU and confirm with the server.
 */

import { Capacitor } from '@capacitor/core';
import { api } from '@/lib/apiBase';
import { PRODUCT_IDS, setSubState, type ProductId } from '@/lib/subscription';

/* ------------------------------------------------------------------ */
/* Minimal ambient types for the CdvPurchase global (v13 surface).     */
/* We declare only what we use so the web build never needs the        */
/* package's own type definitions.                                     */
/* ------------------------------------------------------------------ */

interface CPTransaction {
  transactionId: string;
  products: { id: string }[];
  purchaseDate?: string | Date;
  finish(): Promise<void>;
}
interface CPPricingPhase { price?: string }
interface CPOffer {
  pricingPhases?: CPPricingPhase[];
  order(): Promise<unknown>;
}
interface CPProduct {
  id: string;
  owned?: boolean;
  offers?: CPOffer[];
  getOffer(id?: string): CPOffer | undefined;
}
interface CPReceipt { transactions: CPTransaction[] }
interface CPWhenBuilder {
  approved(cb: (tx: CPTransaction) => void): CPWhenBuilder;
  productUpdated(cb: (p: CPProduct) => void): CPWhenBuilder;
}
interface CPStore {
  register(products: { id: string; type: string; platform: string }[]): void;
  initialize(platforms: string[]): Promise<unknown>;
  when(): CPWhenBuilder;
  get(id: string, platform?: string): CPProduct | undefined;
  restorePurchases(): Promise<unknown> | void;
  localReceipts: CPReceipt[];
  error(cb: (err: unknown) => void): void;
}
interface CdvPurchaseNS {
  store: CPStore;
  ProductType: { PAID_SUBSCRIPTION: string };
  Platform: { APPLE_APPSTORE: string };
  ErrorCode?: Record<string, number>;
}
declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Window { CdvPurchase?: CdvPurchaseNS }
}

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const TX_KEY = 'liraydhas.iap.lastTransactionId.v1';
const TX_PRODUCT_KEY = 'liraydhas.iap.lastProductId.v1';
/** Apple's user-cancelled code in cordova-plugin-purchase. */
const PAYMENT_CANCELLED = 6777006;
/** How long purchaseNative() waits for the approved event before
 *  telling the user it's still processing. Ask-to-Buy (parental
 *  approval) can legitimately take days — the listener grants
 *  whenever approval finally lands, independent of this timeout. */
const PURCHASE_WAIT_MS = 90_000;

let initPromise: Promise<boolean> | null = null;
type PurchaseResult = { ok: true } | { ok: false; reason: string };
const pendingResolvers = new Map<string, (r: PurchaseResult) => void>();

function cdv(): CdvPurchaseNS | null {
  if (!Capacitor.isNativePlatform()) return null;
  if (typeof window === 'undefined') return null;
  return window.CdvPurchase ?? null;
}

/** True when purchases can actually run in this build. */
export function iapAvailable(): boolean {
  return cdv() !== null;
}

function persistTx(transactionId: string, productId: string): void {
  try {
    window.localStorage.setItem(TX_KEY, transactionId);
    window.localStorage.setItem(TX_PRODUCT_KEY, productId);
  } catch { /* private browsing — revalidation just won't have an id */ }
}
function readPersistedTx(): { transactionId: string; productId: string } | null {
  try {
    const t = window.localStorage.getItem(TX_KEY);
    const p = window.localStorage.getItem(TX_PRODUCT_KEY);
    if (t && p) return { transactionId: t, productId: p };
  } catch { /* ignore */ }
  return null;
}

function asProductId(id: string): ProductId {
  return (id === PRODUCT_IDS.monthly ? PRODUCT_IDS.monthly : PRODUCT_IDS.annual);
}

function resolvePending(productId: string | undefined, r: PurchaseResult): void {
  if (!productId) return;
  const resolve = pendingResolvers.get(productId);
  if (resolve) {
    pendingResolvers.delete(productId);
    resolve(r);
  }
}

/* ------------------------------------------------------------------ */
/* Server validation                                                   */
/* ------------------------------------------------------------------ */

interface ServerVerdict {
  /** Did the server respond with a definitive answer at all? */
  known: boolean;
  entitled: boolean;
  expiresAt: number | null;
  productId: string | null;
}

async function validateWithServer(transactionId: string): Promise<ServerVerdict> {
  try {
    const res = await fetch(api('/api/iap/validate'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ transactionId }),
    });
    if (!res.ok) {
      // 4xx = definitive rejection (bad/foreign/unknown transaction).
      // 5xx = our server or Apple hiccuped; not definitive.
      return { known: res.status < 500, entitled: false, expiresAt: null, productId: null };
    }
    const j = (await res.json()) as {
      ok?: boolean; entitlement?: string; expiresAt?: number | null; productId?: string | null;
    };
    return {
      known: true,
      entitled: j.ok === true && j.entitlement === 'pro',
      expiresAt: typeof j.expiresAt === 'number' ? j.expiresAt : null,
      productId: typeof j.productId === 'string' ? j.productId : null,
    };
  } catch {
    return { known: false, entitled: false, expiresAt: null, productId: null };
  }
}

function grantPro(productId: string, expiresAt: number | null): void {
  setSubState({
    kind: 'pro',
    productId: asProductId(productId),
    renewsAt: expiresAt ?? undefined,
  });
}

/* ------------------------------------------------------------------ */
/* Init                                                                */
/* ------------------------------------------------------------------ */

/**
 * Register products + listeners and initialize the Apple adapter.
 * Idempotent: repeat calls return the same promise. Resolves false on
 * web / when the plugin isn't present (dev build without cap sync).
 */
export function initStoreKit(): Promise<boolean> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const ns = cdv();
    if (!ns) return false;
    const { store, ProductType, Platform } = ns;

    store.error((err) => {
      console.warn('[iap] store error:', err);
    });

    store.register([
      { id: PRODUCT_IDS.monthly, type: ProductType.PAID_SUBSCRIPTION, platform: Platform.APPLE_APPSTORE },
      { id: PRODUCT_IDS.annual, type: ProductType.PAID_SUBSCRIPTION, platform: Platform.APPLE_APPSTORE },
    ]);

    // Listeners BEFORE initialize — StoreKit can replay unfinished /
    // renewal transactions immediately on startup.
    store.when().approved((tx) => {
      void onApproved(tx);
    });

    try {
      await store.initialize([Platform.APPLE_APPSTORE]);
      return true;
    } catch (e) {
      console.error('[iap] store.initialize failed:', e);
      return false;
    }
  })();
  return initPromise;
}

async function onApproved(tx: CPTransaction): Promise<void> {
  const productId = tx.products[0]?.id;
  // Ignore transactions for products we don't sell (defensive).
  if (productId !== PRODUCT_IDS.monthly && productId !== PRODUCT_IDS.annual) {
    try { await tx.finish(); } catch { /* ignore */ }
    return;
  }

  const verdict = await validateWithServer(tx.transactionId);

  if (verdict.entitled) {
    persistTx(tx.transactionId, verdict.productId ?? productId);
    grantPro(verdict.productId ?? productId, verdict.expiresAt);
    try { await tx.finish(); } catch { /* ignore */ }
    resolvePending(productId, { ok: true });
    return;
  }

  if (!verdict.known) {
    // Apple charged the user but OUR validation layer is unreachable.
    // Grant optimistically — a paying user locked out by our downtime
    // is the worse failure — and reconcile at next boot via
    // revalidateNative(), which the server answers fail-closed.
    persistTx(tx.transactionId, productId);
    grantPro(productId, null);
    try { await tx.finish(); } catch { /* ignore */ }
    resolvePending(productId, { ok: true });
    return;
  }

  // Server definitively says not entitled (expired / revoked / foreign).
  // Finish so StoreKit stops replaying it; do not grant.
  try { await tx.finish(); } catch { /* ignore */ }
  resolvePending(productId, {
    ok: false,
    reason: 'Apple reports this subscription is not currently active.',
  });
}

/* ------------------------------------------------------------------ */
/* Purchase / restore / prices / revalidation                          */
/* ------------------------------------------------------------------ */

/** Localized display price ("$4.99") for a SKU, once the catalog has
 *  loaded. Null before init completes or on web. */
export function getDisplayPrice(productId: ProductId): string | null {
  const ns = cdv();
  if (!ns) return null;
  const product = ns.store.get(productId, ns.Platform.APPLE_APPSTORE);
  const offer = product?.getOffer?.() ?? product?.offers?.[0];
  const phases = offer?.pricingPhases;
  const price = phases && phases.length > 0 ? phases[phases.length - 1]?.price : undefined;
  return typeof price === 'string' && price.length > 0 ? price : null;
}

export async function purchaseNative(productId: ProductId): Promise<PurchaseResult> {
  const ready = await initStoreKit();
  const ns = cdv();
  if (!ready || !ns) {
    return { ok: false, reason: "In-app purchases aren't available in this build." };
  }

  const product = ns.store.get(productId, ns.Platform.APPLE_APPSTORE);
  const offer = product?.getOffer?.() ?? product?.offers?.[0];
  if (!offer) {
    return {
      ok: false,
      reason: 'Subscription options are still loading — try again in a moment.',
    };
  }

  // Arm the resolver BEFORE ordering: on fast approvals the approved
  // event can fire before order()'s own promise settles.
  const waited = new Promise<PurchaseResult>((resolve) => {
    pendingResolvers.set(productId, resolve);
  });

  let orderErr: unknown;
  try {
    orderErr = await offer.order();
  } catch (e) {
    orderErr = e;
  }

  if (orderErr) {
    const code = (orderErr as { code?: number }).code;
    pendingResolvers.delete(productId);
    if (code === PAYMENT_CANCELLED) {
      return { ok: false, reason: 'Purchase cancelled.' };
    }
    const msg = (orderErr as { message?: string }).message;
    return { ok: false, reason: msg || 'The App Store could not start this purchase.' };
  }

  // Order placed — wait for the approved listener (or time out into a
  // soft "still processing" state; Ask-to-Buy can take days and the
  // listener will still grant whenever approval lands).
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timedOut = new Promise<PurchaseResult>((resolve) => {
    timer = setTimeout(() => {
      pendingResolvers.delete(productId);
      resolve({
        ok: false,
        reason: "Apple is still confirming this purchase. It will unlock automatically once it's approved.",
      });
    }, PURCHASE_WAIT_MS);
  });

  const result = await Promise.race([waited, timedOut]);
  if (timer) clearTimeout(timer);
  return result;
}

export async function restoreNative(): Promise<
  { ok: true; restored: boolean } | { ok: false; reason: string }
> {
  const ready = await initStoreKit();
  const ns = cdv();
  if (!ready || !ns) {
    return { ok: false, reason: "In-app purchases aren't available in this build." };
  }

  try {
    await Promise.resolve(ns.store.restorePurchases());
  } catch (e) {
    const msg = (e as { message?: string }).message;
    return { ok: false, reason: msg || 'Restore failed — try again.' };
  }

  // restorePurchases replays owned transactions through the approved
  // listener (which grants). Belt-and-braces: also scan local receipts
  // for the newest transaction on either SKU and confirm it directly,
  // covering the case where everything was already finished and no
  // approved event re-fired.
  const ourIds = new Set<string>([PRODUCT_IDS.monthly, PRODUCT_IDS.annual]);
  let newest: CPTransaction | null = null;
  let newestTime = -Infinity;
  for (const receipt of ns.store.localReceipts ?? []) {
    for (const t of receipt.transactions ?? []) {
      if (!t.products?.some((p) => ourIds.has(p.id))) continue;
      const time = t.purchaseDate ? new Date(t.purchaseDate).getTime() : 0;
      if (time >= newestTime) {
        newestTime = time;
        newest = t;
      }
    }
  }

  if (!newest) return { ok: true, restored: false };

  const productId = newest.products.find((p) => ourIds.has(p.id))?.id ?? PRODUCT_IDS.annual;
  const verdict = await validateWithServer(newest.transactionId);
  if (verdict.entitled) {
    persistTx(newest.transactionId, verdict.productId ?? productId);
    grantPro(verdict.productId ?? productId, verdict.expiresAt);
    return { ok: true, restored: true };
  }
  if (!verdict.known) {
    // Can't reach validation — the transaction exists on this Apple ID,
    // so grant optimistically and reconcile at next boot.
    persistTx(newest.transactionId, productId);
    grantPro(productId, null);
    return { ok: true, restored: true };
  }
  return { ok: true, restored: false };
}

/**
 * Boot-time reconciliation. Re-checks the stored transaction against
 * the server (which asks Apple for the subscription's CURRENT status,
 * so renewals extend and lapses downgrade). Network failure keeps the
 * current local state — offline users don't lose access they paid for.
 */
export async function revalidateNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const saved = readPersistedTx();
  if (!saved) return;
  const verdict = await validateWithServer(saved.transactionId);
  if (!verdict.known) return; // offline / server down — keep local state
  if (verdict.entitled) {
    grantPro(verdict.productId ?? saved.productId, verdict.expiresAt);
  } else {
    setSubState({ kind: 'free' });
  }
}
