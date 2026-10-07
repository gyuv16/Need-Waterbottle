// Fixed animation constants. User-adjustable values live in Settings (src/shared/settings.ts).

// While developing, reminders come every 10 seconds instead of the configured interval.
export const DEV_INTERVAL_MS = process.env.NODE_ENV === 'development' ? 10 * 1000 : null;

// The walk across the screen is divided into this many steps.
export const TOTAL_STEPS = 100;

// Chase speed for the "Yes" ending, in pixels per second.
export const CHASE_SPEED = 900;
