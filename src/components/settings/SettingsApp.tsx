import { useEffect, useRef, useState, type ReactNode } from 'react';
import catHead from '../../assets/mascot/cat-ask.webp';
import PhotoEditor from './PhotoEditor';
import { useAppState } from '../../useAppState';
import { LIMITS, inQuietHours, type Settings, type WalkSpeed } from '../../shared/settings';

const INTERVALS = [15, 30, 45, 60, 90, 120];
const SPEEDS: { value: WalkSpeed; label: string }[] = [
  { value: 'slow', label: '🐢 Slow' },
  { value: 'normal', label: '🐈 Normal' },
  { value: 'fast', label: '⚡ Fast' },
];
const isMac = window.waterBuddy?.platform === 'darwin';

function Section({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
        <span>{icon}</span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-slate-700">{label}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition-colors ${checked ? 'bg-sky-500' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

export default function SettingsApp() {
  const [state, loaded] = useAppState();
  const [draft, setDraft] = useState<Settings>(state.settings);
  const [saved, setSaved] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const fileInput = useRef<HTMLInputElement>(null);

  // Follow changes made elsewhere (e.g. the tray's "Hourly reminders" checkbox).
  useEffect(() => setDraft(state.settings), [state.settings]);

  /** Update the form immediately and save shortly after (so sliders don't write on every pixel). */
  const pending = useRef<Partial<Settings>>({});
  const patch = (p: Partial<Settings>, delay = 250) => {
    setDraft((d) => ({ ...d, ...p, quietHours: { ...d.quietHours, ...(p.quietHours ?? {}) } }));
    // Queue changes so a quick second edit doesn't cancel the first one's save.
    pending.current = { ...pending.current, ...p };
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const toSave = pending.current;
      pending.current = {};
      await window.waterBuddy.updateSettings(toSave);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    }, delay);
  };

  if (!loaded) return <div className="p-8 text-slate-500">Loading…</div>;

  const { stats } = state;
  const pct = Math.min(100, Math.round((stats.drank / draft.dailyGoal) * 100));
  const quietNow = inQuietHours(draft.quietHours);

  return (
    <div className="mx-auto max-w-xl space-y-5 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">💧 WaterBuddy</h1>
          <p className="text-sm text-slate-500">Settings save automatically.</p>
        </div>
        <span className={`text-sm font-semibold text-emerald-600 transition-opacity ${saved ? 'opacity-100' : 'opacity-0'}`}>
          Saved ✓
        </span>
      </header>

      {/* Today */}
      <Section title="Today" icon="📊">
        <div>
          <div className="mb-2 flex items-end justify-between">
            <span className="text-3xl font-extrabold text-sky-600">
              {stats.drank}
              <span className="text-lg font-semibold text-slate-400"> / {draft.dailyGoal} glasses</span>
            </span>
            <span className="text-xs text-slate-500">Skipped: {stats.skipped}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-sky-100">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
          {stats.drank >= draft.dailyGoal && <p className="mt-2 text-sm font-semibold text-emerald-600">Goal reached. Great job! 🎉</p>}
        </div>
        <Row label="Daily goal" hint="Each “Yes” counts as one glass">
          <div className="flex items-center gap-2">
            <button
              className="h-8 w-8 rounded-full bg-slate-100 text-lg font-bold hover:bg-slate-200"
              onClick={() => patch({ dailyGoal: Math.max(LIMITS.dailyGoal[0], draft.dailyGoal - 1) }, 0)}
              aria-label="Decrease goal"
            >
              −
            </button>
            <span className="w-8 text-center font-semibold">{draft.dailyGoal}</span>
            <button
              className="h-8 w-8 rounded-full bg-slate-100 text-lg font-bold hover:bg-slate-200"
              onClick={() => patch({ dailyGoal: Math.min(LIMITS.dailyGoal[1], draft.dailyGoal + 1) }, 0)}
              aria-label="Increase goal"
            >
              +
            </button>
          </div>
        </Row>
        <div className="flex justify-end">
          <button className="text-xs font-semibold text-slate-500 underline hover:text-slate-700" onClick={() => window.waterBuddy.resetToday()}>
            Reset today’s count
          </button>
        </div>
      </Section>

      {/* Reminders */}
      <Section title="Reminders" icon="⏰">
        <Row label="Hourly reminders" hint="“Call Whiskers” works even when this is off">
          <Toggle label="Reminders" checked={draft.remindersEnabled} onChange={(v) => patch({ remindersEnabled: v }, 0)} />
        </Row>
        <div className={draft.remindersEnabled ? '' : 'pointer-events-none opacity-50'}>
          <div className="mb-2 text-sm font-medium text-slate-700">Remind me every</div>
          <div className="flex flex-wrap gap-2">
            {INTERVALS.map((m) => (
              <button
                key={m}
                onClick={() => patch({ intervalMinutes: m }, 0)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ${
                  draft.intervalMinutes === m ? 'bg-sky-600 text-white ring-sky-600' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
                }`}
              >
                {m < 60 ? `${m} min` : `${m / 60} hr`}
              </button>
            ))}
            <label className="flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm ring-1 ring-slate-300">
              <input
                type="number"
                min={LIMITS.intervalMinutes[0]}
                max={LIMITS.intervalMinutes[1]}
                value={draft.intervalMinutes}
                onChange={(e) => patch({ intervalMinutes: Number(e.target.value) }, 600)}
                className="w-14 bg-transparent text-right outline-none"
                aria-label="Custom minutes"
              />
              min
            </label>
          </div>
        </div>
        <Row label="Quiet hours" hint={draft.quietHours.enabled && quietNow ? 'Quiet right now 🌙' : 'No automatic reminders during this time'}>
          <Toggle label="Quiet hours" checked={draft.quietHours.enabled} onChange={(v) => patch({ quietHours: { ...draft.quietHours, enabled: v } }, 0)} />
        </Row>
        {draft.quietHours.enabled && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-600">From</span>
            <input
              type="time"
              value={draft.quietHours.start}
              onChange={(e) => patch({ quietHours: { ...draft.quietHours, start: e.target.value } }, 400)}
              className="rounded-lg border border-slate-300 px-2 py-1"
            />
            <span className="text-slate-600">to</span>
            <input
              type="time"
              value={draft.quietHours.end}
              onChange={(e) => patch({ quietHours: { ...draft.quietHours, end: e.target.value } }, 400)}
              className="rounded-lg border border-slate-300 px-2 py-1"
            />
          </div>
        )}
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium text-slate-700">Wait for my answer</span>
            <span className="text-slate-500">{draft.answerTimeoutSec} s</span>
          </div>
          <input
            type="range"
            min={LIMITS.answerTimeoutSec[0]}
            max={LIMITS.answerTimeoutSec[1]}
            step={15}
            value={draft.answerTimeoutSec}
            onChange={(e) => patch({ answerTimeoutSec: Number(e.target.value) })}
            className="w-full"
          />
        </div>
      </Section>

      {/* Avatar */}
      <Section title="Your avatar" icon="🎨">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => patch({ avatar: 'cat' }, 0)}
            className={`flex flex-col items-center gap-2 rounded-2xl p-3 ring-2 transition ${
              draft.avatar === 'cat' ? 'bg-sky-50 ring-sky-500' : 'bg-white ring-slate-200 hover:ring-slate-300'
            }`}
          >
            <img src={catHead} alt="" className="h-24 w-24 object-contain" />
            <span className="text-sm font-semibold">Whiskers the cat</span>
          </button>
          <button
            onClick={() => (draft.photo ? patch({ avatar: 'photo' }, 0) : fileInput.current?.click())}
            className={`flex flex-col items-center gap-2 rounded-2xl p-3 ring-2 transition ${
              draft.avatar === 'photo' ? 'bg-sky-50 ring-sky-500' : 'bg-white ring-slate-200 hover:ring-slate-300'
            }`}
          >
            {draft.photo ? (
              <img src={draft.photo} alt="" className="h-24 w-24 rounded-full border-4 border-slate-900 object-cover" />
            ) : (
              <span className="grid h-24 w-24 place-items-center rounded-full border-4 border-dashed border-slate-300 text-3xl text-slate-400">
                📷
              </span>
            )}
            <span className="text-sm font-semibold">{draft.photo ? 'My photo' : 'Upload a photo'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Your photo becomes the head on Whiskers’ body, with a little mood badge. It stays on this computer.
        </p>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setPhotoFile(f);
            e.target.value = '';
          }}
        />
        {photoFile ? (
          <PhotoEditor
            file={photoFile}
            onCancel={() => setPhotoFile(null)}
            onSave={(dataUrl) => {
              setPhotoFile(null);
              patch({ photo: dataUrl, avatar: 'photo' }, 0);
            }}
          />
        ) : (
          <div className="flex gap-2">
            <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700" onClick={() => fileInput.current?.click()}>
              {draft.photo ? 'Change photo' : 'Choose photo…'}
            </button>
            {draft.photo && (
              <button className="rounded-full px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50" onClick={() => patch({ photo: null, avatar: 'cat' }, 0)}>
                Remove photo
              </button>
            )}
          </div>
        )}
      </Section>

      {/* Animation */}
      <Section title="Animation" icon="🎬">
        <div>
          <div className="mb-2 text-sm font-medium text-slate-700">Walking speed</div>
          <div className="grid grid-cols-3 gap-2">
            {SPEEDS.map((s) => (
              <button
                key={s.value}
                onClick={() => patch({ walkSpeed: s.value }, 0)}
                className={`rounded-xl py-2 text-sm font-semibold ring-1 ${
                  draft.walkSpeed === s.value ? 'bg-sky-600 text-white ring-sky-600' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="font-medium text-slate-700">Stop and ask after</span>
            <span className="text-slate-500">
              {draft.askAtStep} of 100 steps
            </span>
          </div>
          <input
            type="range"
            min={LIMITS.askAtStep[0]}
            max={LIMITS.askAtStep[1]}
            value={draft.askAtStep}
            onChange={(e) => patch({ askAtStep: Number(e.target.value) })}
            className="w-full"
          />
        </div>
        <Row label="Pip the mouse" hint="Peeks out and gets chased when you say Yes">
          <Toggle label="Show mouse" checked={draft.showMouse} onChange={(v) => patch({ showMouse: v }, 0)} />
        </Row>
      </Section>

      {/* General */}
      <Section title="General" icon="⚙️">
        <Row label="Start WaterBuddy when I log in">
          <Toggle label="Launch at login" checked={draft.launchAtLogin} onChange={(v) => patch({ launchAtLogin: v }, 0)} />
        </Row>
        <Row label="Call Whiskers now" hint={`Shortcut: ${isMac ? '⌘⌥W' : 'Ctrl+Alt+W'}`}>
          <button className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-sky-700" onClick={() => window.waterBuddy.callWhiskers()}>
            🐈 Try it
          </button>
        </Row>
      </Section>
    </div>
  );
}
