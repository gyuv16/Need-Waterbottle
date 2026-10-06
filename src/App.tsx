import Scene from './components/Scene';
import { useReminderTimer } from './useReminderTimer';
import { REMINDER_INTERVAL_MS } from './config';

export default function App() {
  const { showing, run, stop } = useReminderTimer(REMINDER_INTERVAL_MS);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {showing && <Scene key={run} onFinish={stop} />}
    </div>
  );
}
