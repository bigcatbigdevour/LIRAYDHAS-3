#!/usr/bin/env node
/**
 * Ensure ios/App/App/App.entitlements exists and declares the
 * aps-environment capability so push notifications actually work in
 * TestFlight and production.
 *
 * Why this is needed:
 *   @capacitor/push-notifications relies on iOS registering the app
 *   for remote notifications, which is only allowed when the binary
 *   is signed with a provisioning profile that includes the Push
 *   Notifications service AND the bundle includes an
 *   App.entitlements file with the `aps-environment` key set.
 *
 *   Capacitor's iOS template ships an empty App.entitlements (or none
 *   at all on some versions). Without this key the build succeeds but
 *   the runtime register-for-remote-notifications call returns an
 *   error and no token is ever produced — which manifests as "push
 *   notifications silently broken in TestFlight."
 *
 * What this script does:
 *   1. Creates ios/App/App/App.entitlements if it doesn't exist.
 *   2. Inserts the <key>aps-environment</key><string>production</string>
 *      pair if it's not already present.
 *   3. Patches project.pbxproj so the CODE_SIGN_ENTITLEMENTS build
 *      setting points at App.entitlements for both Debug and Release
 *      configs. (Without this Xcode ignores the file.)
 *
 * 'production' is the right aps-environment for both TestFlight and
 * the live App Store — Apple historically labeled the dev environment
 * separately, but in current iOS the production value works in both.
 *
 * The Push Notifications capability must ALSO be enabled in the Apple
 * Developer portal for the app ID; this script cannot reach that.
 * The preflight checker mentions it.
 *
 * Usage:
 *   node scripts/patch-ios-entitlements.js
 *   npm run ios:entitlements
 */

const fs = require('fs');
const path = require('path');

const IOS_APP_DIR = path.join('ios', 'App', 'App');
const ENT_PATH = path.join(IOS_APP_DIR, 'App.entitlements');
const PBXPROJ = path.join('ios', 'App', 'App.xcodeproj', 'project.pbxproj');

const EMPTY_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
</dict>
</plist>
`;

function exists(p) {
  try { fs.statSync(p); return true; } catch { return false; }
}

function ensureFile() {
  if (!exists(IOS_APP_DIR)) {
    console.error(`iOS project not found at ${IOS_APP_DIR}.`);
    console.error('Run `npx cap add ios` first.');
    process.exit(1);
  }
  if (!exists(ENT_PATH)) {
    fs.writeFileSync(ENT_PATH, EMPTY_PLIST);
    console.log(`✓ Created ${ENT_PATH}`);
  }
}

function patchEntitlements() {
  const s = fs.readFileSync(ENT_PATH, 'utf8');
  if (/<key>aps-environment<\/key>/.test(s)) {
    console.log(`· ${ENT_PATH} already has aps-environment`);
    return;
  }
  // Insert just before the top-level </dict>.
  const closeIdx = s.indexOf('</dict>');
  if (closeIdx === -1) {
    throw new Error(`Couldn't find </dict> in ${ENT_PATH} — file shape unexpected.`);
  }
  const insert = `\t<key>aps-environment</key>\n\t<string>production</string>\n`;
  const out = s.slice(0, closeIdx) + insert + s.slice(closeIdx);
  fs.writeFileSync(ENT_PATH, out);
  console.log(`✓ Added aps-environment to ${ENT_PATH}`);
}

function patchPbxprojCodeSign() {
  if (!exists(PBXPROJ)) {
    console.warn(`! project.pbxproj missing at ${PBXPROJ}; skipping code-sign patch.`);
    return;
  }
  let s = fs.readFileSync(PBXPROJ, 'utf8');
  const before = s;

  // Two build configurations — Debug and Release — each one has a
  // buildSettings block. CODE_SIGN_ENTITLEMENTS may already be set if
  // someone enabled Push in Xcode previously.
  if (s.includes('CODE_SIGN_ENTITLEMENTS = App/App.entitlements')) {
    console.log(`· project.pbxproj already references App.entitlements`);
    return;
  }

  // Find every buildSettings block for the "App" target. Heuristic:
  // any buildSettings that has PRODUCT_NAME = App and inject the
  // CODE_SIGN_ENTITLEMENTS line in.
  s = s.replace(
    /(buildSettings = \{[^}]*PRODUCT_NAME = App[^}]*?)(\n\s*\};)/g,
    (_match, body, tail) => {
      if (body.includes('CODE_SIGN_ENTITLEMENTS')) return _match;
      // Insert before the closing of the buildSettings dict.
      return body + '\n\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;' + tail;
    },
  );

  if (s === before) {
    console.warn(
      '! Could not find a buildSettings block to patch. ' +
      'Enable Push Notifications capability in Xcode manually (Signing & Capabilities tab).',
    );
    return;
  }
  fs.writeFileSync(PBXPROJ, s);
  console.log(`✓ Patched project.pbxproj — CODE_SIGN_ENTITLEMENTS set to App/App.entitlements`);
}

function main() {
  ensureFile();
  patchEntitlements();
  patchPbxprojCodeSign();
  console.log('');
  console.log('Reminder: enable Push Notifications for this app ID in the Apple');
  console.log('Developer portal (Identifiers > Edit > Capabilities), then refresh');
  console.log('the provisioning profile. The entitlements file alone is not enough.');
}

main();
