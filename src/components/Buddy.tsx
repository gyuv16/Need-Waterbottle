import { useEffect, useRef, useState, type ReactNode } from 'react';
import { FRAMES, headSrc, preloadLook, type Frame, type Look, type Mood } from '../characters';

const LINE = '#111111';

interface Props {
  mood: Mood;
  look: Look;
  /** Turn the head toward the mouse pointer while asking. */
  followPointer?: boolean;
}

// ---------------------------------------------------------------------------------------------
// Head: real head turns using the nine drawn directions, cross-faded, following the pointer.
// ---------------------------------------------------------------------------------------------

/** Direction frame for a pointer offset from the head centre (with a dead zone in the middle). */
function directionFor(dx: number, dy: number): Frame {
  if (Math.hypot(dx, dy) < 70) return 'd4';
  const a = (Math.atan2(dy, dx) * 180) / Math.PI; // 0 = right, 90 = down
  const sectors: Frame[] = ['d5', 'd8', 'd7', 'd6', 'd3', 'd0', 'd1', 'd2']; // every 45°, starting at "right"
  return sectors[Math.round(((a + 360) % 360) / 45) % 8];
}

/** For the photo face, a turn is shown as a gentle 3D rotation toward the same direction. */
const PHOTO_TURN: Record<Frame, string> = {
  d0: 'rotateY(-22deg) rotateX(12deg)', d1: 'rotateX(16deg)', d2: 'rotateY(22deg) rotateX(12deg)',
  d3: 'rotateY(-26deg)', d4: 'none', d5: 'rotateY(26deg)',
  d6: 'rotateY(-22deg) rotateX(-12deg)', d7: 'rotateX(-16deg)', d8: 'rotateY(22deg) rotateX(-12deg)', run: 'none',
};
const PHOTO_BADGE: Record<Mood, string> = { walk: '', ask: '💧', run: '🤩', sad: '😢' };

const TURN_STEP_MS = 70;

/**
 * Turn the head like an animator would: step through every in-between direction on the 3×3 grid
 * (e.g. left → front → right), one step every ~70 ms, instead of jumping or cross-fading.
 */
function useTurn(target: Frame): Frame {
  const [shown, setShown] = useState<Frame>(target);
  useEffect(() => {
    if (shown === target) return;
    // The star-struck face (and leaving it) is an expression change, not a turn: switch directly.
    if (target === 'run' || shown === 'run') {
      setShown(target);
      return;
    }
    const t = setTimeout(() => {
      const from = Number(shown.slice(1));
      const to = Number(target.slice(1));
      const r = Math.floor(from / 3) + Math.sign(Math.floor(to / 3) - Math.floor(from / 3));
      const c = (from % 3) + Math.sign((to % 3) - (from % 3));
      setShown(`d${r * 3 + c}` as Frame);
    }, TURN_STEP_MS);
    return () => clearTimeout(t);
  }, [shown, target]);
  return shown;
}

function Head({ mood, look, followPointer }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [tracked, setTracked] = useState<Frame>('d4');

  useEffect(() => preloadLook(look), [look]);

  // Follow the pointer while asking. The overlay forwards mouse moves even though it is click-through.
  useEffect(() => {
    if (!followPointer || mood !== 'ask') return;
    setTracked('d4');
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = ref.current?.getBoundingClientRect();
        if (r) setTracked(directionFor(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height * 0.55)));
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
    };
  }, [followPointer, mood]);

  // Walking in: looking where it's going. Asking: at you / your pointer. Yes: star-struck. No: looks away.
  const target: Frame = mood === 'walk' ? 'd5' : mood === 'run' ? 'run' : mood === 'sad' ? 'd6' : tracked;
  const frame = useTurn(target);

  if (look.photo) {
    return (
      <div ref={ref} className={`buddy-head buddy-head--photo buddy-head--${look.kind}`}>
        <div className="photo-face" style={{ transform: PHOTO_TURN[frame] }}>
          <img src={look.photo} alt="" draggable={false} />
        </div>
        {PHOTO_BADGE[mood] && <span key={mood} className="photo-badge">{PHOTO_BADGE[mood]}</span>}
      </div>
    );
  }
  return (
    <div ref={ref} className={`buddy-head buddy-head--${look.kind}`}>
      {FRAMES.map((f) => (
        <img
          key={f}
          data-frame={f}
          src={headSrc(look.id, f)}
          alt=""
          draggable={false}
          className={f === frame ? 'is-on' : ''}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Bodies
// ---------------------------------------------------------------------------------------------

function Limb({ d, fill, width = 8, cls, origin, children }: { d: string; fill: string; width?: number; cls: string; origin: string; children?: ReactNode }) {
  return (
    <g className={cls} style={{ transformOrigin: origin }}>
      <path d={d} fill="none" stroke={LINE} strokeWidth={width + 6} strokeLinecap="round" />
      <path d={d} fill="none" stroke={fill} strokeWidth={width} strokeLinecap="round" />
      {children}
    </g>
  );
}

function Bottle({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <rect x={x - 6} y={y - 20} width="12" height="24" rx="4" fill={color} stroke={LINE} strokeWidth="2.5" />
      <rect x={x - 4} y={y - 25} width="8" height="6" rx="2" fill="#f8fafc" stroke={LINE} strokeWidth="2" />
      <rect x={x - 3} y={y - 14} width="3" height="12" rx="1.5" fill="#ffffff" opacity="0.6" />
    </g>
  );
}

function Backpack({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <rect x={x - 14} y={y} width="26" height="34" rx="9" fill={color} stroke={LINE} strokeWidth="3" />
      <rect x={x - 9} y={y + 16} width="16" height="11" rx="4" fill="#000" opacity="0.15" />
    </g>
  );
}

function Scarf({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <rect x={x - 22} y={y} width="44" height="10" rx="5" fill={color} stroke={LINE} strokeWidth="2.5" />
      <path d={`M${x + 8} ${y + 8} l3 18 l9 -2 l-4 -16 Z`} fill={color} stroke={LINE} strokeWidth="2.5" strokeLinejoin="round" />
    </g>
  );
}

function BowTie({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g stroke={LINE} strokeWidth="2.2" strokeLinejoin="round">
      <path d={`M${x} ${y} l-11 -6 v12 Z`} fill={color} />
      <path d={`M${x} ${y} l11 -6 v12 Z`} fill={color} />
      <circle cx={x} cy={y} r="3" fill={color} />
    </g>
  );
}

function Tail({ look }: { look: Look }) {
  const { tail, fur, belly } = look;
  if (tail === 'none') return null;
  if (tail === 'stub') return <circle cx="38" cy="42" r="8" fill={fur} stroke={LINE} strokeWidth="3" />;
  if (tail === 'puff') return <circle cx="36" cy="42" r="10" fill={belly} stroke={LINE} strokeWidth="3" />;
  if (tail === 'curl')
    return (
      <g className="m-tail" style={{ transformOrigin: '40px 34px' }}>
        <path d="M40 34 C26 30 26 14 38 14 C46 14 46 24 38 24" fill="none" stroke={LINE} strokeWidth="11" strokeLinecap="round" />
        <path d="M40 34 C26 30 26 14 38 14 C46 14 46 24 38 24" fill="none" stroke={fur} strokeWidth="5" strokeLinecap="round" />
      </g>
    );
  const bushy = tail === 'bushy';
  return (
    <g className="m-tail" style={{ transformOrigin: '40px 42px' }}>
      <path d="M40 42 C14 44 4 26 12 6" fill="none" stroke={LINE} strokeWidth={bushy ? 22 : 14} strokeLinecap="round" />
      <path d="M40 42 C14 44 4 26 12 6" fill="none" stroke={fur} strokeWidth={bushy ? 16 : 8} strokeLinecap="round" />
      {bushy && <path d="M13 14 C11 10 11 8 12 6" fill="none" stroke={belly} strokeWidth="14" strokeLinecap="round" />}
    </g>
  );
}

function AnimalBody({ look }: { look: Look }) {
  const { fur, belly, accessory: acc, accessoryColor: ac } = look;
  // Torso top matches the width of the shoulders in the head art (head is shown 150px wide of 320).
  const hw = Math.max(34, Math.min(62, (look.shoulder * 150) / 320 / 2));
  const l = 80 - hw;
  const r = 80 + hw;
  const far = shade(fur, -0.18);
  return (
    <svg className="mascot-body" viewBox="0 0 160 84" width="160" height="84" aria-hidden="true">
      <Tail look={look} />
      {acc === 'backpack' && <Backpack x={l + 4} y={6} color={ac} />}
      <Limb cls="m-arm m-arm--b" origin={`${l + 8}px 10px`} d={`M${l + 8} 8 Q${l - 2} 24 ${l} 36`} fill={far}>
        <circle cx={l} cy="37" r="6" fill={belly} stroke={LINE} strokeWidth="3" />
      </Limb>
      <g className="m-leg m-leg--b" style={{ transformOrigin: '62px 46px' }}>
        <rect x="51" y="40" width="22" height="34" rx="10" fill={far} stroke={LINE} strokeWidth="3.5" />
        <ellipse cx="64" cy="75" rx="13" ry="7" fill={shade(belly, -0.1)} stroke={LINE} strokeWidth="3.5" />
      </g>
      <path
        d={`M${l} 2 Q80 -3 ${r} 2 Q${r + 9} 30 ${r - 4} 52 Q80 62 ${l + 4} 52 Q${l - 9} 30 ${l} 2 Z`}
        fill={fur}
        stroke={LINE}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      {belly !== fur && <ellipse cx="82" cy="22" rx={Math.min(24, hw - 10)} ry="20" fill={belly} />}
      {acc === 'backpack' && <path d={`M${l + 10} 4 Q${l + 22} 22 ${l + 16} 46`} fill="none" stroke={shade(ac, -0.25)} strokeWidth="5" strokeLinecap="round" />}
      {acc === 'scarf' && <Scarf x={80} y={0} color={ac} />}
      {acc === 'bowtie' && <BowTie x={80} y={6} color={ac} />}
      <g className="m-leg m-leg--a" style={{ transformOrigin: '98px 46px' }}>
        <rect x="87" y="40" width="22" height="34" rx="10" fill={fur} stroke={LINE} strokeWidth="3.5" />
        <ellipse cx="100" cy="75" rx="13" ry="7" fill={belly} stroke={LINE} strokeWidth="3.5" />
      </g>
      <Limb cls="m-arm m-arm--a" origin={`${r - 8}px 10px`} d={`M${r - 8} 8 Q${r + 4} 22 ${r + 2} 36`} fill={fur}>
        {acc === 'bottle' && <Bottle x={r + 4} y={38} color={ac} />}
        <circle cx={r + 2} cy="37" r="6" fill={belly} stroke={LINE} strokeWidth="3" />
      </Limb>
    </svg>
  );
}

function HumanBody({ look }: { look: Look }) {
  const { skin, outfit, accessory: acc, accessoryColor: ac } = look;
  const { style, top, bottom, shoes } = outfit;
  const topFar = shade(top, -0.15);
  const legFill = style === 'pants' ? bottom : skin;
  const legFar = style === 'pants' ? shade(bottom, -0.15) : shade(skin, -0.1);
  return (
    <svg className="mascot-body" viewBox="0 0 160 104" width="160" height="104" aria-hidden="true">
      {acc === 'backpack' && <Backpack x={46} y={14} color={ac} />}
      {/* Far arm and leg */}
      <Limb cls="m-arm m-arm--b" origin="54px 18px" d="M54 18 Q44 34 46 50" fill={topFar} width={11}>
        <circle cx="46" cy="52" r="6" fill={skin} stroke={LINE} strokeWidth="2.5" />
      </Limb>
      <g className="m-leg m-leg--b" style={{ transformOrigin: '70px 58px' }}>
        <rect x="62" y="56" width="16" height="36" rx="7" fill={legFar} stroke={LINE} strokeWidth="3" />
        <path d="M60 92 h20 q4 0 4 5 v3 h-26 v-3 q0 -5 2 -5 Z" fill={shade(shoes, -0.12)} stroke={LINE} strokeWidth="3" strokeLinejoin="round" />
      </g>
      {/* Neck */}
      <rect x="72" y="0" width="16" height="14" rx="5" fill={skin} stroke={LINE} strokeWidth="3" />
      {/* Torso: shirt or dress top */}
      <path d="M50 16 Q80 6 110 16 L108 58 Q80 64 52 58 Z" fill={top} stroke={LINE} strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M72 13 L80 22 L88 13" fill="none" stroke={LINE} strokeWidth="2.5" strokeLinejoin="round" />
      {style === 'skirt' && <path d="M52 54 Q80 60 108 54 L118 78 Q80 86 42 78 Z" fill={bottom} stroke={LINE} strokeWidth="3.5" strokeLinejoin="round" />}
      {style === 'dress' && <path d="M52 54 Q80 60 108 54 L120 82 Q80 90 40 82 Z" fill={top} stroke={LINE} strokeWidth="3.5" strokeLinejoin="round" />}
      {style === 'pants' && <path d="M52 56 Q80 62 108 56" fill="none" stroke={shade(bottom, -0.2)} strokeWidth="5" />}
      {acc === 'backpack' && <path d="M58 16 Q66 34 60 54" fill="none" stroke={shade(ac, -0.25)} strokeWidth="5" strokeLinecap="round" />}
      {acc === 'scarf' && <Scarf x={80} y={13} color={ac} />}
      {acc === 'bowtie' && <BowTie x={80} y={20} color={ac} />}
      {/* Near leg and arm */}
      <g className="m-leg m-leg--a" style={{ transformOrigin: '92px 58px' }}>
        <rect x="84" y="56" width="16" height="36" rx="7" fill={legFill} stroke={LINE} strokeWidth="3" />
        <path d="M82 92 h20 q4 0 4 5 v3 h-26 v-3 q0 -5 2 -5 Z" fill={shoes} stroke={LINE} strokeWidth="3" strokeLinejoin="round" />
      </g>
      <Limb cls="m-arm m-arm--a" origin="106px 18px" d="M106 18 Q118 32 116 50" fill={top} width={11}>
        {acc === 'bottle' && <Bottle x={118} y={52} color={ac} />}
        <circle cx="116" cy="52" r="6" fill={skin} stroke={LINE} strokeWidth="2.5" />
      </Limb>
    </svg>
  );
}

/** Lighten (amount > 0) or darken (amount < 0) a #rrggbb colour. */
function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(Math.min(255, Math.max(0, amount < 0 ? v * (1 + amount) : v + (255 - v) * amount)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** The full figure: drawn body (animal or human, in the chosen colours) with a turning head. */
export default function Buddy({ mood, look, followPointer = true }: Props) {
  return (
    <div className={`mascot buddy buddy--${look.kind} cat--${mood}`}>
      <div className="mascot-bob">
        {look.kind === 'human' ? <HumanBody look={look} /> : <AnimalBody look={look} />}
        <Head mood={mood} look={look} followPointer={followPointer} />
      </div>
    </div>
  );
}
