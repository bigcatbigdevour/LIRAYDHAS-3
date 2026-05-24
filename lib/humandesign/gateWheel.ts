// The 64 gates in zodiacal order, starting at gate 41 at 2° 00' Aquarius (= 302.00°).
// Each gate spans 5.625°. Each of its 6 lines spans 0.9375°.

export const GATE_WHEEL: number[] = [
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3,
  27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
  31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50,
  28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60,
];

export const WHEEL_START_DEG = 302; // gate 41 begins here
export const GATE_WIDTH = 360 / 64; // 5.625
export const LINE_WIDTH = GATE_WIDTH / 6; // 0.9375

export interface GateLine {
  gate: number;
  line: number;     // 1..6
  color: number;    // 1..6 (sub-line)
  tone: number;     // 1..6
  base: number;     // 1..5
  /** Position inside the gate, 0..1. */
  fraction: number;
}

/** Map ecliptic longitude (degrees, 0..360) → gate, line and finer sub-divisions. */
export function longitudeToGateLine(longitudeDeg: number): GateLine {
  let pos = ((longitudeDeg - WHEEL_START_DEG) % 360 + 360) % 360;
  const idx = Math.floor(pos / GATE_WIDTH);
  const gate = GATE_WHEEL[idx % 64];
  const within = pos - idx * GATE_WIDTH; // 0..GATE_WIDTH
  const fraction = within / GATE_WIDTH;

  const line = Math.min(6, Math.floor(within / LINE_WIDTH) + 1);
  const withinLine = within - (line - 1) * LINE_WIDTH; // 0..LINE_WIDTH
  const color = Math.min(6, Math.floor((withinLine / LINE_WIDTH) * 6) + 1);

  const withinColor = withinLine - ((color - 1) * LINE_WIDTH) / 6;
  const tone = Math.min(6, Math.floor((withinColor / (LINE_WIDTH / 6)) * 6) + 1);
  const withinTone = withinColor - ((tone - 1) * LINE_WIDTH) / 36;
  const base = Math.min(5, Math.floor((withinTone / (LINE_WIDTH / 36)) * 5) + 1);

  return { gate, line, color, tone, base, fraction };
}

/** Inverse — center longitude of a given gate (degrees). */
export function gateCenterLongitude(gate: number): number {
  const idx = GATE_WHEEL.indexOf(gate);
  if (idx < 0) throw new Error(`Unknown gate ${gate}`);
  return (WHEEL_START_DEG + idx * GATE_WIDTH + GATE_WIDTH / 2) % 360;
}
