import { useEffect } from 'react';
import Scene from './components/Scene';
import PetLayer from './components/PetLayer';
import { useReminderTimer } from './useReminderTimer';
import { useAppState } from './useAppState';

export default function App() {
  const [state, ready] = useAppState();
  const { showing, run, stop } = useReminderTimer(state.settings, ready);

  const { settings } = state;
  const pet = settings.petMode && settings.character === 'vrm' && !!settings.vrmName;

  // Keep the full-screen overlay window hidden (and idle) except while a scene plays
  // (or while the 3D desktop pet is enabled).
  useEffect(() => window.waterBuddy?.setOverlayActive?.(showing), [showing, pet]);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {showing && <Scene key={run} state={state} onFinish={stop} />}
      {pet && !showing && <PetLayer />}
    </div>
  );
}
