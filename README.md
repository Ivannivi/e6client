# e6client

Cross-platform client for e926 hosts with support for web, Android, and desktop (Windows, macOS, Linux)

## Features

- **Tag-based search** with live autocomplete and search history
- **Masonry and list layouts** with responsive column distribution
- **Post detail view** with full metadata, tags by category, sources and score
- **Favorites** — log in with your e621 account to browse your favorites
- **Multi-account support** — switch between several e621/e926 accounts
- **Configurable CORS proxy** for environments where direct API access is blocked
- **Keyboard shortcuts** for navigation, search and view switching

## Getting started

### Prerequisites

- Node.js 22+
- npm 10+

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

## Desktop (Electron)

Run the desktop shell against the dev server:

```bash
npm run electron-dev
```

Package a desktop build for your current OS:

```bash
npm run build-electron          # current platform
npm run build-electron-linux    # Linux
npm run build-electron-windows  # Windows
npm run build-electron-mac      # macOS
```

## Android (Capacitor)

```bash
npm run build
npx cap sync android
cd android
./gradlew assembleRelease
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

| Script                  | Description                          |
| ----------------------- | ------------------------------------ |
| `npm run dev`           | Start Vite dev server                |
| `npm run build`         | Production web build                 |
| `npm run preview`       | Preview the production build         |
| `npm test`              | Run Vitest test suite                |
| `npm run electron`      | Launch Electron on the built bundle  |
| `npm run electron-dev`  | Launch Electron against the dev server |
| `npm run build-electron`| Build web + package desktop app      |

## License

See the [LICENSE](LICENSE) file.
