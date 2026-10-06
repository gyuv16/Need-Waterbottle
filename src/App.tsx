import Avatar from './components/Avatar';
import { useReminderTimer } from './useReminderTimer';
import { REMINDER_INTERVAL_MS, WALK_DURATION_MS } from './config';

export default function App() {
  const { walking, stop } = useReminderTimer(REMINDER_INTERVAL_MS, WALK_DURATION_MS);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      {walking && <Avatar durationMs={WALK_DURATION_MS} onFinish={stop} />}
    </div>
  );
}
