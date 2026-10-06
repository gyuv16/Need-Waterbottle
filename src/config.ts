// Reminder interval. 60 minutes in production, 10 seconds while developing.
export const REMINDER_INTERVAL_MS =
  process.env.NODE_ENV === 'development' ? 10 * 1000 : 60 * 60 * 1000;

// Time the avatar takes to cross the whole screen.
export const WALK_DURATION_MS = 12 * 1000;

// Sprite sheet geometry (1 horizontal row). Keep in sync with index.css.
export const SPRITE = { frameWidth: 64, frameHeight: 64, frames: 4, scale: 2 };
