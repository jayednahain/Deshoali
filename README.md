# Deshoali - React Native App

A React Native application built with TypeScript, designed for cross-platform mobile development.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Development Environment Requirements](#development-environment-requirements)
  - [Node Environment Layer](#node-environment-layer)
  - [React Native UI Layer](#react-native-ui-layer)
  - [Android Native Layer](#android-native-layer)
  - [iOS Native Layer](#ios-native-layer)
- [Setup Instructions](#setup-instructions)
- [Running the Application](#running-the-application)
- [Development Workflow](#development-workflow)
- [VS Code Configuration](#vs-code-configuration)
- [Troubleshooting](#troubleshooting)

## 🚀 Project Overview

- **App Name:** Deshoali
- **Version:** 0.0.1
- **React Native Version:** 0.81.4
- **Language:** TypeScript
- **Package Manager:** npm

## 🛠 Development Environment Requirements

### Node Environment Layer

| Component            | Required Version | Current Version |
| -------------------- | ---------------- | --------------- |
| **Node.js**          | >=20.19.4        | 20.19.4         |
| **npm**              | >=10.0.0         | 10.8.2          |
| **React Native CLI** | ^20.0.0          | 20.0.0          |
| **TypeScript**       | ^5.8.3           | 5.8.3           |

**Environment Setup:**

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Install React Native CLI globally (if not installed)
npm install -g @react-native-community/cli
```

### React Native UI Layer

| Component                          | Version | Purpose                   |
| ---------------------------------- | ------- | ------------------------- |
| **React**                          | 19.1.0  | Core React library        |
| **React Native**                   | 0.81.4  | Mobile framework          |
| **React Native Safe Area Context** | ^5.5.2  | Handle safe areas         |
| **@react-native/new-app-screen**   | 0.81.4  | Welcome screen components |

**Development Dependencies:**

- **Babel Core:** ^7.25.2
- **ESLint:** ^8.19.0
- **Prettier:** 2.8.8
- **Jest:** ^29.6.3
- **Metro Config:** 0.81.4

### Android Native Layer

| Component                    | Version       | Description                         |
| ---------------------------- | ------------- | ----------------------------------- |
| **Java**                     | 17.0.14 LTS   | Required for Android development    |
| **Gradle**                   | 8.14.3        | Build tool                          |
| **Android Build Tools**      | 36.0.0        | Android build tools                 |
| **Android SDK (compileSdk)** | 36            | Target compilation SDK              |
| **Android SDK (targetSdk)**  | 36            | Target runtime SDK                  |
| **Android SDK (minSdk)**     | 24            | Minimum supported SDK (Android 7.0) |
| **NDK**                      | 27.1.12297006 | Native Development Kit              |
| **Kotlin**                   | 2.1.20        | Kotlin language support             |

**Android Requirements:**

- **Android Studio:** Latest version
- **Android SDK:** API 24-36
- **Android Emulator** or physical device
- **USB Debugging** enabled (for physical devices)

### iOS Native Layer

| Component         | Requirement         | Description                    |
| ----------------- | ------------------- | ------------------------------ |
| **macOS**         | Required            | iOS development only on macOS  |
| **Xcode**         | Latest version      | iOS development IDE            |
| **iOS Simulator** | Included with Xcode | For testing                    |
| **CocoaPods**     | Latest              | iOS dependency manager         |
| **Ruby**          | For CocoaPods       | Usually pre-installed on macOS |

## 📦 Setup Instructions

### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd /Users/tltestuser/Pocha-putki-project/Deshoali

# Install dependencies
npm install
```

### 2. iOS Setup (macOS only)

```bash
# Navigate to iOS directory
cd ios

# Install Ruby dependencies
bundle install

# Install CocoaPods dependencies
bundle exec pod install

# Return to project root
cd ..
```

### 3. Android Setup

Ensure you have:

- Android Studio installed
- Android SDK installed (API 24-36)
- Android emulator set up or device connected
- Environment variables set:
  ```bash
  export ANDROID_HOME=$HOME/Library/Android/sdk
  export PATH=$PATH:$ANDROID_HOME/emulator
  export PATH=$PATH:$ANDROID_HOME/tools
  export PATH=$PATH:$ANDROID_HOME/tools/bin
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  ```

## 🏃‍♂️ Running the Application

### Start Metro Bundler

```bash
# Start the Metro bundler
npm start

# Or with specific options
npx react-native start
```

### Run on Android

```bash
# Make sure Android emulator is running or device is connected
npm run android

# Or directly with React Native CLI
npx react-native run-android
```

### Run on iOS (macOS only)

```bash
# Run on iOS simulator
npm run ios

# Or directly with React Native CLI
npx react-native run-ios

# Run on specific device
npx react-native run-ios --device "Device Name"
```

## 🔄 Development Workflow

### Available Scripts

```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run tests
npm test

# Lint code
npm run lint

# Type checking
npx tsc --noEmit
```

### Development Commands

```bash
# Clear Metro cache
npx react-native start --reset-cache

# Clean build (Android)
cd android && ./gradlew clean && cd ..

# Clean build (iOS)
cd ios && rm -rf build && xcodebuild clean && cd ..

# Rebuild node_modules
rm -rf node_modules && npm install
```

## ⚙️ VS Code Configuration

The project includes VS Code settings for consistent development experience across team members.

### Workspace Settings (`.vscode/settings.json`)

```json
{
  "editor.tabSize": 2,
  "editor.insertSpaces": true,
  "editor.detectIndentation": false,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "javascript.preferences.importModuleSpecifier": "relative",
  "emmet.includeLanguages": {
    "typescript": "typescriptreact",
    "javascript": "javascriptreact"
  },
  "files.associations": {
    "*.tsx": "typescriptreact",
    "*.ts": "typescript"
  }
}
```

### Recommended VS Code Extensions

- React Native Tools
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- ESLint
- Prettier - Code formatter
- Auto Rename Tag
- Bracket Pair Colorizer
- GitLens

## 🔧 Project Structure

```
Deshoali/
├── android/              # Android-specific code
├── ios/                  # iOS-specific code
├── __tests__/            # Test files
├── App.tsx               # Main application component
├── index.js              # Entry point
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── babel.config.js       # Babel configuration
├── metro.config.js       # Metro bundler configuration
└── .vscode/              # VS Code workspace settings
```

## 🚨 Troubleshooting

### Common Issues

#### Node Version Issues

```bash
# Use specific Node version
nvm use 20.19.4

# Or install if not available
nvm install 20.19.4
```

#### Android Build Issues

```bash
# Clean Gradle
cd android
./gradlew clean
cd ..

# Reset Metro cache
npx react-native start --reset-cache
```

#### iOS Build Issues

```bash
# Clean iOS build
cd ios
rm -rf build
xcodebuild clean
pod install
cd ..
```

#### Metro Bundler Issues

```bash
# Kill Metro and restart
npx react-native start --reset-cache

# Or manually kill Metro
lsof -ti:8081 | xargs kill -9
```

### Version Compatibility

- **Node.js 20.19.4+** is required (current: 20.19.4)
- **Java 17** is required for Android (current: 17.0.14)
- **Android SDK 24-36** for Android development
- **Xcode latest** for iOS development (macOS only)

### Getting Help

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [React Native Troubleshooting](https://reactnative.dev/docs/troubleshooting)
- [Android Setup Guide](https://reactnative.dev/docs/environment-setup?os=macos&platform=android)
- [iOS Setup Guide](https://reactnative.dev/docs/environment-setup?os=macos&platform=ios)

## 📝 Development Notes

- This project uses TypeScript for type safety
- ESLint and Prettier are configured for code consistency
- Jest is set up for testing
- Safe area handling is configured for modern devices
- Debug builds use the default Android debug keystore

---

**Happy Coding! 🚀**
