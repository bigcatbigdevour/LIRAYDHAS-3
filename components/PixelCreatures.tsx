'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Two tiny pixel-art creatures (a bunny + a bird) that hop around the screen
 * at slow intervals. Pure cosmetic joy — deliberately out of place against
 * the Co-Star austerity. Position is on-screen pixel coords, randomised
 * every few seconds with a small hop animation.
 */
export default function PixelCreatures() {
  return (
    <>
      <Creature kind="bunny" idleMs={6800} />
      <Creature kind="bird"  idleMs={9100} />
    </>
  );
}

interface CreatureProps {
  kind: 'bunny' | 'bird';
  idleMs: number;
}

function Creature({ kind, idleMs }: CreatureProps) {
  const [pos, setPos] = useState<{ x: number; y: number; flip: boolean } | null>(null);
  const [hop, setHop] = useState(false);
  const lastPos = useRef<{ x: number; y: number; flip: boolean } | null>(null);

  useEffect(() => {
    function pick() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const x = Math.max(16, Math.min(w - 40, Math.random() * (w - 60) + 20));
      const y = Math.max(120, Math.min(h - 140, Math.random() * (h - 260) + 120));
      const prev = lastPos.current;
      const flip = prev ? x < prev.x : Math.random() < 0.5;
      const next = { x, y, flip };
      lastPos.current = next;
      setPos(next);
      setHop(true);
      window.setTimeout(() => setHop(false), 600);
    }
    // small initial delay so creatures don't compete with page load
    const initial = window.setTimeout(pick, 3200 + Math.random() * 1500);
    const interval = window.setInterval(pick, idleMs);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [idleMs]);

  if (!pos) return null;

  return (
    <div
      aria-hidden
      className="fixed z-[60] pointer-events-none"
      style={{
        left: pos.x,
        top: pos.y,
        width: 24,
        height: 24,
        transform: `${pos.flip ? 'scaleX(-1)' : ''} translateY(${hop ? '-6px' : '0px'})`,
        transition: 'transform 280ms cubic-bezier(.4,1.7,.6,1), left 320ms ease, top 320ms ease',
        imageRendering: 'pixelated',
        WebkitFontSmoothing: 'none',
      }}
    >
      {kind === 'bunny' ? <Bunny /> : <Bird />}
    </div>
  );
}

/** Tiny pixel bunny in cream over the dark bg. 12×12 grid scaled up. */
function Bunny() {
  // Each cell is a 2×2 pixel; viewBox 12×12 scaled up by SVG layout to 24x24.
  return (
    <svg viewBox="0 0 12 12" width="24" height="24" shapeRendering="crispEdges">
      {/* ears */}
      <rect x="3" y="0" width="1" height="3" fill="#f4f1ea" />
      <rect x="6" y="0" width="1" height="3" fill="#f4f1ea" />
      <rect x="3" y="1" width="1" height="2" fill="#d6a3a3" />
      <rect x="6" y="1" width="1" height="2" fill="#d6a3a3" />
      {/* head */}
      <rect x="2" y="3" width="6" height="4" fill="#f4f1ea" />
      {/* eye */}
      <rect x="4" y="4" width="1" height="1" fill="#0a0a0a" />
      <rect x="6" y="4" width="1" height="1" fill="#0a0a0a" />
      {/* nose */}
      <rect x="5" y="5" width="1" height="1" fill="#d6a3a3" />
      {/* body */}
      <rect x="2" y="7" width="6" height="3" fill="#f4f1ea" />
      <rect x="3" y="10" width="1" height="1" fill="#f4f1ea" />
      <rect x="6" y="10" width="1" height="1" fill="#f4f1ea" />
      {/* tail */}
      <rect x="8" y="8" width="1" height="1" fill="#f4f1ea" />
    </svg>
  );
}

/** Tiny pixel bird, wine-accent body. */
function Bird() {
  return (
    <svg viewBox="0 0 12 12" width="24" height="24" shapeRendering="crispEdges">
      {/* body */}
      <rect x="3" y="4" width="5" height="3" fill="#8b3a3a" />
      {/* head */}
      <rect x="6" y="3" width="3" height="3" fill="#8b3a3a" />
      {/* beak */}
      <rect x="9" y="4" width="1" height="1" fill="#c2bea3" />
      {/* eye */}
      <rect x="7" y="4" width="1" height="1" fill="#0a0a0a" />
      {/* wing */}
      <rect x="4" y="5" width="3" height="1" fill="#5a2424" />
      {/* tail */}
      <rect x="2" y="5" width="1" height="2" fill="#8b3a3a" />
      {/* legs */}
      <rect x="4" y="7" width="1" height="2" fill="#c2bea3" />
      <rect x="6" y="7" width="1" height="2" fill="#c2bea3" />
    </svg>
  );
}
