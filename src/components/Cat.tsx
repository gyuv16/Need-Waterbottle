import { furAlongCurve, furPatch, radial, type FurLayer } from './fur';

export type CatMood = 'walk' | 'ask' | 'run' | 'sad';

interface Props {
  mood: CatMood;
}

// Golden Persian coat, light → dark.
const GOLD = [
  { color: '#fff1cf', width: 1.2, opacity: 0.8 },
  { color: '#f7d593', width: 1.3, opacity: 0.8 },
  { color: '#ebb666', width: 1.4, opacity: 0.85 },
  { color: '#d4954a', width: 1.4, opacity: 0.85 },
  { color: '#a8692b', width: 1.5, opacity: 0.8 },
];
const CREAM = [
  { color: '#ffffff', width: 1.1, opacity: 0.85 },
  { color: '#fff3dc', width: 1.2, opacity: 0.85 },
  { color: '#f2d9a9', width: 1.3, opacity: 0.85 },
];
const SKIRT = [
  { color: '#fbe5bb', width: 1.3, opacity: 0.85 },
  { color: '#efcb8c', width: 1.4, opacity: 0.85 },
  { color: '#d9a660', width: 1.5, opacity: 0.85 },
];
const SHADOWED = [
  { color: '#d9a35a', width: 1.3, opacity: 0.8 },
  { color: '#b47a37', width: 1.4, opacity: 0.8 },
  { color: '#8d5826', width: 1.5, opacity: 0.8 },
];

// ---- Fur, generated once ----
const FUR = {
  tail: [
    ...furAlongCurve([54, 96], [26, 94], [10, 72], [14, 50], { count: 300, width: 30, length: 15, palette: GOLD, seed: 11 }),
    ...furAlongCurve([14, 50], [17, 34], [30, 26], [42, 30], { count: 140, width: 22, length: 12, palette: GOLD, seed: 12 }),
    ...furPatch({ cx: 38, cy: 30, rx: 8, ry: 6, count: 40, angle: radial(36, 32), length: 9, palette: CREAM, seed: 13 }),
  ],
  body: [
    ...furPatch({ cx: 110, cy: 98, rx: 58, ry: 34, count: 480, angle: 166, length: 10, palette: GOLD, seed: 1 }),
    ...furPatch({ cx: 110, cy: 96, rx: 60, ry: 36, count: 240, mode: 'edge', arc: [195, 345], angle: 192, length: 11, palette: GOLD, seed: 2, spread: 26 }),
    ...furPatch({ cx: 52, cy: 98, rx: 8, ry: 26, count: 90, mode: 'edge', arc: [110, 250], angle: 185, length: 12, palette: GOLD, seed: 4 }),
    ...furPatch({ cx: 164, cy: 106, rx: 18, ry: 22, count: 110, angle: 98, length: 13, palette: CREAM, seed: 5 }),
  ],
  skirt: furPatch({ cx: 108, cy: 102, rx: 56, ry: 34, count: 230, mode: 'edge', arc: [25, 155], angle: 98, length: 17, palette: SKIRT, seed: 3, spread: 30 }),
  ruff: [
    ...furPatch({ cx: 168, cy: 86, rx: 26, ry: 24, count: 160, angle: 104, length: 11, palette: CREAM, seed: 6 }),
    ...furPatch({ cx: 168, cy: 86, rx: 27, ry: 25, count: 220, mode: 'edge', arc: [40, 300], angle: radial(168, 80), length: 15, palette: CREAM, seed: 7 }),
  ],
  head: [
    ...furPatch({ cx: 188, cy: 60, rx: 27, ry: 25, count: 230, angle: radial(196, 66), length: 6, palette: GOLD, seed: 8 }),
    ...furPatch({ cx: 188, cy: 62, rx: 30, ry: 28, count: 220, mode: 'edge', arc: [110, 335], angle: radial(188, 64, -35), length: 7, palette: GOLD, seed: 9, spread: 30 }),
    ...furPatch({ cx: 194, cy: 80, rx: 20, ry: 8, count: 90, mode: 'edge', arc: [10, 170], angle: 96, length: 10, palette: CREAM, seed: 10 }),
  ],
  earTuft: furPatch({ cx: 198, cy: 36, rx: 5, ry: 6, count: 26, angle: -100, length: 9, palette: CREAM, seed: 14, spread: 40 }),
  thighNear: furPatch({ cx: 72, cy: 130, rx: 16, ry: 20, count: 120, angle: 112, length: 12, palette: GOLD, seed: 20 }),
  thighFar: furPatch({ cx: 86, cy: 130, rx: 15, ry: 19, count: 90, angle: 112, length: 11, palette: SHADOWED, seed: 21 }),
  armNear: furPatch({ cx: 157, cy: 130, rx: 12, ry: 17, count: 80, angle: 100, length: 10, palette: GOLD, seed: 22 }),
  armFar: furPatch({ cx: 170, cy: 130, rx: 11, ry: 16, count: 60, angle: 100, length: 10, palette: SHADOWED, seed: 23 }),
};

const Fur = ({ layers }: { layers: FurLayer[] }) => (
  <>
    {layers.map((l, i) => (
      <path key={i} d={l.d} stroke={l.color} strokeWidth={l.width} strokeOpacity={l.opacity} strokeLinecap="round" fill="none" />
    ))}
  </>
);

function Eye({ x, y, r, mood }: { x: number; y: number; r: number; mood: CatMood }) {
  const pupilW = mood === 'ask' ? r * 0.42 : mood === 'sad' ? r * 0.3 : r * 0.36;
  const fibers = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    return `M${x + Math.cos(a) * r * 0.38} ${y + Math.sin(a) * r * 0.38}L${x + Math.cos(a) * r * 0.92} ${y + Math.sin(a) * r * 0.92}`;
  }).join('');
  return (
    <g>
      <circle cx={x} cy={y + 0.6} r={r + 1.6} fill="#3a210a" opacity="0.18" />
      <circle cx={x} cy={y} r={r + 0.55} fill="#3a1f08" />
      <circle cx={x} cy={y} r={r} fill="url(#cat-iris)" />
      <path d={fibers} stroke="#7a3d0c" strokeWidth="0.45" opacity="0.45" />
      <circle cx={x} cy={y} r={r * 0.97} fill="none" stroke="#5a2c08" strokeWidth="0.9" opacity="0.7" />
      <ellipse className="cat-pupil" cx={x + r * 0.08} cy={y} rx={pupilW} ry={r * 0.84} fill="#0b0602" />
      <ellipse cx={x + r * 0.36} cy={y - r * 0.42} rx={r * 0.28} ry={r * 0.2} fill="#fff" opacity="0.95" transform={`rotate(-25 ${x + r * 0.36} ${y - r * 0.42})`} />
      <circle cx={x - r * 0.35} cy={y + r * 0.42} r={r * 0.1} fill="#fff" opacity="0.6" />
      {mood === 'sad' && (() => {
        // Upper eyelid: covers the top of the eye (more when sad), clipped to the eye shape.
        const lidY = y - r * 0.15;
        const clipId = `cat-eye-clip-${Math.round(x)}`;
        return (
          <g>
            <clipPath id={clipId}>
              <circle cx={x} cy={y} r={r + 0.7} />
            </clipPath>
            <g clipPath={`url(#${clipId})`}>
              <path d={`M${x - r - 2} ${lidY + 1.5} Q${x} ${lidY - r * 0.35} ${x + r + 2} ${lidY + 0.5} V${y - r - 2} H${x - r - 2} Z`} fill="#e7b066" />
              <path d={`M${x - r - 2} ${lidY + 1.5} Q${x} ${lidY - r * 0.35} ${x + r + 2} ${lidY + 0.5}`} stroke="#7a4a1c" strokeWidth="0.7" fill="none" />
            </g>
          </g>
        );
      })()}
    </g>
  );
}

/** A two-segment leg (upper leg + lower leg/paw) so the knee or elbow bends while walking. */
function Leg({
  cls, hip, knee, upper, lowerPath, paw, far, fur,
}: {
  cls: string;
  hip: [number, number];
  knee: [number, number];
  upper: [number, number, number, number];
  lowerPath: string;
  paw: [number, number];
  far?: boolean;
  fur: FurLayer[];
}) {
  const fill = far ? 'url(#cat-leg-far)' : 'url(#cat-leg)';
  return (
    <g className={`cat-leg ${cls}`} style={{ transformOrigin: `${hip[0]}px ${hip[1]}px` }}>
      <g className="cat-shin" style={{ transformOrigin: `${knee[0]}px ${knee[1]}px` }}>
        <path d={lowerPath} fill={fill} />
        <ellipse cx={paw[0]} cy={paw[1]} rx="11.5" ry="6.2" fill={far ? '#c99550' : '#f3d9a6'} />
        <path d={`M${paw[0] + 2} ${paw[1] - 3}v5M${paw[0] + 6} ${paw[1] - 2.5}v4.5M${paw[0] - 2} ${paw[1] - 3}v5`} stroke={far ? '#8d5826' : '#c99550'} strokeWidth="0.8" opacity="0.7" />
      </g>
      <ellipse cx={upper[0]} cy={upper[1]} rx={upper[2]} ry={upper[3]} fill={fill} />
      <Fur layers={fur} />
    </g>
  );
}

/** Whiskers, a golden Persian cat, drawn facing right with layered, procedurally generated fur. */
export default function Cat({ mood }: Props) {
  return (
    <svg className={`cat cat--${mood}`} viewBox="0 0 240 180" width="240" height="180" aria-hidden="true">
      <defs>
        <radialGradient id="cat-body" cx="50%" cy="22%" r="80%">
          <stop offset="0%" stopColor="#ffe9bd" />
          <stop offset="45%" stopColor="#efbe6e" />
          <stop offset="80%" stopColor="#cf8f42" />
          <stop offset="100%" stopColor="#a2652a" />
        </radialGradient>
        <linearGradient id="cat-shade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="50%" stopColor="#5a3008" stopOpacity="0" />
          <stop offset="100%" stopColor="#5a3008" stopOpacity="0.45" />
        </linearGradient>
        <radialGradient id="cat-head" cx="55%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffefcb" />
          <stop offset="55%" stopColor="#efbb69" />
          <stop offset="100%" stopColor="#b97a30" />
        </radialGradient>
        <radialGradient id="cat-cream" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#fff1d6" />
          <stop offset="100%" stopColor="#e6c99a" />
        </radialGradient>
        <linearGradient id="cat-leg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ebb463" />
          <stop offset="100%" stopColor="#bf8239" />
        </linearGradient>
        <linearGradient id="cat-leg-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bd8442" />
          <stop offset="100%" stopColor="#8c5826" />
        </linearGradient>
        <linearGradient id="cat-tail-base" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#cf8f42" />
          <stop offset="100%" stopColor="#f7d593" />
        </linearGradient>
        <radialGradient id="cat-iris" cx="45%" cy="40%" r="62%">
          <stop offset="0%" stopColor="#ffd77a" />
          <stop offset="45%" stopColor="#ef9a33" />
          <stop offset="80%" stopColor="#b9600f" />
          <stop offset="100%" stopColor="#6b2e06" />
        </radialGradient>
        <radialGradient id="cat-ear-inner" cx="50%" cy="75%" r="75%">
          <stop offset="0%" stopColor="#f6c4c2" />
          <stop offset="100%" stopColor="#c98579" />
        </radialGradient>
        <radialGradient id="cat-nose" cx="45%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#f2aaa8" />
          <stop offset="100%" stopColor="#c46f72" />
        </radialGradient>
      </defs>

      {/* Plumed tail */}
      <g className="cat-tail" style={{ transformOrigin: '54px 96px' }}>
        <path d="M54 96 C26 94 10 72 14 50 C17 34 30 26 42 30" fill="none" stroke="url(#cat-tail-base)" strokeWidth="18" strokeLinecap="round" />
        <Fur layers={FUR.tail} />
      </g>

      {/* Far legs (in shadow) */}
      <Leg cls="cat-leg--b" far hip={[86, 112]} knee={[82, 144]} upper={[86, 128, 15, 20]} lowerPath="M76 140 L90 140 L90 160 Q90 168 83 168 Q74 168 76 160 Z" paw={[85, 167]} fur={FUR.thighFar} />
      <Leg cls="cat-leg--a" far hip={[170, 112]} knee={[170, 142]} upper={[170, 128, 11, 17]} lowerPath="M164 140 L176 140 L176 160 Q176 168 170 168 Q162 168 164 160 Z" paw={[172, 167]} fur={FUR.armFar} />

      {/* Body */}
      <g className="cat-body">
        <path d="M48 96 C46 70 70 60 100 60 C130 58 158 62 172 78 C182 92 178 118 166 128 C150 138 120 140 96 138 C70 138 50 124 48 96 Z" fill="url(#cat-body)" />
        <path d="M48 96 C46 70 70 60 100 60 C130 58 158 62 172 78 C182 92 178 118 166 128 C150 138 120 140 96 138 C70 138 50 124 48 96 Z" fill="url(#cat-shade)" />
        <Fur layers={FUR.body} />
        <Fur layers={FUR.skirt} />
      </g>

      {/* Near legs */}
      <Leg cls="cat-leg--a" hip={[74, 112]} knee={[68, 144]} upper={[72, 128, 17, 22]} lowerPath="M60 140 L76 140 L76 160 Q76 168 68 168 Q58 168 60 160 Z" paw={[70, 167]} fur={FUR.thighNear} />
      <Leg cls="cat-leg--b" hip={[156, 112]} knee={[157, 142]} upper={[157, 128, 13, 18]} lowerPath="M150 140 L164 140 L164 160 Q164 168 157 168 Q148 168 150 160 Z" paw={[159, 167]} fur={FUR.armNear} />

      {/* Head with neck ruff */}
      <g className="cat-head" style={{ transformOrigin: '166px 86px' }}>
        <g className="cat-ruff">
          <ellipse cx="168" cy="86" rx="25" ry="23" fill="url(#cat-cream)" />
          <Fur layers={FUR.ruff} />
        </g>

        <g className="cat-ear cat-ear--back" style={{ transformOrigin: '164px 40px' }}>
          <path d="M154 44 Q154 22 172 32 Z" fill="#c38a45" />
          <path d="M158 40 Q158 28 168 33 Z" fill="#a8695e" opacity="0.6" />
        </g>
        <g className="cat-ear cat-ear--front" style={{ transformOrigin: '196px 38px' }}>
          <path d="M184 38 Q198 14 210 42 Z" fill="url(#cat-head)" />
          <path d="M189 37 Q198 22 205 40 Z" fill="url(#cat-ear-inner)" />
          <Fur layers={FUR.earTuft} />
        </g>

        <circle cx="188" cy="62" r="31" fill="url(#cat-head)" />
        <Fur layers={FUR.head} />

        {/* Flat Persian face */}
        <ellipse cx="206" cy="73" rx="13" ry="9" fill="url(#cat-cream)" />
        <path d="M194 63 Q200 70 206 68" stroke="#b07a3c" strokeWidth="2.2" fill="none" opacity="0.35" strokeLinecap="round" />
        <g className="cat-eyes">
          <Eye x={193} y={57} r={8.6} mood={mood} />
          <Eye x={212} y={56} r={6.8} mood={mood} />
          {mood === 'ask' && <path d="M186 45 Q193 41 200 44" stroke="#8a5420" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7" />}
          {mood === 'sad' && <path className="cat-tear" d="M199 64 q2.4 5 0 8 q-2.4 -3 0 -8 Z" fill="#a8e1ff" opacity="0.9" />}
        </g>

        {/* Nose, mouth, whisker pads */}
        <path d="M207 64 q4 -2.2 8 0 q-0.8 3.6 -4 5 q-3.2 -1.4 -4 -5 Z" fill="url(#cat-nose)" />
        <path d="M209 66.5 q0.8 0.8 1.6 0 M213 66.5 q-0.8 0.8 -1.6 0" stroke="#7a3b3e" strokeWidth="0.7" fill="none" />
        <path d="M211 69 v3.5" stroke="#8a5a3c" strokeWidth="0.9" />
        {mood === 'sad' ? (
          <path d="M205 77 q6 -3.5 12 0" stroke="#8a5a3c" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        ) : mood === 'run' ? (
          <path d="M205 73 q6 8 12 0 Z" fill="#9c4250" stroke="#6b2e2e" strokeWidth="0.8" />
        ) : (
          <path d="M206 72.5 q2.5 2.4 5 0 q2.5 2.4 5 0" stroke="#8a5a3c" strokeWidth="1" fill="none" strokeLinecap="round" />
        )}
        <g fill="#b98a5c" opacity="0.6">
          <circle cx="202" cy="72" r="0.6" /><circle cx="204" cy="74" r="0.6" /><circle cx="201" cy="75" r="0.6" />
          <circle cx="217" cy="71" r="0.6" /><circle cx="219" cy="73" r="0.6" />
        </g>
        <g stroke="#fffdf6" strokeWidth="0.6" strokeLinecap="round" fill="none" opacity="0.9">
          <path d="M216 71 q12 -5 24 -8" />
          <path d="M216 73 q12 -1 24 0" />
          <path d="M216 75 q11 3 22 7" />
          <path d="M201 72 q-14 -4 -28 -6" />
          <path d="M201 74 q-14 0 -28 2" />
          <path d="M193 47 q4 -8 10 -12" strokeWidth="0.5" />
        </g>
      </g>
    </svg>
  );
}
