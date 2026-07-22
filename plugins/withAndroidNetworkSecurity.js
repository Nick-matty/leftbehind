// Expo config plugin: Android network security hardening.
//
// Writes res/xml/network_security_config.xml and wires it into the manifest so
// that release builds:
//   - disable cleartext (HTTP) traffic app-wide, and
//   - (optionally) pin the backend's certificate via a <pin-set>.
//
// SAFETY: this is only applied for PRODUCTION builds
// (EAS_BUILD_PROFILE=production). Development / dev-client builds are left
// untouched so the app can still reach the Metro dev server over HTTP on the LAN.
//
// To enable cert pinning, set LB_PINNED_HOST and LB_CERT_PIN_PRIMARY /
// LB_CERT_PIN_BACKUP (base64 SHA-256 of the SubjectPublicKeyInfo) in the build
// environment, then rebuild. Compute pins with:
//   openssl s_client -connect api.yourbackend.com:443 | openssl x509 -pubkey -noout \
//     | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function buildConfigXml() {
  const host = process.env.LB_PINNED_HOST;
  const primary = process.env.LB_CERT_PIN_PRIMARY;
  const backup = process.env.LB_CERT_PIN_BACKUP;

  let pinBlock = '';
  if (host && primary) {
    const pins = [primary, backup].filter(Boolean)
      .map((p) => `      <pin digest="SHA-256">${p}</pin>`) 
      .join('\n');
    pinBlock = `
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="true">${host}</domain>
    <pin-set>
${pins}
    </pin-set>
  </domain-config>`;
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>${pinBlock}
</network-security-config>
`;
}

module.exports = function withAndroidNetworkSecurity(config) {
  const isProduction = process.env.EAS_BUILD_PROFILE === 'production';
  if (!isProduction) {
    // No-op for dev/preview builds so the Metro dev server stays reachable.
    return config;
  }

  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const xmlDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, 'network_security_config.xml'), buildConfigXml());
      return cfg;
    },
  ]);

  config = withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app && app.$) {
      app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
      app.$['android:usesCleartextTraffic'] = 'false';
    }
    return cfg;
  });

  return config;
};
