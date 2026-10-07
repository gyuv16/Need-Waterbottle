// Settings shared by the main process, the overlay and the Settings window.

export type WalkSpeed = 'slow' | 'normal' | 'fast';
export type AvatarKind = 'cat' | 'photo';

export interface Settings {
  /** Master switch for the hourly reminders ("Call Whiskers" always works). */
  remindersEnabled: boolean;
  /** Minutes between reminders. */
  intervalMinutes: number;
  /** No automatic reminders between these times (24h "HH:MM"; may wrap past midnight). */
  quietHours: { enabled: boolean; start: string; end: string };
  /** Seconds to wait for a Yes / No before Whiskers walks home. */
  answerTimeoutSec: number;
  walkSpeed: WalkSpeed;
  /** Step (out of 100) at which Whiskers stops to ask. */
  askAtStep: number;
  showMouse: boolean;
  /** Glasses of water to aim for each day. */
  dailyGoal: number;
  avatar: AvatarKind;
  /** Custom avatar photo, already cropped to a circle (PNG data URL). */
  photo: string | null;
  launchAtLogin: boolean;
}

export interface Stats {
  /** Local date the counts belong to, "YYYY-MM-DD". */
  date: string;
  drank: number;
  skipped: number;
}

export interface AppState {
  settings: Settings;
  stats: Stats;
}

export const DEFAULT_SETTINGS: Settings = {
  remindersEnabled: true,
  intervalMinutes: 60,
  quietHours: { enabled: false, start: '22:00', end: '08:00' },
  answerTimeoutSec: 60,
  walkSpeed: 'normal',
  askAtStep: 20,
  showMouse: true,
  dailyGoal: 8,
  avatar: 'cat',
  photo: null,
  launchAtLogin: false,
};

export const STEP_MS_BY_SPEED: Record<WalkSpeed, number> = { slow: 560, normal: 420, fast: 300 };

export const LIMITS = {
  intervalMinutes: [5, 240],
  answerTimeoutSec: [15, 300],
  askAtStep: [10, 60],
  dailyGoal: [1, 20],
} as const;

const clamp = (v: unknown, [lo, hi]: readonly [number, number], fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
};
const isTime = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);

/** Merge untrusted input over the current settings, keeping every field valid. */
export function sanitizeSettings(input: unknown, base: Settings = DEFAULT_SETTINGS): Settings {
  const i = (input && typeof input === 'object' ? input : {}) as Partial<Settings>;
  const q = (i.quietHours && typeof i.quietHours === 'object' ? i.quietHours : {}) as Partial<Settings['quietHours']>;
  return {
    remindersEnabled: typeof i.remindersEnabled === 'boolean' ? i.remindersEnabled : base.remindersEnabled,
    intervalMinutes: clamp(i.intervalMinutes ?? base.intervalMinutes, LIMITS.intervalMinutes, base.intervalMinutes),
    quietHours: {
      enabled: typeof q.enabled === 'boolean' ? q.enabled : base.quietHours.enabled,
      start: isTime(q.start) ? q.start : base.quietHours.start,
      end: isTime(q.end) ? q.end : base.quietHours.end,
    },
    answerTimeoutSec: clamp(i.answerTimeoutSec ?? base.answerTimeoutSec, LIMITS.answerTimeoutSec, base.answerTimeoutSec),
    walkSpeed: i.walkSpeed && i.walkSpeed in STEP_MS_BY_SPEED ? i.walkSpeed : base.walkSpeed,
    askAtStep: clamp(i.askAtStep ?? base.askAtStep, LIMITS.askAtStep, base.askAtStep),
    showMouse: typeof i.showMouse === 'boolean' ? i.showMouse : base.showMouse,
    dailyGoal: clamp(i.dailyGoal ?? base.dailyGoal, LIMITS.dailyGoal, base.dailyGoal),
    avatar: i.avatar === 'photo' || i.avatar === 'cat' ? i.avatar : base.avatar,
    photo:
      i.photo === null || (typeof i.photo === 'string' && i.photo.startsWith('data:image/') && i.photo.length < 2_000_000)
        ? (i.photo ?? null)
        : base.photo,
    launchAtLogin: typeof i.launchAtLogin === 'boolean' ? i.launchAtLogin : base.launchAtLogin,
  };
}

export function todayKey(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** True if `now` falls inside the quiet hours (handles ranges that wrap past midnight). */
export function inQuietHours(q: Settings['quietHours'], now = new Date()): boolean {
  if (!q.enabled || q.start === q.end) return false;
  const mins = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  const n = now.getHours() * 60 + now.getMinutes();
  const s = mins(q.start);
  const e = mins(q.end);
  return s < e ? n >= s && n < e : n >= s || n < e;
}
