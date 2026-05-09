# Dear Stranger Mobile Release Guide

This repo now includes native Capacitor shells for:

- `ios/`
- `android/`

The native apps load the live site at `https://dearstranger.xyz` via `server.url` in `capacitor.config.ts`.

## Current Setup

- iOS bundle/app id: `xyz.dearstranger.app`
- Android application id: `xyz.dearstranger.app`
- Display name: `Dear Stranger`

## Commands

```bash
npm run cap:sync
npm run cap:ios
npm run cap:android
```

Use `npm run cap:sync` after any change to `capacitor.config.ts` or after adding Capacitor plugins.

## iOS App Store

1. Open the iOS project with `npm run cap:ios`.
2. In Xcode, select the `App` target.
3. Set your Apple Developer team under Signing & Capabilities.
4. Confirm the bundle identifier is the one you want to keep forever.
5. Set the version and build number.
6. Replace the default app icon and launch assets in `ios/App/App/Assets.xcassets`.
7. Archive the app and upload it to App Store Connect.

SDK requirement:

- Apple currently requires uploads to be built with the iOS 26 SDK or later.
- Run `npm run ios:check-sdk` before you archive to verify the local Xcode toolchain and the resolved project SDK.

Before submission:

- Test on a real iPhone.
- Verify sign in, letter sending, notifications, and offline behavior.
- Make sure `https://dearstranger.xyz` is live and stable.

## Android Play Store

1. Open the Android project with `npm run cap:android`.
2. In Android Studio, let Gradle finish syncing.
3. Confirm the application id is the one you want to keep forever.
4. Set `versionCode` and `versionName` in `android/app/build.gradle`.
5. Replace the default launcher icons in `android/app/src/main/res/`.
6. Generate a signed release build or App Bundle.
7. Upload the `.aab` to Play Console.

Java note:

- If terminal builds fail because Gradle picks up an unsupported JDK, use Android Studio's bundled runtime or JDK 21.
- On this machine, Android Studio's bundled JDK is at `/Applications/Android Studio.app/Contents/jbr/Contents/Home`.

Before submission:

- Test on a real Android device.
- Verify sign in, letter sending, notifications, and offline behavior.
- Make sure `https://dearstranger.xyz` is live and stable.

## Important Caveat

Because this app uses Capacitor `server.url`, the native shells do not contain a full local copy of the web app. They are wrappers around the live deployment.

That means:

- Your deployed site must stay available.
- Store reviewers will be testing the live website inside the native shell.
- If you want a more offline-capable native app later, switch from `server.url` to a bundled web build.

## Recommended Next Steps

1. Replace the default native icons and splash screens.
2. Open both native projects and configure signing.
3. Build a TestFlight build for iOS.
4. Build an internal test track release for Android.
5. Test on real devices before store submission.
