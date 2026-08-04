# e6client

Cross-platform client for e926-compatible hosts with support for web, Android, iOS, and desktop (Windows, macOS, Linux).

## Features

- **Tag-based search** with live autocomplete and search history
- **Masonry, list and compact layouts** with responsive column distribution
- **Post detail view** with full metadata, tags by category, sources, score and comments
- **Pinch-to-zoom** on images in the post detail viewer
- **Video playback** with native fullscreen and screen-orientation controls
- **SVG rendering** support for SVG posts
- **Favorites** — log in with your e621/e926 account to browse your favorites
- **Multi-account / custom instance support** — switch between several e621/e926/Self21 accounts
- **Configurable CORS proxy** for environments where direct API access is blocked
- **Image upload / post creation** (requires API key)
- **Save to device gallery** and **share posts externally**
- **In-app WebView** for external links via Capacitor Browser
- **App lock / PIN privacy guard** and **secure app switcher** blur
- **Push & local notifications** (native) with web service-worker fallback
- **Deep linking** — open `e6client://posts/<id>` or `https://e621.net/posts/<id>` directly
- **Offline caching** of posts via IndexedDB
- **Pull-to-refresh** and infinite scroll
- **Custom accent color** and light/dark/system theme support
- **Localization (i18n)** — English and Russian translations included
- **Keyboard shortcuts** for navigation, search and view switching

## Getting started

### Prerequisites

- Node.js 22+
- npm 10+
- (Optional) Android Studio + JDK 21 for Android builds
- (Optional) Xcode for iOS builds
- (Optional) Rust + system dependencies for Tauri builds

### Install and run

```bash
npm install
npm run dev
```

The app is served at `http://localhost:3000`.

### Build the web bundle

```bash
npm run build
```

Output is written to `dist/`.

## Desktop

### Electron

```bash
npm run electron-dev                 # dev
npm run build-electron               # current platform
npm run build-electron-linux         # Linux
npm run build-electron-windows       # Windows
npm run build-electron-mac           # macOS
```

### Tauri (true native desktop binaries)

```bash
npm run tauri-dev     # dev
npm run tauri-build   # Linux / Windows / macOS bundles
```

The Tauri binary is built to `src-tauri/target/release/app`. Bundle outputs land in `src-tauri/target/release/bundle/`.

## Mobile (Capacitor)

### Android

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleRelease
```

### iOS

```bash
npm run build
npx cap sync ios
npx cap open ios   # opens Xcode
```

## Keyboard shortcuts

| Key   | Action                |
| ----- | --------------------- |
| `/`   | Focus search bar      |
| `R`   | Refresh posts         |
| `X`   | Load a random post    |
| `S`   | Open settings         |
| `H`   | Go to home / browse   |
| `F`   | Go to favorites       |
| `V`   | Toggle view mode      |
| `Esc` | Close modal / overlay |
| `?`   | Show shortcuts help   |

## Scripts

| Script                   | Description                                |
| ------------------------ | ------------------------------------------ |
| `npm run dev`            | Start Vite dev server                      |
| `npm run build`          | Production web build                       |
| `npm run preview`        | Preview the production build               |
| `npm test`               | Run Vitest test suite                      |
| `npm run electron-dev`   | Launch Electron against the dev server     |
| `npm run build-electron` | Build web + package Electron desktop app   |
| `npm run tauri-dev`      | Launch Tauri dev window                    |
| `npm run tauri-build`    | Build web + compile Tauri native binaries  |

## Remaining work / TODO

- Full end-to-end testing on physical iOS and Android devices.
- Push notification server/VAPID key setup for the web build.
- Native biometric auth plugin integration (PIN lock is implemented; biometric is a stub on web).
- Optional native SQLite backend for offline cache (currently Dexie/IndexedDB).
- PWA manifest and installability improvements.
- More language translations.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
