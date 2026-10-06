// Reminder interval. 60 minutes in production, 10 seconds while developing.
export const REMINDER_INTERVAL_MS =
  process.env.NODE_ENV === 'development' ? 10 * 1000 : 60 * 60 * 1000;

// The walk across the screen is divided into this many steps.
export const TOTAL_STEPS = 100;

// Whiskers stops and asks the question after this many steps.
export const ASK_AT_STEP = 20;

// Duration of one walking step.
export const STEP_MS = 420;

// With no answer after this long, Whiskers gives up and walks home.
export const ANSWER_TIMEOUT_MS = 60 * 1000;

// Chase speed for the "Yes" ending, in pixels per second.
export const CHASE_SPEED = 900;
