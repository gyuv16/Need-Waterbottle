// Main-process persistence for settings and today's water stats (JSON in the user-data folder).
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { DEFAULT_SETTINGS, sanitizeSettings, todayKey, type AppState, type Settings, type Stats } from './shared/settings';

const file = () => path.join(app.getPath('userData'), 'settings.json');

let state: AppState = { settings: DEFAULT_SETTINGS, stats: { date: todayKey(), drank: 0, skipped: 0 } };

function rollStats(stats: Stats): Stats {
  return stats.date === todayKey() ? stats : { date: todayKey(), drank: 0, skipped: 0 };
}

export function loadState(): AppState {
  try {
    const raw = JSON.parse(fs.readFileSync(file(), 'utf8'));
    const s = raw?.stats;
    state = {
      settings: sanitizeSettings(raw?.settings),
      stats: rollStats({
        date: typeof s?.date === 'string' ? s.date : todayKey(),
        drank: Number.isFinite(s?.drank) ? Math.max(0, s.drank) : 0,
        skipped: Number.isFinite(s?.skipped) ? Math.max(0, s.skipped) : 0,
      }),
    };
  } catch {
    // First run or unreadable file: keep defaults.
  }
  return state;
}

function save() {
  try {
    fs.mkdirSync(path.dirname(file()), { recursive: true });
    const tmp = `${file()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
    fs.renameSync(tmp, file());
  } catch (err) {
    console.error('Could not save settings', err);
  }
}

export function getState(): AppState {
  state = { ...state, stats: rollStats(state.stats) };
  return state;
}

export function updateSettings(patch: Partial<Settings>): AppState {
  state = { ...getState(), settings: sanitizeSettings(patch, state.settings) };
  save();
  return state;
}

export function recordAnswer(drank: boolean): AppState {
  const stats = getState().stats;
  state = { ...state, stats: drank ? { ...stats, drank: stats.drank + 1 } : { ...stats, skipped: stats.skipped + 1 } };
  save();
  return state;
}

export function resetToday(): AppState {
  state = { ...state, stats: { date: todayKey(), drank: 0, skipped: 0 } };
  save();
  return state;
}
