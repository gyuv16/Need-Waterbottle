import { app, BrowserWindow, screen, Tray, Menu, nativeImage, ipcMain, globalShortcut } from 'electron';
import path from 'path';
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
    if (active) {
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
