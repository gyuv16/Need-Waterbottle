import { useEffect, useState, useCallback } from 'react';

/** Fires every `intervalMs` (or on "Call Whiskers"); returns whether a reminder scene is showing. */
export function useReminderTimer(intervalMs: number) {
  const [showing, setShowing] = useState(false);
  const [run, setRun] = useState(0);
  const stop = useCallback(() => setShowing(false), []);

  const start = useCallback(() => {
    setShowing((already) => {
      if (!already) setRun((n) => n + 1);
      return true;
    });
  }, []);

  useEffect(() => {
    const id = setInterval(start, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, start]);

  // "Call Whiskers" from the tray menu or the global shortcut.
  useEffect(() => window.waterBuddy?.onRemindNow(start), [start]);

  return { showing, run, stop };
}
