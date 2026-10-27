// Learn more https://docs.expo.dev/guides/monorepos
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// The shared package lives outside this app and is consumed as TypeScript source
// (`@blip/shared` is mapped in tsconfig.json). Metro only bundles files inside its watched roots.
const sharedDir = path.resolve(__dirname, '../../packages/shared');
config.watchFolders = [...(config.watchFolders ?? []), sharedDir];

module.exports = config;
