import { app, BrowserWindow, screen, Tray, Menu, nativeImage, ipcMain, globalShortcut, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs';
import { Worker } from 'worker_threads';
import { getState, loadState, recordAnswer, resetToday, updateSettings } from './store';
import type { AppState, Settings } from './shared/settings';

// Handle Squirrel install/uninstall shortcuts on Windows.
// eslint-disable-next-line @typescript-eslint/no-var-requires
if (require('electron-squirrel-startup')) app.quit();

// Enables the browser's FaceDetector (Shape Detection API), which uses the face detection built
// into Windows and macOS. It finds the face for the automatic photo crop, with no extra download.
app.commandLine.appendSwitch('enable-experimental-web-platform-features');

let overlay: BrowserWindow | null = null;
let settingsWin: BrowserWindow | null = null;
let tray: Tray | null = null;

// Global shortcut to call the cat: Ctrl+Alt+W on Windows, Cmd+Option+W on macOS.
const CALL_SHORTCUT = 'CommandOrControl+Alt+W';

function callWhiskers(): void {
  overlay?.webContents.send('remind-now');
}

/** Send the latest settings and stats to every open window, and refresh the tray menu. */
function broadcast(state: AppState): void {
  for (const win of BrowserWindow.getAllWindows()) win.webContents.send('state-changed', state);
  buildTrayMenu();
}

function applyLaunchAtLogin(enabled: boolean): void {
  if (!app.isPackaged) return;
  if (process.platform === 'win32') {
    // Squirrel installs run through Update.exe so the shortcut survives app updates.
    app.setLoginItemSettings({
      openAtLogin: enabled,
      path: path.resolve(path.dirname(process.execPath), '..', 'Update.exe'),
      args: ['--processStart', `"${path.basename(process.execPath)}"`],
    });
  } else {
    app.setLoginItemSettings({ openAtLogin: enabled });
  }
}

function createOverlay(): void {
  const { bounds } = screen.getPrimaryDisplay();

  overlay = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    focusable: false, // never steal keyboard focus
    show: false, // only shown while a reminder scene is playing (saves GPU/CPU when idle)
    skipTaskbar: true, // Windows: hide from taskbar / Alt+Tab
    alwaysOnTop: true,
    fullscreenable: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // keep timers accurate while hidden
      spellcheck: false,
    },
  });

  // Highest practical z-order: above full-screen apps on macOS & Windows.
  overlay.setAlwaysOnTop(true, 'screen-saver', 1);
  // macOS: follow the user across every Space, including full-screen ones.
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Fully click-through; mouse moves are still forwarded to the page.
  overlay.setIgnoreMouseEvents(true, { forward: true });

  overlay.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  overlay.on('closed', () => (overlay = null));
}

function openSettings(): void {
  if (settingsWin) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  settingsWin = new BrowserWindow({
    width: 600,
    height: 780,
    minWidth: 520,
    minHeight: 560,
    title: 'WaterBuddy Settings',
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: SETTINGS_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  settingsWin.setMenuBarVisibility(false);
  settingsWin.loadURL(SETTINGS_WINDOW_WEBPACK_ENTRY);
  settingsWin.once('ready-to-show', () => {
    settingsWin?.show();
    if (process.platform === 'darwin') app.focus({ steal: true });
  });
  settingsWin.on('closed', () => (settingsWin = null));
}

function buildTrayMenu(): void {
  if (!tray) return;
  const { settings, stats } = getState();
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Call ${settings.buddyName} ${settings.character === 'human' ? '🙋' : '🐾'}`, accelerator: CALL_SHORTCUT, click: callWhiskers },
      { label: `Today: ${stats.drank} of ${settings.dailyGoal} glasses 💧`, enabled: false },
      { type: 'separator' },
      {
        label: 'Hourly reminders',
        type: 'checkbox',
        checked: settings.remindersEnabled,
        click: (item) => broadcast(updateSettings({ remindersEnabled: item.checked })),
      },
      { label: 'Settings…', click: openSettings },
      { type: 'separator' },
      { label: 'Quit WaterBuddy', click: () => app.quit() },
    ]),
  );
}

function createTray(): void {
  // Tiny 16x16 water-drop so the user can still reach the hidden app.
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVR4nGNgGNTAYsGH/yA8MAbANJNtCEUGoGsmyRBcmok2ZNQAKhiAzxCiNNMdAABRKMf5vVXOwwAAAABJRU5ErkJggg==',
  );
  tray = new Tray(icon);
  tray.setToolTip(`WaterBuddy – click to call ${getState().settings.buddyName}`);
  buildTrayMenu();
  // Windows: a left-click on the tray icon calls Whiskers straight away (right-click opens the menu).
  // macOS always opens the menu on click, so the menu item is used there.
  if (process.platform !== 'darwin') tray.on('click', callWhiskers);
}

function registerIpc(): void {
  // Only the Yes / No buttons are clickable, and only while the pointer is over them.
  ipcMain.on('set-clickable', (_event, clickable: boolean) => {
    overlay?.setIgnoreMouseEvents(!clickable, { forward: true });
  });
  // The overlay is hidden between reminders; the scene shows it when it starts and hides it when done.
  ipcMain.on('overlay:active', (_event, active: boolean) => {
    if (!overlay) return;
    // Desktop-pet mode keeps the overlay visible so the 3D avatar can wander between reminders.
    const pet = getState().settings.petMode && getState().settings.character === 'vrm' && !!getState().settings.vrmName;
    if (active || pet) {
      overlay.setAlwaysOnTop(true, 'screen-saver', 1);
      overlay.showInactive();
    } else {
      overlay.setIgnoreMouseEvents(true, { forward: true });
      overlay.hide();
    }
  });
  ipcMain.handle('state:get', () => getState());
  ipcMain.handle('settings:update', (_event, patch: Partial<Settings>) => {
    const before = getState().settings.launchAtLogin;
    const state = updateSettings(patch);
    if (state.settings.launchAtLogin !== before) applyLaunchAtLogin(state.settings.launchAtLogin);
    broadcast(state);
    return state;
  });
  ipcMain.handle('stats:answer', (_event, drank: boolean) => {
    const state = recordAnswer(Boolean(drank));
    broadcast(state);
    return state;
  });
  ipcMain.handle('stats:reset', () => {
    const state = resetToday();
    broadcast(state);
    return state;
  });
  // 3D avatar: the .vrm file is stored next to settings.json (it can be tens of MB).
  const vrmPath = () => path.join(app.getPath('userData'), 'avatar.vrm');
  ipcMain.handle('vrm:save', (_event, data: ArrayBuffer, name: string) => {
    const buf = Buffer.from(data);
    // VRM files are binary glTF: they start with "glTF".
    if (buf.length < 20 || buf.length > 120 * 1024 * 1024 || buf.toString('ascii', 0, 4) !== 'glTF') {
      throw new Error('That file is not a VRM avatar (.vrm).');
    }
    fs.writeFileSync(vrmPath(), buf);
    const state = updateSettings({ vrmName: String(name).slice(0, 120), character: 'vrm' });
    broadcast(state);
    for (const win of BrowserWindow.getAllWindows()) win.webContents.send('vrm-changed');
    return state;
  });
  ipcMain.handle('vrm:load', () => {
    try {
      const buf = fs.readFileSync(vrmPath());
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    } catch {
      return null;
    }
  });
  // ---- AI anime avatar (optional, user's own OpenAI key) ---------------------------------------
  // The key is encrypted with the OS keychain (safeStorage) and never leaves the main process.
  // A photo is sent to OpenAI only when the user presses "Generate" in Settings.
  const keyPath = () => path.join(app.getPath('userData'), 'ai-key.bin');
  // Without an OS keychain the key is only kept in memory for this session (never written in plain text).
  let sessionKey: string | null = null;
  const readKey = (): string | null => {
    if (sessionKey) return sessionKey;
    try {
      const enc = fs.readFileSync(keyPath());
      return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(enc) : null;
    } catch {
      return null;
    }
  };
  // Offline photo → anime (AnimeGANv2 on this computer, no network). The model runs in a worker
  // thread so the app never freezes; the worker is started on first use and kept for the session.
  let animeWorker: Worker | null = null;
  let animeJob = 0;
  const animePending = new Map<number, (r: { ok: boolean; pixels?: Float32Array; error?: string }) => void>();
  const getAnimeWorker = (): Worker => {
    if (animeWorker) return animeWorker;
    const dir = app.isPackaged ? path.join(process.resourcesPath, 'anime') : path.join(app.getAppPath(), 'anime');
    const w = new Worker(path.join(dir, 'worker.mjs'));
    w.on('message', (m: { id: number; pixels?: Float32Array; error?: string }) => {
      animePending.get(m.id)?.(m.error ? { ok: false, error: m.error } : { ok: true, pixels: m.pixels });
      animePending.delete(m.id);
    });
    const fail = (err: unknown) => {
      for (const done of animePending.values()) done({ ok: false, error: `The anime model stopped: ${String(err)}` });
      animePending.clear();
      animeWorker = null;
    };
    w.on('error', fail);
    w.on('exit', (code) => code && fail(`exit ${code}`));
    animeWorker = w;
    return w;
  };
  ipcMain.handle('anime:local', (_event, pixels: Float32Array) => {
    if (!(pixels instanceof Float32Array) || pixels.length !== 3 * 512 * 512) return { ok: false, error: 'Bad image size.' };
    const id = ++animeJob;
    return new Promise((resolve) => {
      animePending.set(id, resolve);
      getAnimeWorker().postMessage({ id, pixels }, [pixels.buffer]);
    });
  });
  ipcMain.handle('ai:hasKey', () => !!readKey());
  ipcMain.handle('ai:setKey', (_event, key: string | null): 'saved' | 'session' | 'removed' => {
    if (!key) {
      sessionKey = null;
      fs.rmSync(keyPath(), { force: true });
      return 'removed';
    }
    if (!safeStorage.isEncryptionAvailable()) {
      sessionKey = String(key).trim();
      return 'session';
    }
    fs.writeFileSync(keyPath(), safeStorage.encryptString(String(key).trim()));
    return 'saved';
  });
  ipcMain.handle('ai:generate', async (_event, req: { image: ArrayBuffer; mime: string; prompt: string }) => {
    const key = readKey();
    if (!key) return { ok: false, error: 'Add your OpenAI API key first.' };
    const bytes = Buffer.from(req.image);
    if (bytes.length === 0 || bytes.length > 25 * 1024 * 1024) return { ok: false, error: 'Use a photo under 25 MB.' };
    const mime = ['image/png', 'image/jpeg', 'image/webp'].includes(req.mime) ? req.mime : 'image/png';
    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('prompt', String(req.prompt).slice(0, 4000));
    form.append('size', '1024x1024');
    form.append('quality', 'high');
    form.append('image', new Blob([bytes], { type: mime }), `photo.${mime.split('/')[1]}`);
    try {
      const res = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}` },
        body: form,
        signal: AbortSignal.timeout(180_000),
      });
      const json = (await res.json().catch(() => ({}))) as { data?: { b64_json?: string }[]; error?: { message?: string } };
      if (!res.ok) {
        const friendly: Record<number, string> = {
          401: 'That API key was not accepted. Check it at platform.openai.com → API keys.',
          403: 'Access was refused (the key may lack image access, or the service is blocked on this network).',
          429: 'Rate limit or credit limit reached on your OpenAI account. Try again later.',
        };
        const detail = json.error?.message;
        return { ok: false, error: friendly[res.status] ?? detail ?? `The image service answered ${res.status}.` };
      }
      const b64 = json.data?.[0]?.b64_json;
      if (!b64) return { ok: false, error: 'The image service returned no picture.' };
      return { ok: true, dataUrl: `data:image/png;base64,${b64}` };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, error: /timeout|abort/i.test(msg) ? 'The image service took too long. Try again.' : `Could not reach the image service (${msg}).` };
    }
  });
  ipcMain.on('call-whiskers', callWhiskers);
  ipcMain.on('open-settings', openSettings);
}

app.whenReady().then(() => {
  // macOS: remove from Dock and Cmd+Tab switcher.
  if (process.platform === 'darwin') app.dock?.hide();

  const state = loadState();
  applyLaunchAtLogin(state.settings.launchAtLogin);
  registerIpc();
  createOverlay();
  createTray();
  globalShortcut.register(CALL_SHORTCUT, callWhiskers);

  // Re-fit the overlay if the display resolution changes.
  screen.on('display-metrics-changed', () => {
    if (!overlay) return;
    overlay.setBounds(screen.getPrimaryDisplay().bounds);
  });
});

app.on('will-quit', () => globalShortcut.unregisterAll());

// Background widget: keep running until explicitly quit from the tray.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (!overlay) createOverlay();
});
