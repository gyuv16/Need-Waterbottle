import { useEffect, useRef, useState, type ReactNode } from 'react';
import PhotoEditor, { STYLE_OPTIONS } from './PhotoEditor';
import VrmPreview from './VrmPreview';
import AiAvatarPanel from './AiAvatarPanel';
import Buddy from '../Buddy';
import { stylize, type PhotoStyle } from './photo';
import { useAppState } from '../../useAppState';
import { LABELS, headSrc, resolveLook } from '../../characters';
import {
  ANIMALS,
  HUMAN_STYLES,
  LIMITS,
  inQuietHours,
  type Accessory,
  type OutfitStyle,
  type Settings,
  type Sex,
  type WalkSpeed,
} from '../../shared/settings';

const INTERVALS = [15, 30, 45, 60, 90, 120];
const SPEEDS: { value: WalkSpeed; label: string }[] = [
  { value: 'slow', label: '🐢 Slow' },
  { value: 'normal', label: '🐈 Normal' },
  { value: 'fast', label: '⚡ Fast' },
];
const isMac = window.waterBuddy?.platform === 'darwin';
const ACCESSORY_OPTIONS: { value: Accessory; icon: string; label: string }[] = [
  { value: 'none', icon: '✖️', label: 'None' },
  { value: 'bottle', icon: '🧴', label: 'Bottle' },
  { value: 'scarf', icon: '🧣', label: 'Scarf' },
  { value: 'backpack', icon: '🎒', label: 'Backpack' },
  { value: 'bowtie', icon: '🎀', label: 'Bow tie' },
];
const SWATCHES = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#0ea5e9', '#6366f1', '#a855f7', '#ec4899', '#f8fafc', '#334155', '#111827', '#92400e'];

/** Re-apply a style (anime / comic / original) to the saved, unstyled face crop. */
async function restyle(original: string, style: PhotoStyle): Promise<string> {
  if (style === 'none') return original;
  const img = new Image();
  img.src = original;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return original;
  ctx.drawImage(img, 0, 0);
  stylize(ctx, c.width, c.height, style);
  return c.toDataURL('image/png');
}

function Segmented({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-1 rounded-xl bg-slate-100 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-lg py-1.5 text-sm font-semibold transition ${value === o.value ? 'bg-white text-sky-700 shadow' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ColorPick({ label, value, onChange }: { label: string; value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-600">
        {label}
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-6 w-8 cursor-pointer rounded border border-slate-300 bg-white" aria-label={`${label} custom colour`} />
      </div>
      <div className="flex flex-wrap gap-1">
        {SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            aria-label={`${label} ${c}`}
            className={`h-5 w-5 rounded-full border ${value.toLowerCase() === c ? 'ring-2 ring-sky-500 ring-offset-1' : 'border-slate-300'}`}
            style={{ background: c }}
          />
        ))}
      </div>
    </div>
  );
}

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
  const vrmInput = useRef<HTMLInputElement>(null);
  const [vrmError, setVrmError] = useState('');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiResultFile, setAiResultFile] = useState(false);

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
  const look = resolveLook(draft);
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
        <Row label="Hourly reminders" hint="“Call” from the menu works even when this is off">
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

      {/* Buddy */}
      <Section title="Your buddy" icon="🎨">
        <div className="flex gap-4">
          {draft.character !== 'vrm' && (
            <div className="buddy-preview shrink-0" title="Move your mouse around: the head follows it">
              <div className="buddy-preview-stage">
                <Buddy mood="ask" look={look} />
              </div>
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Name
              <input
                value={draft.buddyName}
                maxLength={24}
                onChange={(e) => patch({ buddyName: e.target.value }, 600)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
              />
            </label>
            <Segmented
              value={draft.character}
              options={[
                { value: 'animal', label: '🐾 Animal' },
                { value: 'human', label: '🙋 Human' },
                { value: 'vrm', label: '🧊 3D anime' },
              ]}
              onChange={(v) => patch({ character: v as Settings['character'] }, 0)}
            />
            {draft.character === 'human' && (
              <Segmented
                value={draft.sex}
                options={[
                  { value: 'male', label: '♂ Male' },
                  { value: 'female', label: '♀ Female' },
                ]}
                onChange={(v) => {
                  const sex = v as Sex;
                  patch(
                    {
                      sex,
                      humanStyle: HUMAN_STYLES[sex].includes(draft.humanStyle) ? draft.humanStyle : HUMAN_STYLES[sex][0],
                      outfit: { ...draft.outfit, style: sex === 'female' ? 'dress' : 'pants' },
                    },
                    0,
                  );
                }}
              />
            )}
            <p className="text-xs text-slate-500">Move your mouse around: the head turns to follow it, just like on your desktop.</p>
          </div>
        </div>

        {draft.character === 'vrm' ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700" onClick={() => vrmInput.current?.click()}>
                🧊 {draft.vrmName ? 'Change 3D avatar…' : 'Import 3D avatar (.vrm)…'}
              </button>
              {draft.vrmName && <span className="truncate text-xs text-slate-500">{draft.vrmName}</span>}
              {vrmError && <span className="text-xs font-semibold text-red-600">{vrmError}</span>}
            </div>
            <input
              ref={vrmInput}
              type="file"
              accept=".vrm"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (!f) return;
                setVrmError('');
                try {
                  await window.waterBuddy.saveVrm(await f.arrayBuffer(), f.name);
                } catch (err) {
                  setVrmError(err instanceof Error ? err.message.replace(/^.*Error: /, '') : 'Could not import that file.');
                }
              }}
            />
            {draft.vrmName ? (
              <VrmPreview />
            ) : (
              <p className="rounded-xl bg-sky-50 p-3 text-xs text-slate-600">
                Import any VRM anime avatar. You can design your own for free in <b>VRoid Studio</b> (Windows / macOS), then use{' '}
                <i>Export → VRM</i>. Hair and clothes sway with spring-bone physics, the face blinks and shows expressions, and the head
                and eyes follow your pointer. Until you import one, the drawn cat is used.
              </p>
            )}
          </div>
        ) : (
          <>
        <div>
            <div className="mb-2 text-sm font-medium text-slate-700">Face</div>
            <div className="grid grid-cols-6 gap-2">
              {(draft.character === 'animal' ? ANIMALS : HUMAN_STYLES[draft.sex]).map((id) => {
                const active = draft.avatar === 'preset' && (draft.character === 'animal' ? draft.animal === id : draft.humanStyle === id);
                return (
                  <button
                    key={id}
                    title={LABELS[id]}
                    onClick={() => patch(draft.character === 'animal' ? { animal: id as Settings['animal'], avatar: 'preset' } : { humanStyle: id, avatar: 'preset' }, 0)}
                    className={`flex flex-col items-center rounded-xl p-1 ring-2 transition ${active ? 'bg-sky-50 ring-sky-500' : 'ring-transparent hover:bg-slate-50'}`}
                  >
                    <span className="h-14 w-14 overflow-hidden">
                      <img src={headSrc(id, 'd4')} alt="" className="h-14 w-14 origin-[50%_85%] scale-[1.55] object-contain" />
                    </span>
                    <span className="text-[10px] font-semibold text-slate-600">{LABELS[id]}</span>
                  </button>
                );
              })}
              <button
                title="Use my photo"
                onClick={() => (draft.photo ? patch({ avatar: 'photo' }, 0) : fileInput.current?.click())}
                className={`flex flex-col items-center rounded-xl p-1 ring-2 transition ${draft.avatar === 'photo' ? 'bg-sky-50 ring-sky-500' : 'ring-transparent hover:bg-slate-50'}`}
              >
                {draft.photo ? (
                  <img src={draft.photo} alt="" className="h-14 w-12 rounded-[50%] border-2 border-slate-900 object-cover" />
                ) : (
                  <span className="grid h-14 w-12 place-items-center rounded-[50%] border-2 border-dashed border-slate-300 text-xl">📷</span>
                )}
                <span className="text-[10px] font-semibold text-slate-600">My photo</span>
              </button>
            </div>
          </div>
  
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
          {aiOpen && !photoFile && (
            <AiAvatarPanel
              prompt={draft.aiPrompt}
              onPromptChange={(p) => patch({ aiPrompt: p }, 800)}
              onClose={() => setAiOpen(false)}
              onUse={(file) => {
                setAiOpen(false);
                setAiResultFile(true);
                setPhotoFile(file);
              }}
            />
          )}
          {photoFile ? (
            <PhotoEditor
              file={photoFile}
              style={aiResultFile ? 'none' : draft.photoStyle}
              onCancel={() => {
                setPhotoFile(null);
                setAiResultFile(false);
              }}
              onSave={({ photo, original, style }) => {
                setPhotoFile(null);
                setAiResultFile(false);
                patch({ photo, photoOriginal: original, photoStyle: style, avatar: 'photo' }, 0);
              }}
            />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700" onClick={() => fileInput.current?.click()}>
                📷 {draft.photo ? 'New photo…' : 'Use my photo…'}
              </button>
              <button
                className="rounded-full bg-gradient-to-r from-fuchsia-500 to-sky-500 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90"
                onClick={() => setAiOpen((v) => !v)}
              >
                ✨ AI anime avatar…
              </button>
              {draft.photo && (
                <>
                  <div className="flex rounded-full bg-slate-100 p-0.5 text-xs">
                    {STYLE_OPTIONS.map((o) => (
                      <button
                        key={o.value}
                        onClick={async () => {
                          const photo = draft.photoOriginal ? await restyle(draft.photoOriginal, o.value) : draft.photo;
                          patch({ photoStyle: o.value, photo }, 0);
                        }}
                        className={`rounded-full px-2.5 py-1 font-semibold ${draft.photoStyle === o.value ? 'bg-white text-sky-700 shadow' : 'text-slate-500'}`}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  <button className="rounded-full px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50" onClick={() => patch({ photo: null, photoOriginal: null, avatar: 'preset' }, 0)}>
                    Remove photo
                  </button>
                </>
              )}
            </div>
          )}
          <p className="text-xs text-slate-500">
            Your photo is turned into an anime-style portrait (or comic / original), with the face and hair cropped automatically and placed on the figure. It never leaves this
            computer.
          </p>
            </>
        )}
      </Section>

      {/* Outfit */}
      {draft.character !== 'vrm' && (
      <Section title="Outfit & accessories" icon="👕">
        {draft.character === 'human' && (
          <>
            <Segmented
              value={draft.outfit.style}
              options={[
                { value: 'pants', label: '👖 Trousers' },
                { value: 'skirt', label: '👗 Skirt' },
                { value: 'dress', label: '👘 Dress' },
              ]}
              onChange={(v) => patch({ outfit: { ...draft.outfit, style: v as OutfitStyle } }, 0)}
            />
            <div className="grid grid-cols-3 gap-3">
              <ColorPick label={draft.outfit.style === 'dress' ? 'Dress' : 'Top'} value={draft.outfit.top} onChange={(c) => patch({ outfit: { ...draft.outfit, top: c } })} />
              {draft.outfit.style !== 'dress' && (
                <ColorPick
                  label={draft.outfit.style === 'skirt' ? 'Skirt' : 'Trousers'}
                  value={draft.outfit.bottom}
                  onChange={(c) => patch({ outfit: { ...draft.outfit, bottom: c } })}
                />
              )}
              <ColorPick label="Shoes" value={draft.outfit.shoes} onChange={(c) => patch({ outfit: { ...draft.outfit, shoes: c } })} />
            </div>
          </>
        )}
        <div>
          <div className="mb-2 text-sm font-medium text-slate-700">Accessory</div>
          <div className="grid grid-cols-5 gap-2">
            {ACCESSORY_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => patch({ accessory: o.value }, 0)}
                className={`rounded-xl py-2 text-xs font-semibold ring-1 ${
                  draft.accessory === o.value ? 'bg-sky-600 text-white ring-sky-600' : 'bg-white text-slate-600 ring-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="text-lg">{o.icon}</div>
                {o.label}
              </button>
            ))}
          </div>
        </div>
        {draft.accessory !== 'none' && (
          <ColorPick label="Accessory colour" value={draft.accessoryColor} onChange={(c) => patch({ accessoryColor: c })} />
        )}
      </Section>
      )}

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
        <Row label="Desktop pet (3D avatar)" hint={draft.character === 'vrm' && draft.vrmName ? 'Wanders along the bottom of your screen between reminders' : 'Needs a 3D anime avatar'}>
          <Toggle label="Desktop pet" checked={draft.petMode} onChange={(v) => patch({ petMode: v }, 0)} />
        </Row>
        <Row label="Pip the mouse" hint="Peeks out from behind and runs off when you say Yes">
          <Toggle label="Show mouse" checked={draft.showMouse} onChange={(v) => patch({ showMouse: v }, 0)} />
        </Row>
      </Section>

      {/* General */}
      <Section title="General" icon="⚙️">
        <Row label="Start WaterBuddy when I log in">
          <Toggle label="Launch at login" checked={draft.launchAtLogin} onChange={(v) => patch({ launchAtLogin: v }, 0)} />
        </Row>
        <Row label={`Call ${draft.buddyName} now`} hint={`Shortcut: ${isMac ? '⌘⌥W' : 'Ctrl+Alt+W'}`}>
          <button className="rounded-full bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-sky-700" onClick={() => window.waterBuddy.callWhiskers()}>
            ▶ Try it
          </button>
        </Row>
      </Section>
    </div>
  );
}
