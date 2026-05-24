'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Two tiny pixel-art creatures (a bunny + a bird) that occasionally appear
 * and hop a few times before disappearing again. Cosmetic joy — deliberately
 * out of place against the austere aesthetic.
 */
export default function PixelCreatures() {
  return (
    <>
      <Creature kind="bunny" />
      <Creature kind="bird" offset={3000} />
    </>
  );
}

interface CreatureProps {
  kind: 'bunny' | 'bird';
  offset?: number;
}

interface Position {
  x: number;
  y: number;
  flip: boolean;
}

function Creature({ kind, offset = 0 }: CreatureProps) {
  const [pos, setPos] = useState<Position | null>(null);
  const [visible, setVisible] = useState(false);
  const [hop, setHop] = useState(false);
  const lastPos = useRef<Position | null>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    function clear() {
      for (const t of timers.current) window.clearTimeout(t);
      timers.current = [];
    }

    function pickPos(): Position {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const x = Math.max(16, Math.min(w - 40, Math.random() * (w - 60) + 20));
      const y = Math.max(120, Math.min(h - 140, Math.random() * (h - 260) + 120));
      const prev = lastPos.current;
      const flip = prev ? x < prev.x : Math.random() < 0.5;
      return { x, y, flip };
    }

    function hopOnce() {
      setHop(true);
      timers.current.push(window.setTimeout(() => setHop(false), 600));
    }

    function appear() {
      const p = pickPos();
      lastPos.current = p;
      setPos(p);
      setVisible(true);
      hopOnce();
      // Schedule 1-3 more hops while visible
      const hops = 1 + Math.floor(Math.random() * 3);
      for (let i = 1; i <= hops; i++) {
        timers.current.push(window.setTimeout(() => {
          const np = pickPos();
          lastPos.current = np;
          setPos(np);
          hopOnce();
        }, 1700 * i + Math.random() * 800));
      }
      // Disappear after a few seconds
      timers.current.push(window.setTimeout(() => {
        setVisible(false);
      }, 2000 + 1700 * hops));
    }

    // Initial offset to stagger creatures, then loop with a long gap
    const loop = () => {
      appear();
      // Re-appear in 18-32s
      timers.current.push(window.setTimeout(loop, 18000 + Math.random() * 14000));
    };
    timers.current.push(window.setTimeout(loop, 4000 + offset + Math.random() * 2000));

    return clear;
  }, [offset]);

  if (!pos || !visible) {
    // Still render the slot so opacity transitions feel right.
    return null;
  }

  return (
    <div
      aria-hidden
      className="fixed z-[60] pointer-events-none"
      style={{
        left: pos.x,
        top: pos.y,
        width: 24,
        height: 24,
        opacity: visible ? 1 : 0,
        transform: `${pos.flip ? 'scaleX(-1)' : ''} translateY(${hop ? '-6px' : '0px'})`,
        transition: 'transform 280ms cubic-bezier(.4,1.7,.6,1), left 320ms ease, top 320ms ease, opacity 400ms ease',
        imageRendering: 'pixelated',
        WebkitFontSmoothing: 'none',
      }}
    >
      {kind === 'bunny' ? <Bunny /> : <Bird />}
    </div>
  );
}

function Bunny() {
  return (
    <svg viewBox="0 0 12 12" width="24" height="24" shapeRendering="crispEdges">
      <rect x="3" y="0" width="1" height="3" fill="#f4f1ea" />
      <rect x="6" y="0" width="1" height="3" fill="#f4f1ea" />
      <rect x="3" y="1" width="1" height="2" fill="#d6a3a3" />
      <rect x="6" y="1" width="1" height="2" fill="#d6a3a3" />
      <rect x="2" y="3" width="6" height="4" fill="#f4f1ea" />
      <rect x="4" y="4" width="1" height="1" fill="#0a0a0a" />
      <rect x="6" y="4" width="1" height="1" fill="#0a0a0a" />
      <rect x="5" y="5" width="1" height="1" fill="#d6a3a3" />
      <rect x="2" y="7" width="6" height="3" fill="#f4f1ea" />
      <rect x="3" y="10" width="1" height="1" fill="#f4f1ea" />
      <rect x="6" y="10" width="1" height="1" fill="#f4f1ea" />
      <rect x="8" y="8" width="1" height="1" fill="#f4f1ea" />
    </svg>
  );
}

function Bird() {
  return (
    <svg viewBox="0 0 12 12" width="24" height="24" shapeRendering="crispEdges">
      <rect x="3" y="4" width="5" height="3" fill="#8b3a3a" />
      <rect x="6" y="3" width="3" height="3" fill="#8b3a3a" />
      <rect x="9" y="4" width="1" height="1" fill="#c2bea3" />
      <rect x="7" y="4" width="1" height="1" fill="#0a0a0a" />
      <rect x="4" y="5" width="3" height="1" fill="#5a2424" />
      <rect x="2" y="5" width="1" height="2" fill="#8b3a3a" />
      <rect x="4" y="7" width="1" height="2" fill="#c2bea3" />
      <rect x="6" y="7" width="1" height="2" fill="#c2bea3" />
    </svg>
  );
}
