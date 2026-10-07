import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('waterBuddy', {
  platform: process.platform,
  // Called when the user picks "Call Whiskers" (tray menu, tray click or shortcut).
  onRemindNow: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('remind-now', listener);
    return () => ipcRenderer.removeListener('remind-now', listener);
  },
  // Lets the Yes / No buttons receive clicks while the rest stays click-through.
  setClickable: (clickable: boolean) => ipcRenderer.send('set-clickable', clickable),
});
