import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('waterBuddy', {
  platform: process.platform,
  // Called when the user picks "Remind me now" from the tray menu.
  onRemindNow: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('remind-now', listener);
    return () => ipcRenderer.removeListener('remind-now', listener);
  },
});
