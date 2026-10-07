import { useEffect, useRef } from 'react';
import { useVrmAvatar } from '../vrm/useVrmAvatar';
import { Wanderer } from '../vrm/locomotion';
import { VRM_H, VRM_W } from './VrmBuddy';

/**
 * Desktop-pet mode: the 3D avatar wanders along the bottom of the screen between reminders,
 * idles (breathing, blinking, looking around), waves or thinks now and then, follows your pointer
 * with its head and eyes, and jumps back in surprise if the pointer rushes up to it.
 * Rendering is capped at 30 fps to stay light.
 */
export default function PetLayer() {
  const [canvas, avatar] = useVrmAvatar(30);
  const holder = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!avatar || !holder.current) return;
    const bounds = () => ({
      left: 20,
      right: window.innerWidth - VRM_W - 20,
      top: window.innerHeight - VRM_H - 110,
      bottom: window.innerHeight - VRM_H - 40,
    });
    const wanderer = new Wanderer(avatar, holder.current, bounds);
    wanderer.start();

    let lastSurprise = 0;
    let prev: { x: number; y: number; t: number } | null = null;
    const onMove = (e: MouseEvent) => {
      const r = wanderer.rect;
      avatar.lookAtScreen(e.clientX - r.left, e.clientY - r.top);
      // A fast pointer dash right up to the avatar startles it.
      const now = performance.now();
      if (prev) {
        const speed = Math.hypot(e.clientX - prev.x, e.clientY - prev.y) / Math.max(1, now - prev.t);
        const near = e.clientX > r.left - 30 && e.clientX < r.right + 30 && e.clientY > r.top && e.clientY < r.bottom;
        if (near && speed > 1.5 && now - lastSurprise > 4000) {
          lastSurprise = now;
          avatar.reactSurprise();
          setTimeout(() => avatar.setExpression('neutral', 0, 0.6), 1200);
        }
      }
      prev = { x: e.clientX, y: e.clientY, t: now };
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      wanderer.stop();
      window.removeEventListener('mousemove', onMove);
    };
  }, [avatar]);

  return (
    <div ref={holder} className="pet" style={{ width: VRM_W, height: VRM_H }}>
      <canvas ref={canvas} className="vrm-canvas" style={{ width: VRM_W, height: VRM_H }} />
    </div>
  );
}
