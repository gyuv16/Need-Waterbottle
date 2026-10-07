import { useEffect, useState } from 'react';
import { useVrmAvatar } from '../../vrm/useVrmAvatar';
import { FACING } from '../../vrm/facing';
import type { Emotion } from '../../vrm/expressions';

const EMOTIONS: { value: Emotion; label: string }[] = [
  { value: 'joy', label: '😄 Joy' },
  { value: 'sorrow', label: '😢 Sorrow' },
  { value: 'angry', label: '😠 Angry' },
  { value: 'fun', label: '😊 Fun' },
  { value: 'surprised', label: '😲 Surprised' },
  { value: 'neutral', label: '😐 Neutral' },
];

/** Live 3D preview in Settings: try reactions, expressions and the walk cycle. Head follows the pointer. */
export default function VrmPreview() {
  const [canvas, avatar, error] = useVrmAvatar(60);
  const [walking, setWalking] = useState(false);
  // Exposed for automated UI tests and debugging in DevTools.
  useEffect(() => {
    (window as unknown as { __vrmPreview?: unknown }).__vrmPreview = avatar;
  }, [avatar]);

  useEffect(() => {
    if (!avatar) return;
    const onMove = (e: MouseEvent) => {
      const r = canvas.current?.getBoundingClientRect();
      if (r) avatar.lookAtScreen(e.clientX - r.left, e.clientY - r.top);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [avatar, canvas]);

  const toggleWalk = () => {
    if (!avatar) return;
    const next = !walking;
    setWalking(next);
    avatar.face(next ? FACING.right : FACING.viewer);
    avatar.setSpeed(next ? 1 : 0);
  };

  const btn = 'rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-40';
  return (
    <div className="flex gap-4">
      <div className="relative h-[260px] w-[170px] shrink-0 overflow-hidden rounded-2xl bg-gradient-to-b from-sky-100 to-sky-300">
        <canvas ref={canvas} style={{ width: 170, height: 260 }} />
        {!avatar && (
          <div className="absolute inset-0 grid place-items-center p-3 text-center text-xs text-slate-500">{error ?? 'Loading 3D avatar…'}</div>
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600">Reactions</div>
          <div className="flex flex-wrap gap-1">
            <button className={btn} disabled={!avatar} onClick={() => avatar?.reactWave()}>👋 Wave</button>
            <button className={btn} disabled={!avatar} onClick={() => avatar?.reactSurprise()}>😲 Surprise</button>
            <button className={btn} disabled={!avatar} onClick={() => avatar?.reactThink()}>🤔 Think</button>
            <button className={btn} disabled={!avatar} onClick={toggleWalk}>{walking ? '⏹ Stop' : '🚶 Walk'}</button>
            <button className={btn} disabled={!avatar} onClick={() => avatar?.expressions.talk(1.5)}>💬 Talk</button>
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold text-slate-600">Expressions</div>
          <div className="flex flex-wrap gap-1">
            {EMOTIONS.map((e) => (
              <button key={e.value} className={btn} disabled={!avatar} onClick={() => avatar?.setExpression(e.value, e.value === 'neutral' ? 0 : 1, 0.3)}>
                {e.label}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-slate-500">Try “Wave” while walking: the arms react, the legs keep going. Move your mouse: head and eyes follow it.</p>
      </div>
    </div>
  );
}
