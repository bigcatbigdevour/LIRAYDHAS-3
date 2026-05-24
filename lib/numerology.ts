// Lightweight numerology helpers. Used on /chart as a small footer detail.

function reduce(n: number, masters = true): number {
  while (n > 9) {
    if (masters && (n === 11 || n === 22 || n === 33)) return n;
    let s = 0;
    while (n > 0) {
      s += n % 10;
      n = Math.floor(n / 10);
    }
    n = s;
  }
  return n;
}

/**
 * Life-path number. Birth ISO is local civil date "YYYY-MM-DD" or full ISO.
 * The standard method reduces month, day, and year separately, then sums.
 */
export function lifePath(birthIso: string): number {
  const m = birthIso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return 0;
  const [, y, mo, d] = m;
  const monthN = reduce(Number(mo));
  const dayN = reduce(Number(d));
  const yearN = reduce(Number(y));
  return reduce(monthN + dayN + yearN);
}

export function lifePathArchetype(n: number): string {
  switch (n) {
    case 1:  return 'The Initiator — beginnings, independence, friction with authority.';
    case 2:  return 'The Mediator — pairing, sensitivity, the quiet diplomat.';
    case 3:  return 'The Communicator — expression, charm, a tendency to scatter.';
    case 4:  return 'The Builder — discipline, structure, the long slow climb.';
    case 5:  return 'The Adventurer — restlessness, freedom, an allergic reaction to routine.';
    case 6:  return 'The Caretaker — responsibility, beauty, often the family pillar.';
    case 7:  return 'The Seeker — solitude, analysis, quiet intuition.';
    case 8:  return 'The Power — leverage, ambition, the lessons of money and authority.';
    case 9:  return 'The Humanitarian — endings, breadth, the broader cause.';
    case 11: return 'The Visionary (master) — heightened intuition, nervous energy, the messenger.';
    case 22: return 'The Master Builder — large-scale construction in the world.';
    case 33: return 'The Master Teacher — service, devotion, often a heavy lift.';
    default: return '';
  }
}
