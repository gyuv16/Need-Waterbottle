import { useEffect, useState, useCallback } from 'react';

/** Fires every `intervalMs`; returns whether the avatar is currently walking. */
export function useReminderTimer(intervalMs: number, walkMs: number) {
  const [walking, setWalking] = useState(false);
  const stop = useCallback(() => setWalking(false), []);

  useEffect(() => {
    const id = setInterval(() => setWalking(true), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  // "Remind me now" from the tray menu.
  useEffect(() => window.waterBuddy?.onRemindNow(() => setWalking(true)), []);

  // Safety net in case animationend is missed.
  useEffect(() => {
    if (!walking) return;
    const t = setTimeout(stop, walkMs + 500);
    return () => clearTimeout(t);
  }, [walking, walkMs, stop]);

  return { walking, stop };
}
