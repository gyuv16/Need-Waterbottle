import { useEffect } from 'react';
import Scene from './components/Scene';
import { useReminderTimer } from './useReminderTimer';
import { useAppState } from './useAppState';

export default function App() {
  const [state, ready] = useAppState();
  const { showing, run, stop } = useReminderTimer(state.settings, ready);

  // Keep the full-screen overlay window hidden (and idle) except while a scene plays.
  useEffect(() => window.waterBuddy?.setOverlayActive?.(showing), [showing]);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {showing && <Scene key={run} state={state} onFinish={stop} />}
    </div>
  );
}
