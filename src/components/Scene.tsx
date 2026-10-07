import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type TransitionEvent } from 'react';
import Buddy from './Buddy';
import VrmBuddy, { VRM_W } from './VrmBuddy';
import { resolveLook, type Mood } from '../characters';
import Mouse, { type MouseMood } from './Mouse';
import { CHASE_SPEED, TOTAL_STEPS } from '../config';
import { STEP_MS_BY_SPEED, type AppState } from '../shared/settings';

type Phase = 'enter' | 'ask' | 'yes' | 'no';

interface Move {
  x: number;
  ms: number;
  delay?: number;
  ease?: string;
}

// Natural motion: settle into the stop, set off gently, burst into the chase.
const EASE_ARRIVE = 'cubic-bezier(0.25, 0.1, 0.3, 1)';
const EASE_LEAVE = 'cubic-bezier(0.45, 0, 0.85, 0.6)';
const EASE_DASH = 'cubic-bezier(0.5, 0, 0.75, 0.4)';

const MOUSE_W = 100;

interface Props {
  state: AppState;
  onFinish: () => void;
}

function setClickable(clickable: boolean) {
  window.waterBuddy?.setClickable(clickable);
}

export default function Scene({ state, onFinish }: Props) {
  // Settings are read once when the scene starts, so a change mid-walk can't make Whiskers jump.
  const [cfg] = useState(() => ({
    stepMs: STEP_MS_BY_SPEED[state.settings.walkSpeed],
    askAtStep: state.settings.askAtStep,
    timeoutMs: state.settings.answerTimeoutSec * 1000,
    showMouse: state.settings.showMouse,
    look: resolveLook(state.settings),
  }));
  const { stepMs: STEP_MS, askAtStep: ASK_AT_STEP } = cfg;
  const isVrm = cfg.look.kind === 'vrm';
  const CAT_W = isVrm ? VRM_W : 160;
  const { drank } = state.stats;
  const goal = state.settings.dailyGoal;
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
      requestAnimationFrame(() => setCat({ x: askX, ms: ASK_AT_STEP * STEP_MS, ease: EASE_ARRIVE })),
    );
    return () => cancelAnimationFrame(id);
  }, [askX]);

  const answer = useCallback(
    (yes: boolean) => {
      setClickable(false);
      window.waterBuddy?.recordAnswer?.(yes);
      if (yes) {
        const mouseEnd = width + 140;
        const catEnd = width + 60;
        setMouse({ x: mouseEnd, ms: ((mouseEnd - mouseHomeX) / (CHASE_SPEED * 1.25)) * 1000, ease: EASE_DASH });
        setCat({ x: catEnd, ms: ((catEnd - askX) / CHASE_SPEED) * 1000, delay: 350, ease: EASE_DASH });
        setPhase('yes');
      } else {
        const homeX = -CAT_W - 40;
        const steps = (askX - homeX) / stepPx;
        setCat({ x: homeX, ms: steps * STEP_MS * 1.6, delay: 600, ease: EASE_LEAVE });
        setPhase('no');
      }
    },
    [askX, mouseHomeX, stepPx, width, STEP_MS],
  );

  // No answer in time: Whiskers gives up and walks home.
  useEffect(() => {
    if (phase !== 'ask') return;
    const t = setTimeout(() => answer(false), cfg.timeoutMs);
    return () => clearTimeout(t);
  }, [phase, answer, cfg.timeoutMs]);

  useEffect(() => () => setClickable(false), []);

  const onCatMoved = (e: TransitionEvent) => {
    if (e.target !== e.currentTarget || e.propertyName !== 'transform') return;
    if (phase === 'enter') setPhase('ask');
    else if (!finished.current) {
      finished.current = true;
      onFinish();
    }
  };

  const catMood: Mood = phase === 'enter' ? 'walk' : phase === 'ask' ? 'ask' : phase === 'yes' ? 'run' : 'sad';
  const mouseMood: MouseMood = phase === 'yes' ? 'run' : phase === 'no' ? 'hide' : 'peek';

  const moveStyle = (m: Move, extra?: CSSProperties): CSSProperties => ({
    transform: `translateX(${m.x}px)`,
    transition: m.ms ? `transform ${m.ms}ms ${m.ease ?? 'linear'} ${m.delay ?? 0}ms` : 'none',
    ...extra,
  });

  return (
    <div className="scene" style={{ '--step': `${STEP_MS}ms` } as CSSProperties}>
      {phase !== 'enter' && cfg.showMouse && (
        <div className="actor actor--mouse" style={moveStyle(mouse)}>
          <Mouse mood={mouseMood} />
          {phase === 'yes' && <div className="mini-bubble">Catch me! 🧀</div>}
        </div>
      )}

      <div className={`actor actor--cat ${isVrm ? 'actor--vrm' : ''}`} style={moveStyle(cat)} onTransitionEnd={onCatMoved}>
        {phase === 'ask' && (
          <div
            className="bubble bubble--ask"
            onMouseEnter={() => setClickable(true)}
            onMouseLeave={() => setClickable(false)}
          >
            <p>Did you drink water? 💧</p>
            <small className="bubble-progress">
              {drank} of {goal} glasses today
            </small>
            <div className="bubble-actions">
              <button className="btn btn--yes" onClick={() => answer(true)}>Yes</button>
              <button className="btn btn--no" onClick={() => answer(false)}>No</button>
            </div>
          </div>
        )}
        {phase === 'yes' && (
          <div className="bubble bubble--short">{cfg.showMouse ? 'Here I come! 💨' : `Yay! ${Math.min(drank, goal)} of ${goal} today 🎉`}</div>
        )}
        {phase === 'no' && <div className="bubble bubble--short bubble--sad">Oh… okay. Please drink some soon.</div>}
        {isVrm ? (
          // The 3D avatar turns itself (no CSS mirroring needed).
          <VrmBuddy mood={catMood} />
        ) : (
          <div className={`cat-facing ${phase === 'no' ? 'cat-facing--left' : ''}`}>
            <Buddy mood={catMood} look={cfg.look} />
          </div>
        )}
        <div className={`ground-shadow ${phase === 'yes' ? 'ground-shadow--run' : ''}`} />
      </div>
    </div>
  );
}
