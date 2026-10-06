# WaterBuddy 💧

A transparent, click-through, always-on-top overlay for macOS and Windows. Every 60 minutes, a 2D avatar walks across the screen with a "Time to drink water!" bubble.

## How this project was set up (for reference)
```bash
npx create-electron-app@latest water-buddy --template=webpack-typescript
cd water-buddy
npm i react react-dom
npm i -D @types/react @types/react-dom tailwindcss@3 postcss postcss-loader autoprefixer
npm i -D @electron-forge/maker-squirrel @electron-forge/maker-dmg
```

## Run
```bash
npm install
npm start            # dev mode: reminder fires every 10 seconds
```
The app has no window chrome and no Dock or taskbar icon. To quit it, use the 💧 icon in the tray or menu bar.

## Build installers
```bash
npm run make         # builds installers for the OS you're on
```
| OS | Output |
|---|---|
| Windows | `out/make/squirrel.windows/x64/WaterBuddySetup.exe` |
| macOS | `out/make/WaterBuddy-1.0.0-<arch>.dmg` |

You must build the `.dmg` on a Mac. Build the `.exe` on Windows; on macOS or Linux you can build it only with Wine and Mono installed. For public distribution, sign the apps. On macOS, also notarize the app (`osxSign` / `osxNotarize` in `packagerConfig`).

## CI builds
Every push to `main` builds the Windows `.exe` and macOS `.dmg` on GitHub Actions (**Actions → Build installers → Artifacts**).
To publish a release with both installers attached:
```bash
git tag v1.0.0 && git push origin v1.0.0
```

## Configuration
- `src/config.ts`: set the reminder interval, walk duration and sprite geometry.
- `src/assets/walker.svg`: swap in your own one-row sprite sheet. Then update `frameWidth`, `frameHeight` and `frames`.
