export type CatMood = 'walk' | 'ask' | 'run' | 'sad';

interface Props {
  mood: CatMood;
}

// Fine fur strands over the body (x, y, angle).
const STRANDS: [number, number, number][] = [
  [70, 76, -30], [84, 70, -20], [98, 67, -10], [112, 66, 0], [126, 68, 10], [140, 74, 20],
  [64, 92, -40], [78, 88, -25], [150, 88, 25], [62, 108, -50], [148, 106, 35], [92, 120, -10], [120, 122, 10],
];

/** Whiskers, a golden Persian cat, drawn facing right with shaded, fur-textured rendering. */
export default function Cat({ mood }: Props) {
  const lidY = 1;
  return (
    <svg className={`cat cat--${mood}`} viewBox="0 0 220 170" width="220" height="170" aria-hidden="true">
      <defs>
        <radialGradient id="cat-body" cx="45%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffe7b3" />
          <stop offset="45%" stopColor="#f1bd6b" />
          <stop offset="80%" stopColor="#d4943f" />
          <stop offset="100%" stopColor="#a8692a" />
        </radialGradient>
        <radialGradient id="cat-head" cx="55%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffedc4" />
          <stop offset="55%" stopColor="#f0bb69" />
          <stop offset="100%" stopColor="#b97a30" />
        </radialGradient>
        <radialGradient id="cat-cream" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="70%" stopColor="#fff1d6" />
          <stop offset="100%" stopColor="#e9cf9f" />
        </radialGradient>
        <linearGradient id="cat-tail" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe2a4" />
          <stop offset="100%" stopColor="#c58635" />
        </linearGradient>
        <linearGradient id="cat-leg-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c48a3c" />
          <stop offset="100%" stopColor="#9a6127" />
        </linearGradient>
        <radialGradient id="cat-iris" cx="45%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#ffd27a" />
          <stop offset="55%" stopColor="#e0862a" />
          <stop offset="100%" stopColor="#7a3a0a" />
        </radialGradient>
        <radialGradient id="cat-ear-inner" cx="50%" cy="70%" r="70%">
          <stop offset="0%" stopColor="#f7c3c8" />
          <stop offset="100%" stopColor="#d98e86" />
        </radialGradient>
        <filter id="cat-fur" filterUnits="userSpaceOnUse" x="-10" y="-10" width="240" height="190">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="cat-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>

      <g className="cat-tail" filter="url(#cat-fur)">
        <path d="M58 98 C30 94 14 68 24 42 C28 30 42 26 48 36" fill="none" stroke="url(#cat-tail)" strokeWidth="30" strokeLinecap="round" />
        <path d="M34 40 C38 31 45 30 48 36" fill="none" stroke="#fff4dc" strokeWidth="12" strokeLinecap="round" opacity="0.9" />
      </g>

      {/* Far legs */}
      <g className="cat-leg cat-leg--b" filter="url(#cat-fur)">
        <rect x="70" y="102" width="17" height="44" rx="8" fill="url(#cat-leg-far)" />
        <ellipse cx="79" cy="147" rx="11" ry="6" fill="#e9cf9f" />
      </g>
      <g className="cat-leg cat-leg--a" filter="url(#cat-fur)">
        <rect x="136" y="102" width="17" height="44" rx="8" fill="url(#cat-leg-far)" />
        <ellipse cx="145" cy="147" rx="11" ry="6" fill="#e9cf9f" />
      </g>

      <g className="cat-body">
        <ellipse cx="108" cy="96" rx="62" ry="34" fill="url(#cat-body)" filter="url(#cat-fur)" />
        <ellipse cx="116" cy="112" rx="40" ry="16" fill="url(#cat-cream)" filter="url(#cat-fur)" opacity="0.95" />
        <g stroke="#fff3d6" strokeWidth="1.4" strokeLinecap="round" opacity="0.55">
          {STRANDS.map(([x, y, a], i) => (
            <line key={i} x1={x} y1={y} x2={x} y2={y + 9} transform={`rotate(${a} ${x} ${y})`} />
          ))}
        </g>
      </g>

      {/* Near legs */}
      <g className="cat-leg cat-leg--a" filter="url(#cat-fur)">
        <rect x="56" y="104" width="19" height="44" rx="9" fill="url(#cat-body)" />
        <ellipse cx="65" cy="149" rx="13" ry="7" fill="url(#cat-cream)" />
      </g>
      <g className="cat-leg cat-leg--b" filter="url(#cat-fur)">
        <rect x="148" y="104" width="19" height="44" rx="9" fill="url(#cat-body)" />
        <ellipse cx="157" cy="149" rx="13" ry="7" fill="url(#cat-cream)" />
      </g>

      <g className="cat-head">
        {/* Fluffy neck ruff */}
        <ellipse className="cat-ruff" cx="168" cy="84" rx="32" ry="24" fill="url(#cat-cream)" filter="url(#cat-fur)" />

        <g className="cat-ear cat-ear--back" filter="url(#cat-fur)">
          <path d="M146 40 Q146 14 166 26 Z" fill="#c58635" />
        </g>
        <g className="cat-ear cat-ear--front" filter="url(#cat-fur)">
          <path d="M170 28 Q186 8 194 36 Z" fill="#e3a653" />
          <path d="M175 29 Q185 16 189 33 Z" fill="url(#cat-ear-inner)" />
        </g>

        {/* Round, very fluffy head */}
        <ellipse cx="172" cy="56" rx="36" ry="33" fill="url(#cat-head)" filter="url(#cat-fur)" />
        {/* Cheek fluff and flat face */}
        <ellipse cx="160" cy="72" rx="16" ry="11" fill="url(#cat-cream)" filter="url(#cat-fur)" opacity="0.9" />
        <ellipse cx="190" cy="70" rx="15" ry="11" fill="url(#cat-cream)" filter="url(#cat-fur)" opacity="0.95" />

        <g className="cat-eyes">
          {[
            [168, 54],
            [190, 52],
          ].map(([x, y], i) => (
            <g key={i}>
              <ellipse cx={x} cy={y} rx="8.5" ry="8.5" fill="#3b2208" opacity="0.35" filter="url(#cat-soft)" />
              <circle cx={x} cy={y} r="7.6" fill="url(#cat-iris)" />
              <ellipse className="cat-pupil" cx={x + 0.6} cy={y + 0.4} rx={mood === 'run' ? 1.6 : 2.6} ry="5.6" fill="#140b03" />
              <circle cx={x + 2.6} cy={y - 3} r="2" fill="#fff" opacity="0.95" />
              <circle cx={x - 2.4} cy={y + 3} r="0.9" fill="#fff" opacity="0.7" />
              {/* Upper lid: droops when sad */}
              {mood === 'sad' ? (
                <path d={`M${x - 9} ${y - 1} Q${x} ${y - 9} ${x + 9} ${y - 1} L${x + 9} ${y - 10} L${x - 9} ${y - 10} Z`} fill="#e9b264" />
              ) : mood === 'run' ? (
                <path d={`M${x - 9} ${y - 4 - lidY} Q${x} ${y - 10} ${x + 9} ${y - 4 - lidY}`} fill="#e9b264" />
              ) : null}
            </g>
          ))}
          {mood === 'sad' && <path className="cat-tear" d="M196 60 q3 7 0 10 q-3 -3 0 -10 Z" fill="#9ddcff" opacity="0.9" />}
        </g>

        {/* Short Persian nose and mouth */}
        <path d="M184 62 q4 -2 8 0 q-4 5 -8 0 Z" fill="#d97c86" />
        <path d="M188 64 v4" stroke="#8a5420" strokeWidth="1.2" />
        {mood === 'sad' ? (
          <path d="M182 74 q6 -4 12 0" stroke="#8a5420" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        ) : mood === 'run' ? (
          <path d="M182 69 q6 9 12 0 Z" fill="#b5475b" />
        ) : (
          <path d="M183 68 q2.5 3 5 0 q2.5 3 5 0" stroke="#8a5420" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        )}
        <g stroke="#fffaf0" strokeWidth="0.9" strokeLinecap="round" opacity="0.85">
          <path d="M194 67 q12 -4 24 -8" fill="none" />
          <path d="M194 70 q12 0 24 2" fill="none" />
          <path d="M180 67 q-14 -3 -26 -7" fill="none" />
          <path d="M180 70 q-14 1 -26 4" fill="none" />
        </g>
      </g>
    </svg>
  );
}
