// Offline photo → anime portrait. Finds the face, crops a square head-and-shoulders portrait around it,
// and runs the AnimeGANv2 model on this computer (via the main process). Nothing leaves the computer.
import { detectFaceAndHair, guessFaceBox } from './photo';

const SIZE = 512;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That file could not be opened as an image.'));
    img.src = url;
  });
}

/** Square crop with the face (and hair) in the upper-middle, plus some shoulders for context. */
async function portraitSquare(img: HTMLImageElement) {
  const face = (await detectFaceAndHair(img)) ?? guessFaceBox(img);
  const side = Math.min(img.width, img.height, Math.max(face.w, face.h) * 1.45);
  const cx = face.x + face.w / 2;
  const top = face.y - (side - face.h) * 0.3;
  return {
    x: Math.max(0, Math.min(img.width - side, cx - side / 2)),
    y: Math.max(0, Math.min(img.height - side, top)),
    side,
  };
}

/** Run the offline anime model on a photo. Returns a PNG data URL. */
export async function animeOffline(file: File): Promise<string> {
  const img = await loadImage(file);
  URL.revokeObjectURL(img.src);
  const sq = await portraitSquare(img);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('No canvas available.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sq.x, sq.y, sq.side, sq.side, 0, 0, SIZE, SIZE);

  // RGBA bytes → Float32 CHW in [-1, 1], the layout the model expects.
  const px = ctx.getImageData(0, 0, SIZE, SIZE).data;
  const plane = SIZE * SIZE;
  const input = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    input[i] = px[i * 4] / 127.5 - 1;
    input[plane + i] = px[i * 4 + 1] / 127.5 - 1;
    input[2 * plane + i] = px[i * 4 + 2] / 127.5 - 1;
  }

  const res = await window.waterBuddy.animeLocal(input);
  if (!res.ok || !res.pixels) throw new Error(res.error ?? 'The anime model failed.');

  const out = ctx.createImageData(SIZE, SIZE);
  const o = res.pixels;
  const c = (v: number) => Math.max(0, Math.min(255, (v + 1) * 127.5));
  for (let i = 0; i < plane; i++) {
    out.data[i * 4] = c(o[i]);
    out.data[i * 4 + 1] = c(o[plane + i]);
    out.data[i * 4 + 2] = c(o[2 * plane + i]);
    out.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(out, 0, 0);
  return canvas.toDataURL('image/png');
}
