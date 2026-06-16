'use client';

import { useEffect, useRef, useState } from 'react';
import { tap as hapticTap, success as hapticSuccess } from '@/lib/haptics';

/**
 * iOS-style pull-to-refresh. Wraps the page contents. Only triggers when
 * the page is already scrolled to the very top — otherwise it lets the
 * browser scroll normally.
 *
 * Visual indicator: a small dot that grows + spins as the pull goes deeper.
 */
const TRIGGER_DISTANCE = 70;     // px the user must pull to fire
const MAX_VISUAL_PULL = 100;     // px clamp for the indicator transform
const RESISTANCE = 0.55;         // pulls feel "weighty" past zero

export default function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}) {
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);            // current visual pull distance, px
  const [refreshing, setRefreshing] = useState(false);
  const [armed, setArmed] = useState(false);      // crossed trigger threshold during this gesture
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (refreshing) return;
      if (window.scrollY > 0) {
        startY.current = null;
        return;
      }
      // Multi-touch / pinch can produce empty touches arrays on
      // some WebKit versions; guard so we don't crash on undefined.
      const t = e.touches[0];
      if (!t) return;
      startY.current = t.clientY;
      setArmed(false);
    }
    function onTouchMove(e: TouchEvent) {
      if (refreshing || startY.current === null) return;
      const t = e.touches[0];
      if (!t) return;
      const dy = t.clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // Resisted pull, clamped to MAX_VISUAL_PULL
      const visual = Math.min(MAX_VISUAL_PULL, dy * RESISTANCE);
      setPull(visual);
      if (!armed && visual >= TRIGGER_DISTANCE) {
        setArmed(true);
        hapticTap('light');
      } else if (armed && visual < TRIGGER_DISTANCE) {
        setArmed(false);
      }
    }
    async function onTouchEnd() {
      if (refreshing) return;
      const fire = armed;
      startY.current = null;
      if (fire) {
        setRefreshing(true);
        setPull(TRIGGER_DISTANCE);
        try {
          await onRefresh();
          hapticSuccess();
        } catch {
          // swallow — caller surfaces errors itself
        }
        setRefreshing(false);
      }
      setPull(0);
      setArmed(false);
    }

    // passive: false so we can preventDefault on overscroll if we want.
    // We don't preventDefault — letting iOS rubber-band feel happen normally
    // looks better than wrestling with it.
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [refreshing, armed, onRefresh]);

  const indicatorOpacity = Math.min(1, pull / TRIGGER_DISTANCE);
  const indicatorRotate = (pull / TRIGGER_DISTANCE) * 360;
  const indicatorScale = 0.5 + Math.min(1, pull / TRIGGER_DISTANCE) * 0.5;
  const showIndicator = pull > 4 || refreshing;

  return (
    <div ref={containerRef} className="relative">
      {/* Indicator sits OUTSIDE the translated wrapper (fixed-positioned) so
          its own translate isn't compounded by the content's pull-translate. */}
      {showIndicator && (
        <div
          aria-hidden
          className="fixed left-0 right-0 flex justify-center pointer-events-none z-30"
          style={{
            top: `calc(env(safe-area-inset-top) + 8px)`,
            opacity: indicatorOpacity,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: `1.4px solid ${armed || refreshing ? '#8b3a3a' : '#666'}`,
              borderTopColor: refreshing ? '#8b3a3a' : 'transparent',
              transform: refreshing ? undefined : `rotate(${indicatorRotate}deg) scale(${indicatorScale})`,
              animation: refreshing ? 'liraydhas-spin 0.9s linear infinite' : undefined,
            }}
          />
        </div>
      )}
      <div
        style={{
          transform: `translateY(${pull}px)`,
          transition: pull === 0 ? 'transform 220ms ease' : 'none',
          willChange: 'transform',
        }}
      >
        {children}
      </div>
    </div>
  );
}
