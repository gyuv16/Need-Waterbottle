import { app, BrowserWindow, screen, Tray, Menu, nativeImage } from 'electron';

// Handle Squirrel install/uninstall shortcuts on Windows.
// eslint-disable-next-line @typescript-eslint/no-var-requires
if (require('electron-squirrel-startup')) app.quit();

let overlay: BrowserWindow | null = null;
let tray: Tray | null = null;

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
    skipTaskbar: true, // Windows: hide from taskbar / Alt+Tab
    alwaysOnTop: true,
    fullscreenable: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // keep timers accurate while "hidden"
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

function createTray(): void {
  // Tiny 16x16 water-drop so the user can still quit the hidden app.
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVR4nGNgGNTAYsGH/yA8MAbANJNtCEUGoGsmyRBcmok2ZNQAKhiAzxCiNNMdAABRKMf5vVXOwwAAAABJRU5ErkJggg==',
  );
  tray = new Tray(icon);
  tray.setToolTip('WaterBuddy – stay hydrated');
  tray.setContextMenu(Menu.buildFromTemplate([{ label: 'Quit WaterBuddy', click: () => app.quit() }]));
}

app.whenReady().then(() => {
  // macOS: remove from Dock and Cmd+Tab switcher.
  if (process.platform === 'darwin') app.dock?.hide();

  createOverlay();
  createTray();

  // Re-fit the overlay if the display resolution changes.
  screen.on('display-metrics-changed', () => {
    if (!overlay) return;
    overlay.setBounds(screen.getPrimaryDisplay().bounds);
  });
});

// Background widget: keep running until explicitly quit from the tray.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createOverlay();
});
