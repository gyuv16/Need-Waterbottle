// Injected by @electron-forge/plugin-webpack
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const SETTINGS_WINDOW_WEBPACK_ENTRY: string;
declare const SETTINGS_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

declare module '*.png' { const src: string; export default src; }
declare module '*.svg' { const src: string; export default src; }
declare module '*.webp' { const src: string; export default src; }

interface Window {
  waterBuddy: {
    platform: NodeJS.Platform;
    onRemindNow: (callback: () => void) => () => void;
    setClickable: (clickable: boolean) => void;
    setOverlayActive: (active: boolean) => void;
    getState: () => Promise<import('./shared/settings').AppState>;
    updateSettings: (patch: Partial<import('./shared/settings').Settings>) => Promise<import('./shared/settings').AppState>;
    recordAnswer: (drank: boolean) => Promise<import('./shared/settings').AppState>;
    resetToday: () => Promise<import('./shared/settings').AppState>;
    onStateChanged: (callback: (state: import('./shared/settings').AppState) => void) => () => void;
    callWhiskers: () => void;
    openSettings: () => void;
  };
}
