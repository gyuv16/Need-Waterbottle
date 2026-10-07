import { useEffect } from 'react';
import type { Mood } from '../characters';
import { useVrmAvatar } from '../vrm/useVrmAvatar';
import { FACING } from '../vrm/facing';

export const VRM_W = 200;
export const VRM_H = 300;

/**
 * The 3D anime avatar in the reminder story. Mood → body language:
 *   walk: faces right and walks in        ask: turns to you, talks, follows your pointer
 *   run:  waves happily, then runs off     sad: sorrow, turns away and walks home slowly
 */
export default function VrmBuddy({ mood }: { mood: Mood }) {
  const [canvas, avatar] = useVrmAvatar(60);

  useEffect(() => {
    if (!avatar) return;
    if (mood === 'walk') {
      avatar.face(FACING.right);
      avatar.setSpeed(1);
      avatar.setExpression('neutral', 0, 0.3);
    } else if (mood === 'ask') {
      avatar.setSpeed(0);
      avatar.face(FACING.viewer);
      avatar.setExpression('fun', 0.6, 0.4);
      avatar.expressions.talk(1.4);
    } else if (mood === 'run') {
      avatar.reactWave();
      avatar.face(FACING.right);
      avatar.setSpeed(2);
    } else {
      avatar.setExpression('sorrow', 1, 0.4);
      avatar.face(FACING.left);
      avatar.setSpeed(0.7);
    }
  }, [avatar, mood]);

  // Head and eyes follow the pointer (the overlay forwards mouse moves while click-through).
  useEffect(() => {
    if (!avatar) return;
    const onMove = (e: MouseEvent) => {
      const r = canvas.current?.getBoundingClientRect();
      if (r) avatar.lookAtScreen(e.clientX - r.left, e.clientY - r.top);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [avatar, canvas]);

  return <canvas ref={canvas} className="vrm-canvas" style={{ width: VRM_W, height: VRM_H }} />;
}
