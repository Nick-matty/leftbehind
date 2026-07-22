const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// react-native-maps has no web implementation. Even with map.web.tsx, Metro can
// still pull the native package into the web graph (via route analysis or deep
// requires), which then fails on native-only RN internals like Platform.
// Resolve the package to an empty module on web so the browser bundle can load.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform === 'web' &&
    (moduleName === 'react-native-maps' ||
      moduleName.startsWith('react-native-maps/'))
  ) {
    return { type: 'empty' };
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
