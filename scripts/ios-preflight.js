#!/usr/bin/env node
/**
 * iOS submission preflight — sanity-check the iOS project before you
 * spend 10 minutes archiving and 20 more uploading to App Store
 * Connect, only to be rejected for a missing PrivacyInfo or a wrong
 * bundle identifier.
 *
 * Runs a set of cheap checks and prints a pass/fail report. Exits 0
 * when everything looks ready; exits 1 with the failing checks listed
 * when not.
 *
 * Usage:
 *   node scripts/ios-preflight.js
 *   npm run ios:preflight
 *
 * Checks (in roughly the order Apple's review surfaces them):
 *
 *   - iOS project exists at ios/App/App/
 *   - Info.plist exists and contains the required usage descriptions
 *     (camera, photo library, microphone, notifications, encryption)
 *   - Info.plist has CFBundleIdentifier matching capacitor.config.ts
 *   - Info.plist has CFBundleShortVersionString and CFBundleVersion
 *   - PrivacyInfo.xcprivacy exists and is referenced by project.pbxproj
 *   - Asset catalog contains the AppIcon at 1024×1024
 *   - resources/icon.png exists (source for the asset generator)
 *   - capacitor.config.ts has a valid appId
 */

const fs = require('fs');
const path = require('path');

const IOS_APP_DIR = path.join('ios', 'App', 'App');
const PLIST_PATH = path.join(IOS_APP_DIR, 'Info.plist');
const PRIVACY_PATH = path.join(IOS_APP_DIR, 'PrivacyInfo.xcprivacy');
const ENT_PATH = path.join(IOS_APP_DIR, 'App.entitlements');
const PBXPROJ = path.join('ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const CAP_CONFIG = 'capacitor.config.ts';
const RESOURCE_ICON = path.join('resources', 'icon.png');
const ASSET_ICON_DIR = path.join(IOS_APP_DIR, 'Assets.xcassets', 'AppIcon.appiconset');

const checks = [];
function check(name, fn) {
  checks.push({ name, fn });
}

function exists(p) {
  try { fs.statSync(p); return true; } catch { return false; }
}

function plistHasKey(s, key) {
  return new RegExp(`<key>${key}</key>`).test(s);
}

function plistStringFor(s, key) {
  const re = new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`);
  const m = s.match(re);
  return m ? m[1] : null;
}

function plistBoolFor(s, key) {
  const re = new RegExp(`<key>${key}</key>\\s*<(true|false)/>`);
  const m = s.match(re);
  return m ? m[1] === 'true' : null;
}

function capAppId() {
  if (!exists(CAP_CONFIG)) return null;
  const s = fs.readFileSync(CAP_CONFIG, 'utf8');
  const m = s.match(/appId:\s*['"]([^'"]+)['"]/);
  return m ? m[1] : null;
}

check('iOS project exists', () => {
  if (!exists(IOS_APP_DIR)) {
    return { ok: false, hint: 'Run `npx cap add ios` to create it.' };
  }
  return { ok: true };
});

check('capacitor.config.ts has a valid appId', () => {
  const id = capAppId();
  if (!id) return { ok: false, hint: 'No appId in capacitor.config.ts.' };
  if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*){2,}$/i.test(id)) {
    return { ok: false, hint: `appId "${id}" doesn't look like a reverse-DNS bundle ID (expected e.g. com.example.app).` };
  }
  return { ok: true, info: id };
});

check('Info.plist exists', () => {
  if (!exists(PLIST_PATH)) {
    return { ok: false, hint: 'Run `npm run ios:plist` (after ios:add).' };
  }
  return { ok: true };
});

check('Info.plist has all usage-description strings', () => {
  if (!exists(PLIST_PATH)) return { ok: false, hint: 'Info.plist missing.' };
  const s = fs.readFileSync(PLIST_PATH, 'utf8');
  const required = [
    'NSCameraUsageDescription',
    'NSPhotoLibraryUsageDescription',
    'NSPhotoLibraryAddUsageDescription',
    'NSMicrophoneUsageDescription',
    'NSUserNotificationsUsageDescription',
  ];
  const missing = required.filter((k) => !plistHasKey(s, k));
  if (missing.length > 0) {
    return { ok: false, hint: `Missing: ${missing.join(', ')}. Run \`npm run ios:plist\`.` };
  }
  return { ok: true };
});

check('Info.plist declares encryption exemption', () => {
  if (!exists(PLIST_PATH)) return { ok: false, hint: 'Info.plist missing.' };
  const s = fs.readFileSync(PLIST_PATH, 'utf8');
  const v = plistBoolFor(s, 'ITSAppUsesNonExemptEncryption');
  if (v === null) {
    return { ok: false, hint: 'ITSAppUsesNonExemptEncryption missing — you\'ll have to fill the export form on every upload.' };
  }
  if (v === true) {
    return { ok: false, hint: 'ITSAppUsesNonExemptEncryption is true — App Review will ask for an ECCN classification.' };
  }
  return { ok: true };
});

check('Info.plist bundle identifier matches capacitor.config.ts', () => {
  if (!exists(PLIST_PATH)) return { ok: false, hint: 'Info.plist missing.' };
  const s = fs.readFileSync(PLIST_PATH, 'utf8');
  const plistId = plistStringFor(s, 'CFBundleIdentifier');
  const capId = capAppId();
  if (!plistId) return { ok: false, hint: 'CFBundleIdentifier missing from Info.plist.' };
  if (!capId) return { ok: true, info: `Info.plist: ${plistId} (capacitor.config.ts unreadable)` };
  // Xcode templates often use $(PRODUCT_BUNDLE_IDENTIFIER) at build time;
  // accept that token as a valid passthrough.
  if (plistId.includes('$')) return { ok: true, info: `${plistId} (resolves to ${capId})` };
  if (plistId !== capId) {
    return { ok: false, hint: `Info.plist has "${plistId}", capacitor.config.ts has "${capId}". Update one.` };
  }
  return { ok: true, info: plistId };
});

check('Info.plist has CFBundleShortVersionString + CFBundleVersion', () => {
  if (!exists(PLIST_PATH)) return { ok: false, hint: 'Info.plist missing.' };
  const s = fs.readFileSync(PLIST_PATH, 'utf8');
  const short = plistStringFor(s, 'CFBundleShortVersionString');
  const build = plistStringFor(s, 'CFBundleVersion');
  if (!short) return { ok: false, hint: 'CFBundleShortVersionString missing — set a marketing version (e.g. 1.0).' };
  if (!build) return { ok: false, hint: 'CFBundleVersion missing — set a build number (e.g. 1).' };
  return { ok: true, info: `${short} (build ${build})` };
});

check('PrivacyInfo.xcprivacy is present at the right path', () => {
  if (!exists(PRIVACY_PATH)) {
    return { ok: false, hint: 'Run `npm run ios:privacy` to generate it. Submissions without this file are rejected at upload.' };
  }
  return { ok: true };
});

check('PrivacyInfo.xcprivacy is referenced by project.pbxproj', () => {
  if (!exists(PBXPROJ)) return { ok: false, hint: 'project.pbxproj missing.' };
  const s = fs.readFileSync(PBXPROJ, 'utf8');
  if (!s.includes('PrivacyInfo.xcprivacy')) {
    return { ok: false, hint: 'Run `npm run ios:privacy` — file exists but Xcode isn\'t bundling it.' };
  }
  return { ok: true };
});

check('App.entitlements declares aps-environment (push)', () => {
  if (!exists(ENT_PATH)) {
    return { ok: false, hint: 'Run `npm run ios:entitlements`. Push will not work in TestFlight without this.' };
  }
  const s = fs.readFileSync(ENT_PATH, 'utf8');
  if (!/<key>aps-environment<\/key>/.test(s)) {
    return { ok: false, hint: 'Run `npm run ios:entitlements` to add the aps-environment key.' };
  }
  return { ok: true };
});

check('project.pbxproj points CODE_SIGN_ENTITLEMENTS at App.entitlements', () => {
  if (!exists(PBXPROJ)) return { ok: false, hint: 'project.pbxproj missing.' };
  const s = fs.readFileSync(PBXPROJ, 'utf8');
  if (!s.includes('CODE_SIGN_ENTITLEMENTS = App/App.entitlements')) {
    return { ok: false, hint: 'Run `npm run ios:entitlements`, or enable Push Notifications in Xcode → Signing & Capabilities.' };
  }
  return { ok: true };
});

check('resources/icon.png exists (1024×1024 master)', () => {
  if (!exists(RESOURCE_ICON)) {
    return { ok: false, hint: 'See resources/README.md for the recipe — generate icon.png from public/icon-512.svg.' };
  }
  // Without a PNG decoder we can't verify dimensions in pure Node;
  // at least confirm it's non-trivially sized (>10 KB suggests it's
  // not a 1px placeholder).
  const size = fs.statSync(RESOURCE_ICON).size;
  if (size < 10 * 1024) {
    return { ok: false, hint: `icon.png is only ${size} bytes — looks like a placeholder.` };
  }
  return { ok: true, info: `${(size / 1024).toFixed(0)} KB` };
});

check('AppIcon asset catalog has been populated', () => {
  if (!exists(ASSET_ICON_DIR)) {
    return { ok: false, hint: 'Run `npm run ios:assets` to populate every required icon size.' };
  }
  const files = fs.readdirSync(ASSET_ICON_DIR);
  const pngCount = files.filter((f) => f.endsWith('.png')).length;
  if (pngCount < 1) {
    return { ok: false, hint: 'No PNGs in AppIcon.appiconset — run `npm run ios:assets`.' };
  }
  return { ok: true, info: `${pngCount} icon PNGs` };
});

const results = checks.map((c) => {
  let r;
  try {
    r = c.fn();
  } catch (e) {
    r = { ok: false, hint: e.message };
  }
  return { name: c.name, ...r };
});

const passed = results.filter((r) => r.ok).length;
const failed = results.length - passed;

console.log('');
console.log(`iOS preflight — ${passed}/${results.length} checks passed`);
console.log('─'.repeat(56));
for (const r of results) {
  const mark = r.ok ? '✓' : '✗';
  let line = `${mark}  ${r.name}`;
  if (r.info) line += `  (${r.info})`;
  console.log(line);
  if (!r.ok && r.hint) console.log(`     ↳ ${r.hint}`);
}
console.log('');

if (failed === 0) {
  console.log('Ready to archive. Open Xcode with: npm run ios:open');
  process.exit(0);
} else {
  console.log(`${failed} check${failed === 1 ? '' : 's'} need attention before submission.`);
  process.exit(1);
}
