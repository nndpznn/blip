#!/usr/bin/env bash
# Build the iOS simulator app from a mirror OUTSIDE iCloud-synced folders.
#
# Why: when the repo lives under an iCloud-synced ~/Desktop, files gain Finder/resource-fork
# xattrs and codesign fails with "resource fork, Finder information, or similar detritus not
# allowed". The JS bundle is still served by Metro from the real repo; only native code is built here.
#
# Usage: scripts/native-build-ios.sh [simulator-udid]   (defaults to the booted simulator)
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
MIRROR="${BLIP_NATIVE_DIR:-$HOME/.blip-native}"
UDID="${1:-booted}"

mkdir -p "$MIRROR/apps/mobile" "$MIRROR/packages"
rsync -a --delete --exclude node_modules --exclude ios --exclude .expo \
  "$REPO/apps/mobile/" "$MIRROR/apps/mobile/"
rsync -a --delete "$REPO/packages/shared/" "$MIRROR/packages/shared/"
xattr -cr "$MIRROR" 2>/dev/null || true

cd "$MIRROR/apps/mobile"
npm ci --no-audit --no-fund
npx expo prebuild --platform ios --no-install
(cd ios && pod install)

xcodebuild -workspace ios/Blip.xcworkspace -scheme Blip -configuration Debug \
  -sdk iphonesimulator -derivedDataPath ios/build \
  -destination "generic/platform=iOS Simulator" build | tail -20

xcrun simctl install "$UDID" ios/build/Build/Products/Debug-iphonesimulator/Blip.app
echo "Installed. Launch with: xcrun simctl launch $UDID \$(node -p \"require('./app.json').expo.ios.bundleIdentifier\")"
