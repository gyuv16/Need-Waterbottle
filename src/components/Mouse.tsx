export type MouseMood = 'peek' | 'run' | 'hide';

interface Props {
  mood: MouseMood;
}

/** Pip, a white mouse with big ears, drawn facing right with shaded, fur-textured rendering. */
export default function Mouse({ mood }: Props) {
  return (
    <svg className={`mouse mouse--${mood}`} viewBox="0 -6 120 86" width="120" height="86" aria-hidden="true">
      <defs>
        <radialGradient id="mouse-fur" cx="45%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#f1f1f4" />
          <stop offset="100%" stopColor="#c9c9d2" />
        </radialGradient>
        <radialGradient id="mouse-ear" cx="50%" cy="55%" r="60%">
          <stop offset="0%" stopColor="#ffd3dc" />
          <stop offset="70%" stopColor="#f3a5b6" />
          <stop offset="100%" stopColor="#e6dfe6" />
        </radialGradient>
        <linearGradient id="mouse-tail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#f0b9c4" />
          <stop offset="100%" stopColor="#f6cbd3" />
        </linearGradient>
        <radialGradient id="mouse-eye" cx="40%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#ff6b8e" />
          <stop offset="60%" stopColor="#b5123d" />
          <stop offset="100%" stopColor="#4a0618" />
        </radialGradient>
        <filter id="mouse-furtex" filterUnits="userSpaceOnUse" x="-10" y="-16" width="140" height="106">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>

      <path className="mouse-tail" d="M26 54 C10 56 2 44 8 34 C12 26 6 20 1 23" fill="none" stroke="url(#mouse-tail)" strokeWidth="3.2" strokeLinecap="round" />
      <g className="mouse-leg mouse-leg--a"><ellipse cx="40" cy="70" rx="7" ry="3.6" fill="#f2b3c0" /></g>
      <g className="mouse-leg mouse-leg--b"><ellipse cx="64" cy="70" rx="7" ry="3.6" fill="#f2b3c0" /></g>

      <g className="mouse-body" filter="url(#mouse-furtex)">
        <ellipse cx="52" cy="52" rx="32" ry="19" fill="url(#mouse-fur)" />
      </g>

      <g className="mouse-head">
        {/* Big translucent ears */}
        <g className="mouse-ear">
          <ellipse cx="70" cy="18" rx="19" ry="20" fill="#ececf1" />
          <ellipse cx="70" cy="19" rx="14" ry="15" fill="url(#mouse-ear)" />
          <path d="M70 8 q-3 9 0 20 M64 12 q2 6 4 12" stroke="#e48a9e" strokeWidth="0.8" fill="none" opacity="0.6" />
        </g>
        <g filter="url(#mouse-furtex)">
          <ellipse cx="85" cy="42" rx="19" ry="17" fill="url(#mouse-fur)" />
          <path d="M96 36 q12 6 14 10 q-8 4 -16 2 Z" fill="url(#mouse-fur)" />
        </g>
        <g className="mouse-ear">
          <ellipse cx="96" cy="14" rx="18" ry="19" fill="#f4f4f7" />
          <ellipse cx="96" cy="15" rx="13" ry="14" fill="url(#mouse-ear)" />
          <path d="M96 5 q3 9 0 19 M102 9 q-2 6 -4 12" stroke="#e48a9e" strokeWidth="0.8" fill="none" opacity="0.6" />
        </g>
        <circle className="mouse-eye" cx="92" cy="38" r="4.4" fill="url(#mouse-eye)" />
        <circle cx="93.4" cy="36.4" r="1.4" fill="#fff" />
        <circle cx="110" cy="45" r="3" fill="#ef8ea2" />
        {mood === 'run' ? (
          <path d="M98 50 q4 4 8 0" stroke="#b07a86" strokeWidth="1.4" fill="#fff" />
        ) : (
          <path d="M100 51 q3 2 6 0" stroke="#b07a86" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        )}
        <g stroke="#9a9aa6" strokeWidth="0.7" strokeLinecap="round" opacity="0.8">
          <path d="M106 46 q8 -4 14 -6" fill="none" />
          <path d="M106 48 q8 0 14 3" fill="none" />
        </g>
      </g>
    </svg>
  );
}
