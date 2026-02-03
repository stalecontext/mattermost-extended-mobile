# App Icons

This document describes where to find and modify the iOS and Android app icons.

## iOS Icons

**Location:** `ios/Mattermost/Images.xcassets/AppIcon.appiconset/`

Files to replace:

| File | Size | Purpose |
|------|------|---------|
| `20.png` | 20x20 | iPad Notification (1x) |
| `20@2x.png` | 40x40 | iPhone/iPad Notification (2x) |
| `20@3x.png` | 60x60 | iPhone Notification (3x) |
| `29.png` | 29x29 | iPad Settings (1x) |
| `29@2x.png` | 58x58 | iPhone/iPad Settings (2x) |
| `29@3x.png` | 87x87 | iPhone Settings (3x) |
| `40.png` | 40x40 | iPad Spotlight (1x) |
| `40@2x.png` | 80x80 | iPhone/iPad Spotlight (2x) |
| `40@3x.png` | 120x120 | iPhone Spotlight (3x) |
| `76.png` | 76x76 | iPad App (1x) |
| `76@2x.png` | 152x152 | iPad App (2x) |
| `83.5@2x.png` | 167x167 | iPad Pro App (2x) |
| `Icon-60@2x.png` | 120x120 | iPhone App (2x) |
| `Icon-60@3x.png` | 180x180 | iPhone App (3x) |
| `iTunesArtwork@2x.png` | 1024x1024 | App Store |

## Android Icons (Adaptive Icon System)

**Location:** `android/app/src/main/res/mipmap-*/`

Android uses an adaptive icon system (API 26+) with separate foreground and background layers. For each density folder, you need to replace these files:

| Folder | Density | Foreground Size | Background Size |
|--------|---------|-----------------|-----------------|
| `mipmap-mdpi` | 1x | 108x108 | 108x108 |
| `mipmap-hdpi` | 1.5x | 162x162 | 162x162 |
| `mipmap-xhdpi` | 2x | 216x216 | 216x216 |
| `mipmap-xxhdpi` | 3x | 324x324 | 324x324 |
| `mipmap-xxxhdpi` | 4x | 432x432 | 432x432 |

### Files in each folder:

- **`ic_launcher_foreground.png`** - The foreground layer (your actual icon with transparency)
- **`ic_launcher_background.png`** - The background layer (typically a solid color)
- **`ic_launcher.png`** - Legacy fallback icon for older devices
- **`ic_launcher_round.png`** - Round icon variant (used by Pixel devices)
- **`ic_notification.png`** - Notification icon (should be white silhouette)

### Adaptive Icon Definition

The adaptive icon is defined in `android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml`:

```xml
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
```

### Adaptive Icon Guidelines

- The foreground icon should be centered in the 108dp canvas with the visible portion in the inner 72dp (the outer 18dp on each side may be masked)
- Use transparency in the foreground layer
- The background can be a solid color or an image

## Beta vs Release Builds

The beta build configs (`fastlane/.env.ios.beta` and `fastlane/.env.android.beta`) have `REPLACE_ASSETS=false`, which means the icons in the native project directories are used directly.

For release builds with `REPLACE_ASSETS=true`, icons are copied from `assets/base/release/icons/` to the native directories during the build process.

## Applying Icon Changes

Icon changes require a full native rebuild - Metro hot reload will not pick up icon changes.

### iOS

iOS caches app icons aggressively. To see your changes:

1. **Delete the app** from your simulator/device

2. **Clean the Xcode build**:
   ```bash
   cd ios && xcodebuild clean && cd ..
   ```

3. **Clear Derived Data**:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData/Mattermost-*
   ```

4. **Rebuild and reinstall**:
   ```bash
   npm run ios
   ```

If icons still don't update:
- Reset the iOS Simulator: **Device menu → Erase All Content and Settings**
- On a physical device, restart the device after deleting the app

### Android

1. **Uninstall the app** from the emulator/device

2. **Clean the build**:
   ```bash
   cd android && ./gradlew clean && cd ..
   ```

3. **Rebuild and reinstall**:
   ```bash
   npm run android
   ```
