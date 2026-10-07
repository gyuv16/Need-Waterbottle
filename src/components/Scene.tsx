import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type TransitionEvent } from 'react';
import Cat, { type CatMood } from './Cat';
import Mouse, { type MouseMood } from './Mouse';
import { ANSWER_TIMEOUT_MS, ASK_AT_STEP, CHASE_SPEED, STEP_MS, TOTAL_STEPS } from '../config';

type Phase = 'enter' | 'ask' | 'yes' | 'no';

interface Move {
  x: number;
  ms: number;
  delay?: number;
}

const CAT_W = 240;
const MOUSE_W = 120;

interface Props {
  onFinish: () => void;
}

function setClickable(clickable: boolean) {
  window.waterBuddy?.setClickable(clickable);
}

export default function Scene({ onFinish }: Props) {
  const width = window.innerWidth;
  const stepPx = (width + CAT_W) / TOTAL_STEPS;
  const askX = -CAT_W + ASK_AT_STEP * stepPx;
  const mouseHomeX = Math.max(askX - MOUSE_W + 10, 12);

  const [phase, setPhase] = useState<Phase>('enter');
  const [cat, setCat] = useState<Move>({ x: -CAT_W, ms: 0 });
  const [mouse, setMouse] = useState<Move>({ x: mouseHomeX, ms: 0 });
  const finished = useRef(false);

  // Walk in: start off-screen, then glide to the asking spot on the next frame.
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setCat({ x: askX, ms: ASK_AT_STEP * STEP_MS })),
    );
    return () => cancelAnimationFrame(id);
  }, [askX]);

  const answer = useCallback(
    (yes: boolean) => {
      setClickable(false);
      if (yes) {
        const mouseEnd = width + 140;
        const catEnd = width + 60;
        setMouse({ x: mouseEnd, ms: ((mouseEnd - mouseHomeX) / (CHASE_SPEED * 1.25)) * 1000 });
        setCat({ x: catEnd, ms: ((catEnd - askX) / CHASE_SPEED) * 1000, delay: 350 });
        setPhase('yes');
      } else {
        const homeX = -CAT_W - 40;
        const steps = (askX - homeX) / stepPx;
        setCat({ x: homeX, ms: steps * STEP_MS * 1.6, delay: 600 });
        setPhase('no');
      }
    },
    [askX, mouseHomeX, stepPx, width],
  );

  // No answer in time: Whiskers gives up and walks home.
  useEffect(() => {
    if (phase !== 'ask') return;
    const t = setTimeout(() => answer(false), ANSWER_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [phase, answer]);

  useEffect(() => () => setClickable(false), []);

  const onCatMoved = (e: TransitionEvent) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return;
    if (phase === 'enter') setPhase('ask');
    else if (!finished.current) {
      finished.current = true;
      onFinish();
    }
  };

  const catMood: CatMood = phase === 'enter' ? 'walk' : phase === 'ask' ? 'ask' : phase === 'yes' ? 'run' : 'sad';
  const mouseMood: MouseMood = phase === 'yes' ? 'run' : phase === 'no' ? 'hide' : 'peek';

  const moveStyle = (m: Move, extra?: CSSProperties): CSSProperties => ({
    transform: `translateX(${m.x}px)`,
    transition: m.ms ? `transform ${m.ms}ms linear ${m.delay ?? 0}ms` : 'none',
    ...extra,
  });

  return (
    <div className="scene" style={{ '--step': `${STEP_MS}ms` } as CSSProperties}>
      {phase !== 'enter' && (
        <div className="actor actor--mouse" style={moveStyle(mouse)}>
          <Mouse mood={mouseMood} />
          {phase === 'yes' && <div className="mini-bubble">Catch me! 🧀</div>}
        </div>
      )}

      <div className="actor actor--cat" style={moveStyle(cat)} onTransitionEnd={onCatMoved}>
        {phase === 'ask' && (
          <div
            className="bubble bubble--ask"
            onMouseEnter={() => setClickable(true)}
            onMouseLeave={() => setClickable(false)}
          >
            <p>Did you drink water? 💧</p>
            <div className="bubble-actions">
              <button className="btn btn--yes" onClick={() => answer(true)}>Yes</button>
              <button className="btn btn--no" onClick={() => answer(false)}>No</button>
            </div>
          </div>
        )}
        {phase === 'yes' && <div className="bubble bubble--short">Here I come! 💨</div>}
        {phase === 'no' && <div className="bubble bubble--short bubble--sad">Oh… okay. Please drink some soon.</div>}
        <div className={`cat-facing ${phase === 'no' ? 'cat-facing--left' : ''}`}>
          <Cat mood={catMood} />
        </div>
        <div className={`ground-shadow ${phase === 'yes' ? 'ground-shadow--run' : ''}`} />
      </div>
    </div>
  );
}
