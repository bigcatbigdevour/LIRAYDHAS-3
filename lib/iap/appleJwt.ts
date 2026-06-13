/**
 * Apple App Store Server API authentication + signed-transaction decoding.
 *
 * Two halves:
 *   1. signAppleJWT() — builds the ES256-signed JWT we send to Apple's
 *      App Store Server API to authenticate as our developer account.
 *   2. decodeJWSPayload() — parses the JWS strings Apple returns
 *      (signedTransactionInfo, signedRenewalInfo) into their JSON
 *      payloads.
 *
 * Crypto stays on Node's built-in `crypto` module — no jsonwebtoken /
 * jose dependency. JWS signing uses ECDSA P-256 (SHA-256) with raw
 * r||s output (ieee-p1363), which is what JWS expects (Node defaults
 * to DER, so we have to opt in).
 *
 * Signature verification scope:
 *   - Outgoing JWT to Apple: we sign with our own key.
 *   - Incoming JWS from Apple: we DECODE the payload but do not verify
 *     the x5c certificate chain. We rely on the TLS channel to
 *     api.storekit.itunes.apple.com to authenticate the response.
 *     Hardening this further means walking the x5c chain back to
 *     Apple's published root CA — recommended before a production
 *     paid launch, but out of scope for this scaffolding.
 */

import crypto from 'crypto';

export interface AppleApiCredentials {
  /** Apple Developer "Key ID" (e.g. 'ABC1234567') from App Store Connect. */
  keyId: string;
  /** Apple Developer "Issuer ID" — a UUID from App Store Connect. */
  issuerId: string;
  /** PEM-encoded ECDSA private key (.p8 file contents). */
  privateKey: string;
  /** The app's bundle identifier — e.g. 'app.liraydhas'. */
  bundleId: string;
}

function base64UrlEncode(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf;
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64');
}

/**
 * Build a 5-minute JWT to authenticate as the developer account.
 * Apple rejects tokens older than ~60 minutes, so callers can cache and
 * re-sign at 5-10 minute intervals if making many calls.
 */
export function signAppleJWT(creds: AppleApiCredentials): string {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'ES256',
    kid: creds.keyId,
    typ: 'JWT',
  };
  const payload = {
    iss: creds.issuerId,
    iat: now,
    exp: now + 5 * 60,
    aud: 'appstoreconnect-v1',
    bid: creds.bundleId,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  const key = crypto.createPrivateKey({ key: creds.privateKey, format: 'pem' });
  // dsaEncoding 'ieee-p1363' produces the raw r||s concatenation that JWS
  // requires (the default is DER, which JWS verifiers reject).
  const sig = crypto.sign('SHA256', Buffer.from(signingInput), {
    key,
    dsaEncoding: 'ieee-p1363',
  });

  return `${signingInput}.${base64UrlEncode(sig)}`;
}

/**
 * Decode a JWS string (e.g. signedTransactionInfo from Apple) into its
 * JSON payload. Does NOT verify the signature — see the file comment
 * for the trust model.
 */
export function decodeJWSPayload<T = unknown>(jws: string): T {
  const parts = jws.split('.');
  if (parts.length !== 3) {
    throw new Error('malformed JWS');
  }
  const payload = base64UrlDecode(parts[1]).toString('utf8');
  return JSON.parse(payload) as T;
}
