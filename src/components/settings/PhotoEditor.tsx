import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';

const OUT = 256; // output size of the avatar image (px)
const VIEW = 220; // on-screen editor size (px)

interface Props {
  file: File;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}

/** Crop any photo into a round avatar: drag to position, slider to zoom. */
export default function PhotoEditor({ file, onCancel, onSave }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setImg(image);
    image.onerror = () => setError('That file could not be opened as an image. Try a JPG, PNG or WebP photo.');
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /** Draw the photo into a square canvas of `size`, scaled to cover it, then zoomed and shifted. */
  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, size: number, round: boolean) => {
      if (!img) return;
      const cover = Math.max(size / img.width, size / img.height) * zoom;
      const w = img.width * cover;
      const h = img.height * cover;
      const k = size / VIEW;
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      if (round) {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
      }
      ctx.drawImage(img, (size - w) / 2 + offset.x * k, (size - h) / 2 + offset.y * k, w, h);
      ctx.restore();
    },
    [img, zoom, offset],
  );

  useEffect(() => {
    const ctx = canvas.current?.getContext('2d');
    if (ctx) draw(ctx, VIEW, false);
  }, [draw]);

  const onDown = (e: PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onMove = (e: PointerEvent) => {
    if (!drag.current) return;
    setOffset({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y });
  };
  const onUp = () => (drag.current = null);

  const save = () => {
    const out = document.createElement('canvas');
    out.width = OUT;
    out.height = OUT;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    draw(ctx, OUT, true);
    onSave(out.toDataURL('image/png'));
  };

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
        {error}
        <button className="ml-3 font-semibold underline" onClick={onCancel}>OK</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl bg-slate-50 p-4">
      <div
        className="relative cursor-grab touch-none overflow-hidden rounded-full border-4 border-slate-900 bg-white active:cursor-grabbing"
        style={{ width: VIEW, height: VIEW }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <canvas ref={canvas} width={VIEW} height={VIEW} />
        {!img && <div className="absolute inset-0 grid place-items-center text-sm text-slate-400">Loading…</div>}
      </div>
      <p className="text-xs text-slate-500">Drag the photo to position your face, then zoom.</p>
      <label className="flex w-full max-w-xs items-center gap-3 text-sm">
        <span>🔍</span>
        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="flex-1"
          aria-label="Zoom"
        />
      </label>
      <div className="flex gap-2">
        <button className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200" onClick={onCancel}>
          Cancel
        </button>
        <button
          className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-sky-700 disabled:opacity-50"
          onClick={save}
          disabled={!img}
        >
          Use this photo
        </button>
      </div>
    </div>
  );
}
