import { useEffect, useState, useCallback, useRef } from 'react';
import { inQuietHours, type Settings } from './shared/settings';
import { DEV_INTERVAL_MS } from './config';

/**
 * Starts a reminder scene every `intervalMinutes` (skipped while reminders are off or during quiet
 * hours) and whenever the user calls Whiskers manually. Returns whether a scene is showing.
 */
export function useReminderTimer(settings: Settings, ready: boolean) {
  const [showing, setShowing] = useState(false);
  const [run, setRun] = useState(0);
  const stop = useCallback(() => setShowing(false), []);

  const start = useCallback(() => {
    setShowing((already) => {
      if (!already) setRun((n) => n + 1);
      return true;
    });
  }, []);

  // Keep the latest switches without restarting the interval on every settings change.
  const live = useRef(settings);
  live.current = settings;

  const intervalMs = DEV_INTERVAL_MS ?? settings.intervalMinutes * 60 * 1000;
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const s = live.current;
      if (s.remindersEnabled && !inQuietHours(s.quietHours)) start();
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, start, ready]);

  // "Call Whiskers" from the tray menu, the global shortcut or the Settings window.
  useEffect(() => window.waterBuddy?.onRemindNow(start), [start]);

  return { showing, run, stop };
}
