// Dynamic Expo config. Extends the static app.json and injects build-time
// security settings from environment variables (kept out of source control):
//   LB_DEV_PASSCODE       - passcode for the dev console (dev builds only)
//   LB_API_BASE_URL       - HTTPS base URL of the backend (when one exists)
//   LB_PINNED_HOST        - host to certificate-pin (e.g. api.example.com)
//   LB_CERT_PIN_PRIMARY   - base64 SHA-256 of the SPKI (leaf/intermediate)
//   LB_CERT_PIN_BACKUP    - base64 SHA-256 backup pin
//
// Set these via EAS secrets (`eas secret:create`) or a local shell env before
// building. Never commit real values.
const appJson = require('./app.json');

const base = appJson.expo;

const pinnedHost = process.env.LB_PINNED_HOST || null;
const primaryPin = process.env.LB_CERT_PIN_PRIMARY || null;
const backupPin = process.env.LB_CERT_PIN_BACKUP || null;
const certPins = [primaryPin, backupPin].filter(Boolean);

// iOS App Transport Security: block cleartext everywhere, and optionally pin
// the backend certificate (iOS 14+ supports NSPinnedDomains natively).
const iosAts = {
  NSAllowsArbitraryLoads: false,
};
if (pinnedHost && certPins.length) {
  iosAts.NSPinnedDomains = {
    [pinnedHost]: {
      NSIncludesSubdomains: true,
      NSPinnedCAIdentities: certPins.map((p) => ({ 'SPKI-SHA256-BASE64': p })),
    },
  };
}

module.exports = () => ({
  ...base,
  plugins: [
    ...(base.plugins || []),
    './plugins/withAndroidNetworkSecurity',
  ],
  ios: {
    ...base.ios,
    infoPlist: {
      ...(base.ios?.infoPlist || {}),
      NSAppTransportSecurity: iosAts,
    },
  },
  extra: {
    ...(base.extra || {}),
    devPasscode: process.env.LB_DEV_PASSCODE || null,
    apiBaseUrl: process.env.LB_API_BASE_URL || null,
    pinnedHost,
    certPinsSha256: certPins,
    eas: {
      // projectId is filled by `eas init` / `eas build`.
      ...(base.extra?.eas || {}),
    },
  },
});
