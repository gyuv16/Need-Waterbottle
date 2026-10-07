// Procedural fur: generates many short, slightly curved hair strands.
// Strands are batched into one SVG path per colour so even a very furry
// character is only a handful of DOM elements.

export type FurLayer = { d: string; color: string; width: number; opacity: number };

type Palette = { color: string; width: number; opacity: number }[];

/** Small deterministic PRNG so the fur looks the same on every run. */
function rng(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function strand(x: number, y: number, angle: number, len: number, curl: number) {
  const dx = Math.cos(angle) * len;
  const dy = Math.sin(angle) * len;
  const cx = x + dx / 2 - Math.sin(angle) * curl;
  const cy = y + dy / 2 + Math.cos(angle) * curl;
  return `M${x.toFixed(1)} ${y.toFixed(1)}Q${cx.toFixed(1)} ${cy.toFixed(1)} ${(x + dx).toFixed(1)} ${(y + dy).toFixed(1)}`;
}

interface PatchOptions {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  count: number;
  /** Direction the fur lies, in degrees (0 = right, 90 = down). */
  angle: number | ((x: number, y: number) => number);
  length: number;
  palette: Palette;
  seed: number;
  /** 'fill' scatters strands inside the ellipse, 'edge' places them on its outline. */
  mode?: 'fill' | 'edge';
  /** Only use the part of the outline between these angles (degrees). */
  arc?: [number, number];
  spread?: number;
}

/** Fur strands inside or along the edge of an ellipse; colour follows height (lighter on top). */
export function furPatch(o: PatchOptions): FurLayer[] {
  const rand = rng(o.seed);
  const buckets: string[][] = o.palette.map(() => []);
  const spread = ((o.spread ?? 22) * Math.PI) / 180;
  const [a0, a1] = o.arc ?? [0, 360];
  for (let i = 0; i < o.count; i++) {
    let x: number;
    let y: number;
    if (o.mode === 'edge') {
      const t = ((a0 + (a1 - a0) * rand()) * Math.PI) / 180;
      x = o.cx + Math.cos(t) * o.rx;
      y = o.cy + Math.sin(t) * o.ry;
    } else {
      const r = Math.sqrt(rand());
      const t = rand() * Math.PI * 2;
      x = o.cx + Math.cos(t) * o.rx * r;
      y = o.cy + Math.sin(t) * o.ry * r;
    }
    const base = typeof o.angle === 'function' ? o.angle(x, y) : o.angle;
    const angle = (base * Math.PI) / 180 + (rand() - 0.5) * spread;
    const len = o.length * (0.6 + rand() * 0.7);
    const curl = (rand() - 0.5) * len * 0.5;
    // Higher up = lighter colour (palette is ordered light → dark), with some noise.
    const h = (y - (o.cy - o.ry)) / (2 * o.ry) + (rand() - 0.5) * 0.35;
    const idx = Math.max(0, Math.min(o.palette.length - 1, Math.floor(h * o.palette.length)));
    buckets[idx].push(strand(x, y, angle, len, curl));
  }
  return buckets
    .map((parts, i) => ({ d: parts.join(''), ...o.palette[i] }))
    .filter((l) => l.d);
}

/** Fur strands that radiate away from a centre point. */
export const radial = (cx: number, cy: number, bias = 0) => (x: number, y: number) =>
  (Math.atan2(y - cy, x - cx) * 180) / Math.PI + bias;

type Pt = [number, number];

/** Fur along a cubic Bézier (used for the plumed tail). */
export function furAlongCurve(
  p0: Pt, p1: Pt, p2: Pt, p3: Pt,
  o: { count: number; width: number; length: number; palette: Palette; seed: number; flow?: number },
): FurLayer[] {
  const rand = rng(o.seed);
  const buckets: string[][] = o.palette.map(() => []);
  for (let i = 0; i < o.count; i++) {
    const t = rand();
    const mt = 1 - t;
    const x = mt ** 3 * p0[0] + 3 * mt * mt * t * p1[0] + 3 * mt * t * t * p2[0] + t ** 3 * p3[0];
    const y = mt ** 3 * p0[1] + 3 * mt * mt * t * p1[1] + 3 * mt * t * t * p2[1] + t ** 3 * p3[1];
    const tx = 3 * mt * mt * (p1[0] - p0[0]) + 6 * mt * t * (p2[0] - p1[0]) + 3 * t * t * (p3[0] - p2[0]);
    const ty = 3 * mt * mt * (p1[1] - p0[1]) + 6 * mt * t * (p2[1] - p1[1]) + 3 * t * t * (p3[1] - p2[1]);
    const along = Math.atan2(ty, tx);
    const side = rand() - 0.5;
    const nx = -Math.sin(along);
    const ny = Math.cos(along);
    // Plume is fullest in the middle of the tail.
    const w = o.width * (0.55 + Math.sin(t * Math.PI) * 0.6);
    const px = x + nx * side * w;
    const py = y + ny * side * w;
    const angle = along + side * 1.6 * (o.flow ?? 1) + (rand() - 0.5) * 0.4;
    const len = o.length * (0.6 + rand() * 0.7);
    const idx = Math.min(o.palette.length - 1, Math.floor(rand() * o.palette.length));
    buckets[idx].push(strand(px, py, angle, len, (rand() - 0.5) * len * 0.5));
  }
  return buckets.map((parts, i) => ({ d: parts.join(''), ...o.palette[i] })).filter((l) => l.d);
}
