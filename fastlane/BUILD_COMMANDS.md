# Build Commands

Quick reference for fastlane build commands.

## Prerequisites

Run from the `fastlane/` directory, or use `cd fastlane &&` prefix.

Make sure Metro bundler is NOT running when building.

## Android

### Full Release APK (separate APKs per architecture)

```bash
cd fastlane && bundle exec fastlane android build --env android.release
```

This builds separate APKs for each architecture (arm64-v8a, armeabi-v7a, x86, x86_64).
Output files are placed in the project root: `Mattermost.apk` or `Mattermost-{arch}.apk`

### Unsigned APK (for manual signing)

```bash
cd fastlane && bundle exec fastlane android unsigned
```

Output: `Mattermost-unsigned.apk` in project root.

### Beta Build

```bash
cd fastlane && bundle exec fastlane android build --env android.beta
```

## iOS (macOS only)

### Full Release IPA

```bash
cd fastlane && bundle exec fastlane ios build --env ios.release
```

### Unsigned IPA

```bash
cd fastlane && bundle exec fastlane ios unsigned
```

### Simulator Build

```bash
cd fastlane && bundle exec fastlane ios simulator
```

## Environment Variables

Key env vars (set in `.env.android.release` or override via command line):

- `APP_NAME` - Display name (default: "Mattermost")
- `MAIN_APP_IDENTIFIER` - Package ID (default: "com.mattermost.rn")
- `SEPARATE_APKS` - Build per-arch APKs (default: true for release)
- `BUILD_FOR_RELEASE` - Use release configuration (default: true)

## Troubleshooting

If build fails with signing errors, ensure:
1. `android/app/build.gradle` has correct signing config
2. Keystore file exists and credentials are correct

If build fails with memory errors:
- The `.env.default` sets `NODE_OPTIONS="--max_old_space_size=12000"`
- May need to close other applications
