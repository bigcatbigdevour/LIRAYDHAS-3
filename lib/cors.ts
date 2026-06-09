// Shared CORS helpers for the /api/* route handlers.
//
// Origins allowed: the live Vercel deployment, any *.vercel.app preview,
// localhost for development, and the Capacitor iOS shell which uses
// scheme `capacitor://localhost` in the WebView.

import { NextResponse } from 'next/server';

// Anchored on a `-` or `.` after the project name so a hypothetical
// `liraydhas-3foo.vercel.app` (different project) cannot pass auth.
// Matches: liraydhas-3.vercel.app, liraydhas-3-git-main-foo.vercel.app,
// liraydhas-3-abc123.vercel.app — all Vercel-issued prefix patterns.
const ALLOWED_PATTERNS: RegExp[] = [
  /^https:\/\/liraydhas-3(-[a-z0-9.-]+)?\.vercel\.app$/,
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^capacitor:\/\/localhost$/,
  /^ionic:\/\/localhost$/,
];

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && ALLOWED_PATTERNS.some((re) => re.test(origin))) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return headers;
}

/** Handle an OPTIONS preflight request. */
export function handlePreflight(req: Request): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req.headers.get('origin')),
  });
}

/** Decorate any NextResponse with CORS headers for this request's origin. */
export function withCors(res: NextResponse, req: Request): NextResponse {
  const ch = corsHeaders(req.headers.get('origin'));
  for (const [k, v] of Object.entries(ch)) res.headers.set(k, v);
  return res;
}
