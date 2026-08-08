const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Required for @posthog/core subpath exports (e.g. @posthog/core/surveys)
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
