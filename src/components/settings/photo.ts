// Photo → avatar face: find the face (+ hair) automatically and turn it into a cartoon.
// Everything runs locally in the Settings window; nothing is uploaded anywhere.

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type PhotoStyle = 'anime' | 'comic' | 'none';

/** Apply the chosen look to a face crop already drawn into `ctx`. */
export function stylize(ctx: CanvasRenderingContext2D, width: number, height: number, style: PhotoStyle): void {
  if (style === 'anime') animeize(ctx, width, height);
  else if (style === 'comic') cartoonize(ctx, width, height);
}

/** Oval output aspect (width / height), matching the photo head on the figure. */
export const FACE_ASPECT = 118 / 136;

/**
 * Find the main face and return a box around face *and* hair, in image pixels.
 * Uses the operating system's face detector (Windows / macOS) via the Shape Detection API.
 * Returns null when no detector is available or no face is found.
 */
export async function detectFaceAndHair(img: HTMLImageElement): Promise<Box | null> {
  if (typeof FaceDetector === 'undefined') return null;
  try {
    const faces = await new FaceDetector({ fastMode: false, maxDetectedFaces: 5 }).detect(img);
    if (!faces.length) return null;
    // Biggest face = the person the photo is about.
    const f = faces.reduce((a, b) => (b.boundingBox.width * b.boundingBox.height > a.boundingBox.width * a.boundingBox.height ? b : a)).boundingBox;
    // Grow the face box to take in hair and chin: hair sits mostly above and to the sides.
    const h = f.height * 1.95;
    const w = h * FACE_ASPECT;
    const cx = f.x + f.width / 2;
    const top = f.y - f.height * 0.72;
    return clampBox({ x: cx - w / 2, y: top, w, h }, img);
  } catch {
    return null;
  }
}

/** Fallback when no face is found: portraits usually have the face in the upper-middle. */
export function guessFaceBox(img: HTMLImageElement): Box {
  const h = Math.min(img.height * 0.75, (img.width / FACE_ASPECT) * 0.8);
  const w = h * FACE_ASPECT;
  return clampBox({ x: (img.width - w) / 2, y: img.height * 0.08, w, h }, img);
}

function clampBox(b: Box, img: { width: number; height: number }): Box {
  const w = Math.min(b.w, img.width);
  const h = Math.min(b.h, img.height);
  return { x: Math.max(0, Math.min(img.width - w, b.x)), y: Math.max(0, Math.min(img.height - h, b.y)), w, h };
}

/**
 * Cartoon effect, done in a few passes on the small output image:
 * 1. edge-preserving smoothing (skin and hair become smooth, edges stay sharp),
 * 2. colour quantisation into a small palette (flat "cel" colours),
 * 3. dark outlines from the edges of the smoothed image,
 * 4. a little extra saturation and warmth.
 */
export function cartoonize(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const image = ctx.getImageData(0, 0, width, height);
  const src = image.data;
  const n = width * height;

  // 1. Two passes of a 5×5 bilateral-style filter.
  let buf = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    buf[i * 3] = src[i * 4];
    buf[i * 3 + 1] = src[i * 4 + 1];
    buf[i * 3 + 2] = src[i * 4 + 2];
  }
  for (let pass = 0; pass < 3; pass++) buf = bilateral(buf, width, height, 2, 22);

  // 2. k-means palette (8 colours) on a sample, then map every pixel.
  const palette = kmeans(buf, n, 10);
  const flat = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const p = nearest(palette, buf[i * 3], buf[i * 3 + 1], buf[i * 3 + 2]);
    // Blend flat colour with smoothed detail so faces stay recognisable and natural.
    flat[i * 3] = palette[p][0] * 0.6 + buf[i * 3] * 0.4;
    flat[i * 3 + 1] = palette[p][1] * 0.6 + buf[i * 3 + 1] * 0.4;
    flat[i * 3 + 2] = palette[p][2] * 0.6 + buf[i * 3 + 2] * 0.4;
  }

  // 3. Outlines: Sobel on luminance of the smoothed image.
  const lum = new Float32Array(n);
  for (let i = 0; i < n; i++) lum[i] = 0.3 * buf[i * 3] + 0.59 * buf[i * 3 + 1] + 0.11 * buf[i * 3 + 2];
  const edge = new Uint8Array(n);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx = -lum[i - width - 1] - 2 * lum[i - 1] - lum[i + width - 1] + lum[i - width + 1] + 2 * lum[i + 1] + lum[i + width + 1];
      const gy = -lum[i - width - 1] - 2 * lum[i - width] - lum[i - width + 1] + lum[i + width - 1] + 2 * lum[i + width] + lum[i + width + 1];
      if (Math.hypot(gx, gy) > 120) edge[i] = 1;
    }
  }
  // Keep only connected edge pixels: real outlines, not speckles from skin texture or noise.
  const line = new Uint8Array(n);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (!edge[i]) continue;
      const near = edge[i - width - 1] + edge[i - width] + edge[i - width + 1] + edge[i - 1] + edge[i + 1] + edge[i + width - 1] + edge[i + width] + edge[i + width + 1];
      if (near >= 2) line[i] = 1;
    }
  }

  // 4. Compose: flat colours, saturation/warmth boost, outlines on top.
  for (let i = 0; i < n; i++) {
    let r = flat[i * 3];
    let g = flat[i * 3 + 1];
    let b = flat[i * 3 + 2];
    const m = (r + g + b) / 3;
    r = m + (r - m) * 1.2 + 6;
    g = m + (g - m) * 1.2 + 2;
    b = m + (b - m) * 1.2 - 3;
    if (line[i]) {
      r *= 0.4;
      g *= 0.35;
      b *= 0.35;
    }
    src[i * 4] = clamp255(r);
    src[i * 4 + 1] = clamp255(g);
    src[i * 4 + 2] = clamp255(b);
  }
  ctx.putImageData(image, 0, 0);
}

const clamp255 = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * Anime look, in the style of anime photo filters:
 * 1. heavy edge-preserving smoothing: painterly, poreless skin and silky hair with sharp features,
 * 2. cel shading: brightness snapped into a few soft bands (light / shadow / deep shadow) while hue is kept,
 * 3. anime colour grade: brighter, more saturated, lifted midtones, a soft warm pastel tint,
 * 4. clean line-art from an XDoG (extended difference-of-Gaussians) edge pass, speckles removed,
 * 5. soft bloom on the brightest areas for glossy hair and eye catch-lights.
 */
export function animeize(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const image = ctx.getImageData(0, 0, width, height);
  const src = image.data;
  const n = width * height;

  let buf = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    buf[i * 3] = src[i * 4];
    buf[i * 3 + 1] = src[i * 4 + 1];
    buf[i * 3 + 2] = src[i * 4 + 2];
  }

  // Lines are taken from a lightly smoothed copy so they follow real features, not noise.
  const lineSrc = bilateral(buf, width, height, 2, 30);
  const lum0 = new Float32Array(n);
  for (let i = 0; i < n; i++) lum0[i] = (0.299 * lineSrc[i * 3] + 0.587 * lineSrc[i * 3 + 1] + 0.114 * lineSrc[i * 3 + 2]) / 255;

  // 1. Painterly smoothing.
  for (let pass = 0; pass < 3; pass++) buf = bilateral(buf, width, height, 3, 20);

  // 4. XDoG line-art.
  const g1 = gaussian(lum0, width, height, 0.8);
  const g2 = gaussian(lum0, width, height, 0.8 * 1.6);
  const ink = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const d = g1[i] - 0.985 * g2[i];
    const e = d >= 0.012 ? 1 : 1 + Math.tanh(22 * (d - 0.012));
    ink[i] = Math.min(1, Math.max(0, (0.8 - e) / 0.8));
  }
  // Drop isolated specks; keep connected strokes.
  const strokes = new Float32Array(n);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (ink[i] < 0.25) continue;
      let near = 0;
      for (const j of [i - width - 1, i - width, i - width + 1, i - 1, i + 1, i + width - 1, i + width, i + width + 1]) if (ink[j] >= 0.25) near++;
      strokes[i] = near >= 2 ? ink[i] : 0;
    }
  }
  const lines = gaussian(strokes, width, height, 0.45); // anti-alias the strokes

  // 2 + 3. Cel shading and colour grade.
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let r = buf[i * 3];
    let g = buf[i * 3 + 1];
    let b = buf[i * 3 + 2];
    const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    // Soft bands: deep shadow, shadow, light, highlight.
    const cel = 0.22 + 0.25 * smoothstep(0.22, 0.32, l) + 0.25 * smoothstep(0.48, 0.58, l) + 0.1 * smoothstep(0.84, 0.92, l);
    const target = l * 0.4 + cel * 0.6;
    const k = l > 0.01 ? target / l : 1;
    r *= k;
    g *= k;
    b *= k;
    // Lift midtones (gamma), boost saturation, warm pastel tint.
    const lift = (v: number) => 255 * Math.pow(Math.min(1, Math.max(0, v / 255)), 0.88);
    r = lift(r);
    g = lift(g);
    b = lift(b);
    // Saturation boost fades out in dark tones so black clothes and hair stay neutral.
    const sat = 1 + 0.35 * smoothstep(0.18, 0.5, l);
    const m = (r + g + b) / 3;
    const warm = smoothstep(0.2, 0.6, l); // warm pastel tint only in mid/light tones
    r = m + (r - m) * sat + 5 * warm;
    g = m + (g - m) * sat + 2 * warm;
    b = m + (b - m) * sat + 3 * warm;
    out[i * 3] = r * 0.94 + 255 * 0.06;
    out[i * 3 + 1] = g * 0.94 + 255 * 0.06;
    out[i * 3 + 2] = b * 0.94 + 255 * 0.06;
  }

  // 5. Bloom: blur the brightest parts and add them back for a soft anime glow.
  const bright = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const l = (0.299 * out[i * 3] + 0.587 * out[i * 3 + 1] + 0.114 * out[i * 3 + 2]) / 255;
    bright[i] = Math.max(0, l - 0.86) * 4;
  }
  const glow = gaussian(bright, width, height, 3.2);

  for (let i = 0; i < n; i++) {
    const a = Math.min(1, lines[i] * 1.3);
    const bloom = glow[i] * 45;
    // Ink is a deep warm brown-black, like anime line-art.
    src[i * 4] = clamp255((out[i * 3] + bloom) * (1 - a) + 38 * a);
    src[i * 4 + 1] = clamp255((out[i * 3 + 1] + bloom) * (1 - a) + 26 * a);
    src[i * 4 + 2] = clamp255((out[i * 3 + 2] + bloom * 1.05) * (1 - a) + 30 * a);
  }
  ctx.putImageData(image, 0, 0);
}

/** Separable Gaussian blur of a single-channel image. */
function gaussian(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const r = Math.max(1, Math.ceil(sigma * 3));
  const kernel: number[] = [];
  let sum = 0;
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel.push(v);
    sum += v;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] /= sum;
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += src[y * w + Math.min(w - 1, Math.max(0, x + k))] * kernel[k + r];
      tmp[y * w + x] = acc;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -r; k <= r; k++) acc += tmp[Math.min(h - 1, Math.max(0, y + k)) * w + x] * kernel[k + r];
      out[y * w + x] = acc;
    }
  }
  return out;
}

function bilateral(src: Float32Array, w: number, h: number, radius: number, sigmaColor: number): Float32Array {
  const out = new Float32Array(src.length);
  const k = -1 / (2 * sigmaColor * sigmaColor);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const r0 = src[i];
      const g0 = src[i + 1];
      const b0 = src[i + 2];
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let sw = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = Math.min(h - 1, Math.max(0, y + dy));
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = Math.min(w - 1, Math.max(0, x + dx));
          const j = (yy * w + xx) * 3;
          const dr = src[j] - r0;
          const dg = src[j + 1] - g0;
          const db = src[j + 2] - b0;
          const wt = Math.exp((dr * dr + dg * dg + db * db) * k);
          sr += src[j] * wt;
          sg += src[j + 1] * wt;
          sb += src[j + 2] * wt;
          sw += wt;
        }
      }
      out[i] = sr / sw;
      out[i + 1] = sg / sw;
      out[i + 2] = sb / sw;
    }
  }
  return out;
}

function nearest(palette: number[][], r: number, g: number, b: number): number {
  let best = 0;
  let bd = Infinity;
  for (let p = 0; p < palette.length; p++) {
    const d = (palette[p][0] - r) ** 2 + (palette[p][1] - g) ** 2 + (palette[p][2] - b) ** 2;
    if (d < bd) {
      bd = d;
      best = p;
    }
  }
  return best;
}

function kmeans(buf: Float32Array, n: number, k: number): number[][] {
  const step = Math.max(1, Math.floor(n / 4000));
  const pts: number[][] = [];
  for (let i = 0; i < n; i += step) pts.push([buf[i * 3], buf[i * 3 + 1], buf[i * 3 + 2]]);
  // Spread initial centres across the brightness range.
  const sorted = [...pts].sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  let centres = Array.from({ length: k }, (_, c) => [...sorted[Math.floor(((c + 0.5) / k) * sorted.length)]]);
  for (let iter = 0; iter < 8; iter++) {
    const sums = centres.map(() => [0, 0, 0, 0]);
    for (const p of pts) {
      const c = nearest(centres, p[0], p[1], p[2]);
      sums[c][0] += p[0];
      sums[c][1] += p[1];
      sums[c][2] += p[2];
      sums[c][3]++;
    }
    centres = sums.map((s, c) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : centres[c]));
  }
  return centres;
}
