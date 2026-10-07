import walkHead from '../assets/mascot/cat-walk.webp';
import askHead from '../assets/mascot/cat-ask.webp';
import runHead from '../assets/mascot/cat-run.webp';
import sadHead from '../assets/mascot/cat-sad.webp';

export type CatMood = 'walk' | 'ask' | 'run' | 'sad';

interface Props {
  mood: CatMood;
}

// Head + expression art from page-mascot (MIT, see assets/mascot/LICENSE-page-mascot).
const HEADS: Record<CatMood, string> = { walk: walkHead, ask: askHead, run: runHead, sad: sadHead };

const FUR = '#303030';
const FUR_FAR = '#232323';
const WHITE = '#f3f3f3';
const LINE = '#111111';

/** Whiskers: a chibi tuxedo cat with a full body. The body is drawn to match the head art. */
export default function Cat({ mood }: Props) {
  return (
    <div className={`mascot mascot--cat cat--${mood}`}>
      <div className="mascot-bob">
        <svg className="mascot-body" viewBox="0 0 160 84" width="160" height="84" aria-hidden="true">
          {/* Tail */}
          <g className="m-tail" style={{ transformOrigin: '40px 42px' }}>
            <path d="M40 42 C14 44 4 26 12 6" fill="none" stroke={LINE} strokeWidth="14" strokeLinecap="round" />
            <path d="M40 42 C14 44 4 26 12 6" fill="none" stroke={FUR} strokeWidth="8" strokeLinecap="round" />
          </g>

          {/* Far arm and leg (in shadow) */}
          <g className="m-arm m-arm--b" style={{ transformOrigin: '44px 10px' }}>
            <path d="M44 8 Q34 24 36 36" fill="none" stroke={LINE} strokeWidth="14" strokeLinecap="round" />
            <path d="M44 8 Q34 24 36 36" fill="none" stroke={FUR_FAR} strokeWidth="8" strokeLinecap="round" />
            <circle cx="36" cy="37" r="6" fill={WHITE} stroke={LINE} strokeWidth="3" />
          </g>
          <g className="m-leg m-leg--b" style={{ transformOrigin: '62px 46px' }}>
            <rect x="51" y="40" width="22" height="34" rx="10" fill={FUR_FAR} stroke={LINE} strokeWidth="3.5" />
            <ellipse cx="64" cy="75" rx="13" ry="7" fill="#dcdcdc" stroke={LINE} strokeWidth="3.5" />
          </g>

          {/* Torso with white tuxedo bib */}
          <path d="M36 2 Q80 -3 124 2 Q133 30 120 52 Q80 62 40 52 Q27 30 36 2 Z" fill={FUR} stroke={LINE} strokeWidth="3.5" strokeLinejoin="round" />
          <ellipse cx="84" cy="20" rx="23" ry="21" fill={WHITE} />

          {/* Near leg and arm */}
          <g className="m-leg m-leg--a" style={{ transformOrigin: '98px 46px' }}>
            <rect x="87" y="40" width="22" height="34" rx="10" fill={FUR} stroke={LINE} strokeWidth="3.5" />
            <ellipse cx="100" cy="75" rx="13" ry="7" fill={WHITE} stroke={LINE} strokeWidth="3.5" />
          </g>
          <g className="m-arm m-arm--a" style={{ transformOrigin: '118px 10px' }}>
            <path d="M118 8 Q130 22 128 36" fill="none" stroke={LINE} strokeWidth="14" strokeLinecap="round" />
            <path d="M118 8 Q130 22 128 36" fill="none" stroke={FUR} strokeWidth="8" strokeLinecap="round" />
            <circle cx="128" cy="37" r="6" fill={WHITE} stroke={LINE} strokeWidth="3" />
          </g>
        </svg>
        <img className="mascot-head" src={HEADS[mood]} alt="" draggable={false} />
      </div>
    </div>
  );
}
