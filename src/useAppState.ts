import { useEffect, useState } from 'react';
import { DEFAULT_SETTINGS, todayKey, type AppState } from './shared/settings';

const INITIAL: AppState = { settings: DEFAULT_SETTINGS, stats: { date: todayKey(), drank: 0, skipped: 0 } };

/** Live settings + today's stats, kept in sync with the main process. */
export function useAppState(): [AppState, boolean] {
  const [state, setState] = useState<AppState>(INITIAL);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const api = window.waterBuddy;
    if (!api?.getState) {
      setLoaded(true);
      return;
    }
    api.getState().then((s) => {
      setState(s);
      setLoaded(true);
    });
    return api.onStateChanged(setState);
  }, []);

  return [state, loaded];
}
