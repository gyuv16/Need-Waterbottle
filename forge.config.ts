import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { MakerZIP } from '@electron-forge/maker-zip';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import fs from 'fs';
import path from 'path';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const config: ForgeConfig = {
  packagerConfig: {
    name: 'WaterBuddy',
    executableName: 'water-buddy',
    asar: true,
    appBundleId: 'com.waterbuddy.app',
    // Hide the macOS Dock icon at the OS level too (no flash before app.dock.hide()).
    extendInfo: { LSUIElement: true },
    // Offline photo → anime model + its runtime, shipped next to the app (outside the asar).
    extraResource: ['anime'],
  },
  rebuildConfig: {},
  hooks: {
    // Copy the onnxruntime WebAssembly files the offline anime worker needs into anime/ort.
    generateAssets: async () => {
      const src = path.join(__dirname, 'node_modules', 'onnxruntime-web', 'dist');
      const dst = path.join(__dirname, 'anime', 'ort');
      fs.mkdirSync(dst, { recursive: true });
      for (const f of ['ort.node.min.mjs', 'ort-wasm-simd-threaded.mjs', 'ort-wasm-simd-threaded.wasm']) {
        fs.copyFileSync(path.join(src, f), path.join(dst, f));
      }
    },
  },
  makers: [
    // Windows → out/make/squirrel.windows/x64/WaterBuddy-1.0.0 Setup.exe
    new MakerSquirrel({
      name: 'WaterBuddy',
      setupExe: 'WaterBuddySetup.exe',
      authors: 'gyuv16',
    }),
    // Name includes the arch so Apple Silicon (arm64) and Intel (x64) builds don't collide.
    new MakerDMG((arch) => ({
      name: `WaterBuddy-${arch}`,
      format: 'ULFO',
    })),
    new MakerZIP({}, ['darwin']),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      // Webpack dev server CSP: allow inline styles used by Tailwind/style-loader.
      devContentSecurityPolicy: "default-src 'self' 'unsafe-inline' data:; script-src 'self' 'unsafe-eval'",
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/index.html',
            js: './src/renderer.tsx',
            name: 'main_window',
            preload: { js: './src/preload.ts' },
          },
          {
            html: './src/settings.html',
            js: './src/settings.tsx',
            name: 'settings_window',
            preload: { js: './src/preload.ts' },
          },
        ],
      },
    }),
  ],
};

export default config;
