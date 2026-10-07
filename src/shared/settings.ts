// Settings shared by the main process, the overlay and the Settings window.

export type WalkSpeed = 'slow' | 'normal' | 'fast';
/** 'preset' = a drawn face from the character library, 'photo' = the user's own (cartoonised) photo. */
export type AvatarKind = 'preset' | 'photo';
export type CharacterKind = 'animal' | 'human';
export type Sex = 'male' | 'female';
export type OutfitStyle = 'pants' | 'skirt' | 'dress';
export type Accessory = 'none' | 'bottle' | 'scarf' | 'backpack' | 'bowtie';

export const ANIMALS = ['cat', 'dog', 'bear', 'bunny', 'fox', 'panda', 'penguin', 'tiger', 'koala', 'raccoon', 'redpanda', 'hamster'] as const;
export const HUMAN_STYLES: Record<Sex, readonly string[]> = {
  male: ['beard', 'cap', 'bald', 'builder', 'chef', 'grandpa', 'sikh', 'wizard'],
  female: ['afro', 'ballerina', 'glasses', 'granny', 'hijabi', 'nurse', 'scientist', 'pirate', 'skater'],
};
export const ACCESSORIES: readonly Accessory[] = ['none', 'bottle', 'scarf', 'backpack', 'bowtie'];
const HEX = /^#[0-9a-f]{6}$/i;

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
  /** Your buddy's name, used in the menu ("Call …"). */
  buddyName: string;
  character: CharacterKind;
  animal: (typeof ANIMALS)[number];
  sex: Sex;
  /** Drawn face style for humans (see HUMAN_STYLES). */
  humanStyle: string;
  outfit: { style: OutfitStyle; top: string; bottom: string; shoes: string };
  accessory: Accessory;
  accessoryColor: string;
  avatar: AvatarKind;
  /** Custom face: an oval crop of the user's photo, cartoonised or not (PNG data URL). */
  photo: string | null;
  /** The cropped photo before the cartoon effect, so the effect can be switched off later. */
  photoOriginal: string | null;
  /** Look applied to the photo face: anime (default), comic, or the original photo. */
  photoStyle: 'anime' | 'comic' | 'none';
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
  buddyName: 'Whiskers',
  character: 'animal',
  animal: 'cat',
  sex: 'male',
  humanStyle: 'beard',
  outfit: { style: 'pants', top: '#38bdf8', bottom: '#334155', shoes: '#f8fafc' },
  accessory: 'bottle',
  accessoryColor: '#0ea5e9',
  avatar: 'preset',
  photo: null,
  photoOriginal: null,
  photoStyle: 'anime',
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
  const o = (i.outfit && typeof i.outfit === 'object' ? i.outfit : {}) as Partial<Settings['outfit']>;
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
    buddyName:
      typeof i.buddyName === 'string' && i.buddyName.trim() ? i.buddyName.trim().slice(0, 24) : base.buddyName,
    character: i.character === 'animal' || i.character === 'human' ? i.character : base.character,
    animal: (ANIMALS as readonly string[]).includes(i.animal as string) ? (i.animal as Settings['animal']) : base.animal,
    sex: i.sex === 'male' || i.sex === 'female' ? i.sex : base.sex,
    humanStyle: [...HUMAN_STYLES.male, ...HUMAN_STYLES.female].includes(i.humanStyle as string)
      ? (i.humanStyle as string)
      : base.humanStyle,
    outfit: {
      style: ['pants', 'skirt', 'dress'].includes(o.style as string) ? (o.style as OutfitStyle) : base.outfit.style,
      top: HEX.test(o.top ?? '') ? (o.top as string) : base.outfit.top,
      bottom: HEX.test(o.bottom ?? '') ? (o.bottom as string) : base.outfit.bottom,
      shoes: HEX.test(o.shoes ?? '') ? (o.shoes as string) : base.outfit.shoes,
    },
    accessory: ACCESSORIES.includes(i.accessory as Accessory) ? (i.accessory as Accessory) : base.accessory,
    accessoryColor: HEX.test(i.accessoryColor ?? '') ? (i.accessoryColor as string) : base.accessoryColor,
    // Settings from v1.5 used 'cat' for the drawn avatar.
    avatar: i.avatar === 'photo' ? 'photo' : i.avatar === 'preset' || (i.avatar as unknown) === 'cat' ? 'preset' : base.avatar,
    photo: validImage(i.photo) ? (i.photo ?? null) : base.photo,
    photoOriginal: validImage(i.photoOriginal) ? (i.photoOriginal ?? null) : base.photoOriginal,
    photoStyle: ['anime', 'comic', 'none'].includes(i.photoStyle as string) ? (i.photoStyle as Settings['photoStyle']) : base.photoStyle,
    launchAtLogin: typeof i.launchAtLogin === 'boolean' ? i.launchAtLogin : base.launchAtLogin,
  };
}

function validImage(v: unknown): v is string | null | undefined {
  return v === null || (typeof v === 'string' && v.startsWith('data:image/') && v.length < 2_000_000);
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
