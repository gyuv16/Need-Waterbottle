import type { CSSProperties } from 'react';
import SpeechBubble from './SpeechBubble';
import spriteSheet from '../assets/walker.svg';
import { SPRITE } from '../config';

interface Props {
  durationMs: number;
  onFinish: () => void;
}

export default function Avatar({ durationMs, onFinish }: Props) {
  const w = SPRITE.frameWidth * SPRITE.scale;
  const h = SPRITE.frameHeight * SPRITE.scale;

  const walkerStyle = {
    '--walk-duration': `${durationMs}ms`,
    '--avatar-width': `${w}px`,
  } as CSSProperties;

  const spriteStyle = {
    width: w,
    height: h,
    backgroundImage: `url(${spriteSheet})`,
    backgroundSize: `${w * SPRITE.frames}px ${h}px`,
    '--sprite-sheet-width': `${w * SPRITE.frames}px`,
    '--sprite-frames': SPRITE.frames,
  } as CSSProperties;

  return (
    <div
      className="walker absolute bottom-16 left-0 flex flex-col items-center"
      style={walkerStyle}
      onAnimationEnd={(e) => e.animationName === 'walk-across' && onFinish()}
    >
      <SpeechBubble text="Time to drink water!" />
      <div className="sprite" style={spriteStyle} />
    </div>
  );
}
