#!/bin/sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
PROJECT_PATH="$ROOT_DIR/ios/App/App.xcodeproj"

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild not found. Install Xcode 26 or later."
  exit 1
fi

XCODE_VERSION="$(xcodebuild -version | awk 'NR==1 {print $2}')"
IOS_SDK_LINE="$(xcodebuild -showsdks | grep 'iOS 26' | head -n 1 || true)"

if [ -z "$IOS_SDK_LINE" ]; then
  echo "Missing iOS 26 SDK. Current Xcode version: $XCODE_VERSION"
  exit 1
fi

BUILD_SETTINGS="$(xcodebuild -project "$PROJECT_PATH" -scheme App -sdk iphoneos -showBuildSettings 2>/dev/null || true)"
SDKROOT_LINE="$(printf '%s\n' "$BUILD_SETTINGS" | grep 'SDKROOT = ' | head -n 1 || true)"
SDK_VERSION_LINE="$(printf '%s\n' "$BUILD_SETTINGS" | grep 'SDK_VERSION = ' | head -n 1 || true)"

echo "Xcode version: $XCODE_VERSION"
echo "Installed SDK: $IOS_SDK_LINE"
echo "Project SDK root: ${SDKROOT_LINE:-unknown}"
echo "Project SDK version: ${SDK_VERSION_LINE:-unknown}"

case "$SDKROOT_LINE" in
  *iphoneos26*)
    echo "PASS: iOS project is building against an iOS 26 SDK."
    ;;
  *)
    echo "FAIL: iOS project is not currently resolving to an iOS 26 SDK."
    exit 1
    ;;
esac
