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
  saveVrm: (data: ArrayBuffer, name: string): Promise<AppState> => ipcRenderer.invoke('vrm:save', data, name),
  loadVrm: (): Promise<ArrayBuffer | null> => ipcRenderer.invoke('vrm:load'),
  onVrmChanged: (callback: () => void) => {
    const listener = () => callback();
    ipcRenderer.on('vrm-changed', listener);
    return () => ipcRenderer.removeListener('vrm-changed', listener);
  },
  aiHasKey: (): Promise<boolean> => ipcRenderer.invoke('ai:hasKey'),
  aiSetKey: (key: string | null): Promise<'saved' | 'session' | 'removed'> => ipcRenderer.invoke('ai:setKey', key),
  aiGenerate: (req: { image: ArrayBuffer; mime: string; prompt: string }): Promise<{ ok: boolean; dataUrl?: string; error?: string }> =>
    ipcRenderer.invoke('ai:generate', req),
  callWhiskers: () => ipcRenderer.send('call-whiskers'),
  openSettings: () => ipcRenderer.send('open-settings'),
});
