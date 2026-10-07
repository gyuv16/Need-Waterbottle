// Screen-space locomotion + random wandering for the desktop-pet mode.
//
// The 3D avatar renders into a small canvas; this module moves that canvas around the desktop.
// Walking from (x1, y1) to (x2, y2):
//   1. turn the body toward the destination (quaternion slerp inside VrmAvatar.face) and wait until
//      the turn is done,
//   2. play the walk cycle and move the canvas at a speed matched to the stride (no foot sliding),
//   3. stop, turn back to face the viewer.
// The wander state machine repeats: idle (breathe / blink / look around) → walk to a random spot →
// idle, with the occasional wave or thinking pose.
import { FACING } from './facing';
import type { VrmAvatar } from './VrmAvatar';

export interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

type State = 'idle' | 'turning' | 'walking' | 'arriving';

const WALK_PX_PER_S = 95;

export class Wanderer {
  x: number;
  y: number;
  private state: State = 'idle';
  private timer = 2;
  private target = { x: 0, y: 0 };
  private raf = 0;
  private last = 0;
  private stopped = false;

  constructor(
    private avatar: VrmAvatar,
    private el: HTMLElement,
    private bounds: () => Bounds,
  ) {
    const b = bounds();
    this.x = b.left + Math.random() * (b.right - b.left);
    this.y = b.bottom;
    this.place();
  }

  /** Current screen-space rectangle of the avatar canvas (for cursor tracking). */
  get rect(): DOMRect {
    return this.el.getBoundingClientRect();
  }

  start(): void {
    this.last = performance.now();
    const loop = (now: number) => {
      if (this.stopped) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (now - this.last) / 1000);
      this.last = now;
      this.step(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
  }

  /** Walk to a specific screen position (top-left of the avatar canvas). */
  walkTo(x: number, y: number): void {
    const b = this.bounds();
    this.target = { x: Math.min(b.right, Math.max(b.left, x)), y: Math.min(b.bottom, Math.max(b.top, y)) };
    const dx = this.target.x - this.x;
    // Mostly sideways on a desktop: face left or right, angled slightly toward the viewer when moving up/down.
    const dy = this.target.y - this.y;
    const yaw = (dx >= 0 ? FACING.right : FACING.left) * (Math.abs(dy) > Math.abs(dx) ? 0.5 : 1);
    this.avatar.face(yaw);
    this.avatar.setSpeed(0);
    this.state = 'turning';
  }

  private step(dt: number): void {
    switch (this.state) {
      case 'idle': {
        this.timer -= dt;
        if (this.timer <= 0) {
          const roll = Math.random();
          if (roll < 0.12) {
            this.avatar.reactWave();
            this.timer = 3;
          } else if (roll < 0.22) {
            this.avatar.reactThink();
            this.timer = 3.2;
          } else {
            const b = this.bounds();
            let tx = b.left + Math.random() * (b.right - b.left);
            if (Math.abs(tx - this.x) < 160) tx = this.x + (tx < this.x ? -1 : 1) * 160;
            this.walkTo(tx, b.top + Math.random() * (b.bottom - b.top));
          }
        }
        break;
      }
      case 'turning':
        if (this.avatar.turned) {
          this.avatar.setSpeed(1);
          this.state = 'walking';
        }
        break;
      case 'walking': {
        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;
        const dist = Math.hypot(dx, dy);
        const v = WALK_PX_PER_S * dt;
        if (dist <= v) {
          this.x = this.target.x;
          this.y = this.target.y;
          this.avatar.setSpeed(0);
          this.avatar.face(FACING.viewer);
          this.state = 'arriving';
        } else {
          this.x += (dx / dist) * v;
          this.y += (dy / dist) * v;
        }
        this.place();
        break;
      }
      case 'arriving':
        if (this.avatar.turned) {
          this.state = 'idle';
          this.timer = 3 + Math.random() * 5;
        }
        break;
    }
  }

  private place(): void {
    this.el.style.transform = `translate(${Math.round(this.x)}px, ${Math.round(this.y)}px)`;
  }
}
