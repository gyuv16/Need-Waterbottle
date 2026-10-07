// Expression & reaction face controller for a VRM avatar.
//
// - Expression blending: trigger an emotion and its weight is lerped in over a given time and held;
//   every other emotion fades out at the same time, so faces never "pop".
// - Micro-expressions: automatic random blinking (every 3–6 s, sometimes a double blink).
// - Mouth shapes: a simple talk() that cycles the A/E/I/O/U visemes for speech bubbles.
//
// Names follow the spec (Joy, Sorrow, Angry, Fun, Surprised, Blink, A/E/I/O/U) and are mapped to
// VRM 1.0 presets; VRM 0.x models are handled by three-vrm's automatic preset migration.
import type { VRM } from '@pixiv/three-vrm';

export type Emotion = 'neutral' | 'joy' | 'sorrow' | 'angry' | 'fun' | 'surprised';
export type Viseme = 'A' | 'E' | 'I' | 'O' | 'U';

const EMOTION_PRESET: Record<Exclude<Emotion, 'neutral'>, string> = {
  joy: 'happy',
  sorrow: 'sad',
  angry: 'angry',
  fun: 'relaxed',
  surprised: 'surprised',
};
const VISEME_PRESET: Record<Viseme, string> = { A: 'aa', E: 'ee', I: 'ih', O: 'oh', U: 'ou' };

interface Fade {
  from: number;
  to: number;
  t: number;
  duration: number;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

export class ExpressionController {
  private weights = new Map<string, number>();
  private fades = new Map<string, Fade>();
  private nextBlink = 2 + Math.random() * 3;
  private blinkT = -1;
  private doubleBlink = false;
  private talkT = 0;
  private talkLeft = 0;
  private viseme: Viseme = 'A';
  current: Emotion = 'neutral';

  constructor(private vrm: VRM) {}

  /** Smoothly transition to an emotion (weight 0–1) over `seconds`, then hold it. */
  setExpression(emotion: Emotion, weight = 1, seconds = 0.3): void {
    this.current = emotion;
    for (const [key, preset] of Object.entries(EMOTION_PRESET)) {
      this.fadeTo(preset, key === emotion ? weight : 0, seconds);
    }
  }

  /** Open and close the mouth through the vowel shapes for `seconds` (speech bubble lip flap). */
  talk(seconds: number): void {
    this.talkLeft = seconds;
  }

  /** Force a blink right now (used by reactions). */
  blink(): void {
    if (this.blinkT < 0) this.blinkT = 0;
  }

  update(dt: number): void {
    const em = this.vrm.expressionManager;
    if (!em) return;

    for (const [name, f] of this.fades) {
      f.t = Math.min(f.duration, f.t + dt);
      const k = f.duration > 0 ? smooth(f.t / f.duration) : 1;
      this.weights.set(name, f.from + (f.to - f.from) * k);
      if (f.t >= f.duration) this.fades.delete(name);
    }

    // Auto-blink. Strong joy already closes the eyes (^^), so blinking is suppressed then.
    const joy = this.weights.get('happy') ?? 0;
    this.nextBlink -= dt;
    if (this.nextBlink <= 0 && this.blinkT < 0) {
      this.blinkT = 0;
      this.doubleBlink = Math.random() < 0.2;
      this.nextBlink = 3 + Math.random() * 3;
    }
    let blink = 0;
    if (this.blinkT >= 0) {
      this.blinkT += dt;
      const d = 0.16; // close + open
      const t = this.blinkT / d;
      blink = t < 0.5 ? smooth(t * 2) : smooth(2 - t * 2);
      if (this.blinkT >= d) {
        if (this.doubleBlink) {
          this.doubleBlink = false;
          this.blinkT = -0.08; // short gap, then blink again
        } else {
          this.blinkT = -1;
        }
      }
    } else if (this.blinkT > -1) {
      this.blinkT += dt;
      if (this.blinkT >= 0) this.blinkT = 0;
    }
    blink *= 1 - Math.min(1, joy * 1.2);

    // Lip flap: switch vowels every ~110 ms with an open/close envelope.
    let mouth = 0;
    if (this.talkLeft > 0) {
      this.talkLeft -= dt;
      this.talkT += dt;
      if (this.talkT > 0.11) {
        this.talkT = 0;
        const all: Viseme[] = ['A', 'E', 'I', 'O', 'U'];
        this.viseme = all[Math.floor(Math.random() * all.length)];
      }
      mouth = 0.35 + 0.45 * Math.abs(Math.sin((this.talkT / 0.11) * Math.PI));
    }

    for (const [name, w] of this.weights) em.setValue(name, w);
    em.setValue('blink', blink);
    for (const [v, preset] of Object.entries(VISEME_PRESET)) em.setValue(preset, v === this.viseme ? mouth : 0);
  }

  private fadeTo(name: string, to: number, seconds: number): void {
    const from = this.weights.get(name) ?? 0;
    if (Math.abs(from - to) < 1e-3 && !this.fades.has(name)) return;
    this.fades.set(name, { from, to, t: 0, duration: seconds });
  }
}
