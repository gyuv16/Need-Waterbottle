import peekHead from '../assets/mascot/mouse-peek.webp';
import runHead from '../assets/mascot/mouse-run.webp';
import hideHead from '../assets/mascot/mouse-hide.webp';

export type MouseMood = 'peek' | 'run' | 'hide';

interface Props {
  mood: MouseMood;
}

// Head + expression art from page-mascot (MIT, see assets/mascot/LICENSE-page-mascot).
const HEADS: Record<MouseMood, string> = { peek: peekHead, run: runHead, hide: hideHead };

const FUR = '#a89c90';
const FUR_FAR = '#8f8478';
const BELLY = '#f0d8c0';
const PINK = '#f2aaa6';
const LINE = '#111111';

/** Pip: a chibi mouse with big ears and a full body. */
export default function Mouse({ mood }: Props) {
  return (
    <div className={`mascot mascot--mouse mouse--${mood}`}>
      <div className="mascot-bob">
        <svg className="mascot-body" viewBox="0 0 100 56" width="100" height="56" aria-hidden="true">
          <g className="m-tail" style={{ transformOrigin: '32px 30px' }}>
            <path d="M32 30 C10 34 2 22 8 10 C11 4 6 0 2 3" fill="none" stroke={LINE} strokeWidth="6" strokeLinecap="round" />
            <path d="M32 30 C10 34 2 22 8 10 C11 4 6 0 2 3" fill="none" stroke={PINK} strokeWidth="2.6" strokeLinecap="round" />
          </g>
          <g className="m-leg m-leg--b" style={{ transformOrigin: '40px 30px' }}>
            <rect x="33" y="26" width="14" height="20" rx="7" fill={FUR_FAR} stroke={LINE} strokeWidth="3" />
            <ellipse cx="41" cy="48" rx="9" ry="5" fill={PINK} stroke={LINE} strokeWidth="3" />
          </g>
          <path d="M29 2 Q50 -2 71 2 Q78 22 68 36 Q50 42 32 36 Q22 22 29 2 Z" fill={FUR} stroke={LINE} strokeWidth="3" strokeLinejoin="round" />
          <ellipse cx="52" cy="17" rx="13" ry="13" fill={BELLY} />
          <g className="m-leg m-leg--a" style={{ transformOrigin: '60px 30px' }}>
            <rect x="53" y="26" width="14" height="20" rx="7" fill={FUR} stroke={LINE} strokeWidth="3" />
            <ellipse cx="62" cy="48" rx="9" ry="5" fill={PINK} stroke={LINE} strokeWidth="3" />
          </g>
          <g className="m-arm m-arm--a" style={{ transformOrigin: '68px 8px' }}>
            <path d="M68 7 Q77 16 75 26" fill="none" stroke={LINE} strokeWidth="9" strokeLinecap="round" />
            <path d="M68 7 Q77 16 75 26" fill="none" stroke={FUR} strokeWidth="4.5" strokeLinecap="round" />
            <circle cx="75" cy="27" r="3.6" fill={PINK} stroke={LINE} strokeWidth="2" />
          </g>
        </svg>
        <img className="mascot-head" src={HEADS[mood]} alt="" draggable={false} />
      </div>
    </div>
  );
}
