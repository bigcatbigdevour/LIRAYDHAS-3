'use client';

import { useSubState, isPro } from '@/lib/subscription';
import Paywall from './Paywall';

interface Props {
  /** Voice-matched feature blurb shown in the paywall headline. */
  feature: string;
  /** Optional per-feature line list — falls back to the default Pro
   *  list inside Paywall. */
  features?: string[];
  /** The Pro-only UI to render when the user is subscribed. */
  children: React.ReactNode;
  /** Optional: render this when the user isn't Pro AND we don't want to
   *  surface the full paywall (e.g. an inline button). */
  fallback?: React.ReactNode;
}

/**
 * Gate any UI behind a Pro subscription. When the user is Pro (or in
 * trial), renders children. Otherwise renders either the inline
 * fallback (if supplied) or the full Paywall headline = `feature`.
 *
 * Example:
 *   <ProGate feature="Ask the day grounds chart-specific answers in
 *                     today's transits.">
 *     <AskTheDay blueprint={blueprint} />
 *   </ProGate>
 */
export default function ProGate({ feature, features, children, fallback }: Props) {
  const sub = useSubState();
  if (isPro(sub)) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;
  return <Paywall headline={feature} features={features} />;
}
