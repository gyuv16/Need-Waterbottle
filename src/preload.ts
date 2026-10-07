import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { AppState, Settings } from './shared/settings';

contextBridge.exposeInMainWorld('waterBuddy', {
  platform: process.platform,
  // Called when the user picks "Call Whiskers" (tray menu, tray click, shortcut or Settings).
  onRemindNow: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('remind-now', listener);
    return () => ipcRenderer.removeListener('remind-now', listener);
  },
  // Lets the Yes / No buttons receive clicks while the rest stays click-through.
  setClickable: (clickable: boolean) => ipcRenderer.send('set-clickable', clickable),
  // Shows the overlay window only while a scene is playing.
  setOverlayActive: (active: boolean) => ipcRenderer.send('overlay:active', active),

  getState: (): Promise<AppState> => ipcRenderer.invoke('state:get'),
  updateSettings: (patch: Partial<Settings>): Promise<AppState> => ipcRenderer.invoke('settings:update', patch),
  recordAnswer: (drank: boolean): Promise<AppState> => ipcRenderer.invoke('stats:answer', drank),
  resetToday: (): Promise<AppState> => ipcRenderer.invoke('stats:reset'),
  onStateChanged: (callback: (state: AppState) => void) => {
    const listener = (_e: IpcRendererEvent, state: AppState) => callback(state);
    ipcRenderer.on('state-changed', listener);
    return () => ipcRenderer.removeListener('state-changed', listener);
  },
  callWhiskers: () => ipcRenderer.send('call-whiskers'),
  openSettings: () => ipcRenderer.send('open-settings'),
});
