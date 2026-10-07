// Injected by @electron-forge/plugin-webpack
declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;
declare const SETTINGS_WINDOW_WEBPACK_ENTRY: string;
declare const SETTINGS_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

declare module '*.png' { const src: string; export default src; }
declare module '*.svg' { const src: string; export default src; }
declare module '*.webp' { const src: string; export default src; }

// webpack's require.context (used to bundle every character frame)
declare namespace NodeJS {
  interface Require {
    context(dir: string, recursive: boolean, filter: RegExp): { (id: string): string; keys(): string[] };
  }
}

// Shape Detection API (enabled in main.ts); backed by the OS face detector on Windows and macOS.
declare class FaceDetector {
  constructor(options?: { fastMode?: boolean; maxDetectedFaces?: number });
  detect(image: ImageBitmapSource): Promise<{ boundingBox: DOMRectReadOnly }[]>;
}

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
    saveVrm: (data: ArrayBuffer, name: string) => Promise<import('./shared/settings').AppState>;
    loadVrm: () => Promise<ArrayBuffer | null>;
    onVrmChanged: (callback: () => void) => () => void;
    animeLocal: (pixels: Float32Array) => Promise<{ ok: boolean; pixels?: Float32Array; error?: string }>;
    aiHasKey: () => Promise<boolean>;
    aiSetKey: (key: string | null) => Promise<'saved' | 'session' | 'removed'>;
    aiGenerate: (req: { image: ArrayBuffer; mime: string; prompt: string }) => Promise<{ ok: boolean; dataUrl?: string; error?: string }>;
    callWhiskers: () => void;
    openSettings: () => void;
  };
}
