# e6client

<div align="center">
  <img src="https://raw.githubusercontent.com/Ivannivi/e6client/main/android/app/src/main/res/drawable/ic_launcher_background.xml" alt="e6client logo" width="100" height="100">
  <h3>A beautiful, modern client for e621/e926</h3>
</div>

## 📱 About

e6client is a React-based mobile application for browsing e621 and e926 content. Built with TypeScript, Tailwind CSS, and Capacitor for native Android deployment.

### ✨ Features

- 🔍 **Advanced Search** - Search by tags with autocomplete
- ❤️ **Favorites** - Save and filter your favorite posts
- 📱 **Mobile-First** - Optimized for mobile devices
- 🌙 **Dark Mode** - Automatic dark/light theme support
- 🔒 **Privacy Controls** - Blacklist tags and content filtering
- 📶 **Offline Support** - Proxy support for restricted networks
- 📱 **Native Android App** - Built with Capacitor for native performance

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Android Studio + Java 21** (for Android APK builds only)
- **Xcode** (for macOS builds only)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ivannivi/e6client.git
   cd e6client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API Access** (Optional)
   - For e621: No API key required
   - For e926: Set `API_KEY` in settings for higher rate limits

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   - Visit `http://localhost:5173`

## 🏗️ Building & Deployment

### Android APK

#### Prerequisites (All Platforms)

1. **Install Android SDK**
   ```bash
   # Linux (Arch)
   sudo pacman -S android-sdk

   # Linux (Ubuntu/Debian)
   sudo apt update
   sudo apt install android-sdk

   # macOS
   brew install android-sdk

   # Windows (via Chocolatey)
   choco install android-sdk

   # Or download manually from https://developer.android.com/studio#downloads
   ```

2. **Install Java 21**
   ```bash
   # Linux (Arch)
   sudo pacman -S jdk21-openjdk
   sudo archlinux-java set java-21-openjdk

   # Linux (Ubuntu/Debian)
   sudo apt install openjdk-21-jdk

   # macOS
   brew install openjdk@21
   echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc

   # Windows (via Chocolatey)
   choco install openjdk21
   ```

3. **Set up environment variables**
   ```bash
   # Linux/macOS - Add to ~/.bashrc or ~/.zshrc
   export ANDROID_HOME=$HOME/Android/Sdk
   export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
   export JAVA_HOME=/usr/lib/jvm/java-21-openjdk  # Adjust path as needed

   # Windows - Add to System Environment Variables
   # ANDROID_HOME = C:\Users\%USERNAME%\Android\Sdk
   # JAVA_HOME = C:\Program Files\Java\jdk-21
   # Add to PATH: %ANDROID_HOME%\tools, %ANDROID_HOME%\platform-tools
   ```

4. **Accept Android SDK licenses**
   ```bash
   # Linux/macOS
   yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses

   # Windows (PowerShell)
   echo "y" | %ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat --licenses
   ```

#### Build Android APK

```bash
# Build web assets
npm run build

# Sync with Capacitor
npx cap sync android

# Build debug APK
cd android
./gradlew assembleDebug  # Linux/macOS
gradlew.bat assembleDebug  # Windows

# Find your APK
ls app/build/outputs/apk/debug/app-debug.apk
```

#### Install on Android Device

```bash
# Via ADB (device connected)
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or transfer APK file to device and install manually
```

### Linux Desktop App

#### Prerequisites

```bash
# Arch Linux
sudo pacman -S electron

# Ubuntu/Debian
sudo apt install electron

# Or install via npm globally
npm install -g electron
```

#### Build Linux App

```bash
# Install electron-builder
npm install -g electron-builder

# Build for Linux
npm run build
npx cap sync @capacitor-community/electron
npx cap open @capacitor-community/electron

# Or create distributable
electron-builder --linux
```

### Windows Desktop App

#### Prerequisites

```bash
# Install Electron
npm install -g electron

# Install electron-builder
npm install -g electron-builder
```

#### Build Windows App

```bash
# Build web assets
npm run build

# Sync with Electron
npx cap sync @capacitor-community/electron

# Build distributable
electron-builder --win

# Or run directly
npx cap open @capacitor-community/electron
```

### macOS Desktop App

#### Prerequisites

```bash
# Install Xcode from App Store or https://developer.apple.com/xcode/

# Install Electron
npm install -g electron

# Install electron-builder
npm install -g electron-builder
```

#### Build macOS App

```bash
# Build web assets
npm run build

# Sync with Electron
npx cap sync @capacitor-community/electron

# Build distributable
electron-builder --mac

# Or run directly
npx cap open @capacitor-community/electron
```

### Web Deployment

#### Static Hosting

The app can be deployed as a static website:

```bash
# Build for production
npm run build

# Deploy dist/ folder to any static host:
# - Netlify
# - Vercel
# - GitHub Pages
# - Firebase Hosting
# - AWS S3 + CloudFront
```

#### Docker Deployment

```dockerfile
# Dockerfile
FROM nginx:alpine
COPY dist/ /usr/share/nginx/html/
EXPOSE 80
```

```bash
# Build and run
docker build -t e6client .
docker run -p 8080:80 e6client
```

## 🛠️ Development

### Project Structure

```
e6client/
├── src/
│   ├── components/     # React components
│   │   ├── PostCard.tsx
│   │   ├── PostDetail.tsx
│   │   └── SettingsModal.tsx
│   ├── hooks/          # Custom React hooks
│   │   └── useSettings.ts
│   ├── services/       # API services
│   │   └── api.ts
│   ├── types.ts        # TypeScript type definitions
│   ├── constants.ts    # App constants
│   └── App.tsx         # Main app component
├── android/            # Capacitor Android project
├── public/             # Static assets
└── dist/               # Built web assets
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Capacitor Commands

- `npx cap sync` - Sync web assets to all platforms
- `npx cap sync android` - Sync to Android only
- `npx cap open android` - Open in Android Studio

## ⚙️ Configuration

### API Settings

The app supports both e621 and e926 APIs:

- **e621**: Adult content (requires account for some features)
- **e926**: Safe content only

### App Settings

Accessible via the settings modal (⚙️ icon):

- **API Key**: For higher rate limits and private favorites
- **Username**: For accessing personal favorites
- **Blacklisted Tags**: Hide posts with specific tags
- **Proxy Settings**: For networks that block e621/e926

## 🔧 Troubleshooting

### Android Issues

**Build fails with Java version error**
```bash
# Linux (Arch)
sudo pacman -S jdk21-openjdk
sudo archlinux-java set java-21-openjdk

# Linux (Ubuntu/Debian)
sudo apt install openjdk-21-jdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64

# macOS
brew install openjdk@21
echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zshrc
echo 'export JAVA_HOME="/opt/homebrew/opt/openjdk@21"' >> ~/.zshrc

# Windows
# Download JDK 21 from https://adoptium.net/
# Set JAVA_HOME and add to PATH
```

**Android SDK not found**
```bash
# Linux/macOS
export ANDROID_HOME=$HOME/Android/Sdk
echo "sdk.dir=$HOME/Android/Sdk" > android/local.properties

# Windows
# Set ANDROID_HOME = C:\Users\%USERNAME%\Android\Sdk
# Create android/local.properties with: sdk.dir=C:\\Users\\%USERNAME%\\Android\\Sdk
```

**APK won't install**
- Enable "Install unknown apps" in Android settings
- Check device storage space
- Try `adb install -r` to reinstall
- Verify APK signature: `jarsigner -verify app-debug.apk`

**Gradle build fails**
```bash
# Clear Gradle cache
cd android
./gradlew clean  # Linux/macOS
gradlew.bat clean  # Windows

# Reset Capacitor
rm -rf node_modules package-lock.json
npm install
npx cap sync android
```

### Desktop App Issues

**Electron build fails**
```bash
# Install missing dependencies
npm install -g electron-builder

# Clear electron cache
npx electron-builder install-app-deps

# For Linux desktop builds
sudo apt-get install libnss3-dev libatk-bridge2.0-dev libdrm2 libxkbcommon-dev libgtk-3-dev
```

**macOS code signing issues**
```bash
# Disable code signing for development
export CSC_IDENTITY_AUTO_DISCOVERY=false
electron-builder --mac --publish=never
```

**Windows build issues**
```bash
# Install Windows Build Tools
npm install -g windows-build-tools

# Or use Chocolatey
choco install visualstudio2019-workload-vctools
```

### General Development Issues

**Node.js version issues**
```bash
# Check Node version
node --version  # Should be v18+

# Use nvm for version management
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

**Port 5173 already in use**
```bash
# Kill process using port
lsof -ti:5173 | xargs kill -9  # Linux/macOS
netstat -ano | findstr :5173  # Windows - then taskkill /PID <PID>
```

**Dependencies installation fails**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Use yarn if npm fails
npm install -g yarn
yarn install
```

### Network Issues

If you're behind a firewall or in a restricted network:
1. Enable proxy in app settings
2. Use a VPN if available
3. Try e926 instead of e621 (less likely to be blocked)
4. Configure system proxy:
   ```bash
   # Linux/macOS
   export HTTP_PROXY=http://proxy.company.com:8080
   export HTTPS_PROXY=http://proxy.company.com:8080

   # Windows
   # Set in System Settings > Proxy
   ```

### Performance Issues

**App runs slow**
- Enable production build: `npm run build`
- Check network tab for slow API calls
- Clear browser cache
- Update Node.js to latest LTS

**High memory usage**
- Close unused browser tabs
- Restart development server
- Check for memory leaks in React DevTools

## 📄 License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0). The source code is free software: you can redistribute it and/or modify it under the terms of the AGPL-3.0. Please respect e621/e926's terms of service and API usage guidelines.

> The previous "educational and personal use only" notice has been replaced with a proper open-source license so the project is genuinely FOSS.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Ivannivi/e6client/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Ivannivi/e6client/discussions)

---

<div align="center">
  <p>Made with ❤️ for the furry community</p>
  <p>
    <a href="https://e621.net">e621</a> •
    <a href="https://e926.net">e926</a> •
    <a href="https://capacitorjs.com">Capacitor</a>
  </p>
</div>
