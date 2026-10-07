// Injected by @electron-forge/plugin-webpack
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

declare module '*.png' { const src: string; export default src; }
declare module '*.svg' { const src: string; export default src; }
declare module '*.webp' { const src: string; export default src; }

interface Window {
  waterBuddy: {
    platform: NodeJS.Platform;
    onRemindNow: (callback: () => void) => () => void;
    setClickable: (clickable: boolean) => void;
  };
}
