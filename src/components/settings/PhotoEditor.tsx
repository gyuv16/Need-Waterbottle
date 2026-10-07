import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { FACE_ASPECT, detectFaceAndHair, guessFaceBox, stylize, type Box, type PhotoStyle } from './photo';

export const STYLE_OPTIONS: { value: PhotoStyle; label: string }[] = [
  { value: 'anime', label: '🌸 Anime' },
  { value: 'comic', label: '✏️ Comic' },
  { value: 'none', label: '📷 Original' },
];

const VW = 200; // editor viewport (oval), px
const VH = Math.round(VW / FACE_ASPECT);
const OW = 236; // saved image size (2× the on-screen head)
const OH = Math.round(OW / FACE_ASPECT);

interface Props {
  file: File;
  style: PhotoStyle;
  onCancel: () => void;
  onSave: (result: { photo: string; original: string; style: PhotoStyle }) => void;
}

type Status = 'loading' | 'detecting' | 'found' | 'manual' | 'error';

/**
 * Turn any photo into a face for the figure: the face and hair are found and cropped
 * automatically, then cartoonised. Drag / zoom to adjust.
 */
export default function PhotoEditor({ file, style: initialStyle, onCancel, onSave }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [style, setStyle] = useState<PhotoStyle>(initialStyle);
  const editor = useRef<HTMLCanvasElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  /** Set zoom/offset so that `box` (image pixels) exactly fills the oval. */
  const fitBox = useCallback((image: HTMLImageElement, box: Box) => {
    const cover = Math.max(VW / image.width, VH / image.height);
    const s = VW / box.w;
    const z = Math.min(8, Math.max(1, s / cover));
    const scale = cover * z;
    const w = image.width * scale;
    const h = image.height * scale;
    setZoom(z);
    setOffset({ x: -box.x * scale - (VW - w) / 2, y: -box.y * scale - (VH - h) / 2 });
  }, []);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = async () => {
      setImg(image);
      setStatus('detecting');
      const box = await detectFaceAndHair(image);
      fitBox(image, box ?? guessFaceBox(image));
      setStatus(box ? 'found' : 'manual');
    };
    image.onerror = () => setStatus('error');
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file, fitBox]);

  /** Draw the current crop into a canvas of the given size (optionally oval-masked). */
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number, oval: boolean) => {
      if (!img) return;
      const cover = Math.max(VW / img.width, VH / img.height) * zoom;
      const k = w / VW;
      const iw = img.width * cover * k;
      const ih = img.height * cover * k;
      ctx.clearRect(0, 0, w, h);
      ctx.save();
      if (oval) {
        ctx.beginPath();
        ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.clip();
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, (w - iw) / 2 + offset.x * k, (h - ih) / 2 + offset.y * k, iw, ih);
      ctx.restore();
    },
    [img, zoom, offset],
  );

  /** Final face image: crop → style (anime / comic / original) → oval mask. */
  const render = useCallback(
    (w: number, h: number, look: PhotoStyle) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      if (!ctx) return c;
      draw(ctx, w, h, false);
      stylize(ctx, w, h, look);
      ctx.globalCompositeOperation = 'destination-in';
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      return c;
    },
    [draw],
  );

  // Live editor (raw photo) and a debounced preview of the finished face.
  useEffect(() => {
    const ctx = editor.current?.getContext('2d');
    if (ctx) draw(ctx, VW, VH, false);
    const t = setTimeout(() => {
      const p = preview.current?.getContext('2d');
      if (!p || !img) return;
      p.clearRect(0, 0, 118, 136);
      p.drawImage(render(118 * 2, 136 * 2, style), 0, 0, 118, 136);
    }, 150);
    return () => clearTimeout(t);
  }, [draw, render, style, img]);

  const onDown = (e: PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMove = (e: PointerEvent) => {
    if (!drag.current) return;
    setOffset({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y });
  };
  const onUp = () => (drag.current = null);

  const save = () =>
    onSave({
      photo: render(OW, OH, style).toDataURL('image/png'),
      original: render(OW, OH, 'none').toDataURL('image/png'),
      style,
    });

  if (status === 'error') {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
        That file could not be opened as an image. Try a JPG, PNG or WebP photo.
        <button className="ml-3 font-semibold underline" onClick={onCancel}>OK</button>
      </div>
    );
  }

  const message = {
    loading: 'Opening photo…',
    detecting: 'Finding your face…',
    found: 'Face and hair found ✓ Drag or zoom to adjust.',
    manual: "Couldn't spot a face automatically. Drag and zoom so your face and hair fill the oval.",
  }[status];

  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-6">
        <div
          className="relative cursor-grab touch-none overflow-hidden border-4 border-slate-900 bg-white active:cursor-grabbing"
          style={{ width: VW + 8, height: VH + 8, borderRadius: '50%' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <canvas ref={editor} width={VW} height={VH} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <canvas ref={preview} width={118} height={136} className="rounded-[50%] border-4 border-slate-900 bg-white" />
          <span className="text-xs font-semibold text-slate-500">Result</span>
        </div>
      </div>
      <p className={`text-center text-xs ${status === 'found' ? 'text-emerald-700' : 'text-slate-500'}`}>{message}</p>
      <label className="flex w-full max-w-xs items-center gap-3 text-sm">
        <span>🔍</span>
        <input type="range" min={1} max={8} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1" aria-label="Zoom" />
      </label>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200/70 p-1 text-sm">
        {STYLE_OPTIONS.map((o) => (
          <button
            key={o.value}
            onClick={() => setStyle(o.value)}
            className={`rounded-lg px-3 py-1.5 font-semibold ${style === o.value ? 'bg-white text-sky-700 shadow' : 'text-slate-600 hover:text-slate-800'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-sky-700 disabled:opacity-50"
          onClick={save}
          disabled={!img || status === 'detecting'}
        >
          Use this face
        </button>
      </div>
    </div>
  );
}
