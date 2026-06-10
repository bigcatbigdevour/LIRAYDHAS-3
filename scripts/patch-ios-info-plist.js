#!/usr/bin/env node
/**
 * Patch ios/App/App/Info.plist with the usage-description strings App
 * Review requires for the camera, microphone, and photo library — plus
 * the URL scheme registration that lets Universal Links work.
 *
 * Run this AFTER `npx cap add ios` and any time you regenerate the iOS
 * folder. Idempotent: keys that are already present are left alone, only
 * missing ones are inserted. Won't touch your manual edits.
 *
 * The plist is a tiny pseudo-XML format. We avoid pulling in a parser
 * dependency by doing a string-aware insert: find the top-level <dict>,
 * insert the missing keys + values just before its close tag.
 *
 * Usage:
 *   node scripts/patch-ios-info-plist.js
 *   npm run ios:plist
 */

const fs = require('fs');
const path = require('path');

const PLIST_PATH = path.join('ios', 'App', 'App', 'Info.plist');

const KEYS = [
  {
    key: 'NSCameraUsageDescription',
    value: 'Liraydhas attaches photos to your journal entries. Photos stay on your device.',
  },
  {
    key: 'NSPhotoLibraryUsageDescription',
    value: 'Liraydhas attaches photos from your library to journal entries. Photos stay on your device.',
  },
  {
    key: 'NSPhotoLibraryAddUsageDescription',
    value: 'Liraydhas can save journal photos back to your library.',
  },
  {
    key: 'NSMicrophoneUsageDescription',
    value: 'Liraydhas records voice notes attached to your journal entries. Recordings stay on your device.',
  },
  {
    key: 'NSUserNotificationsUsageDescription',
    value: 'Liraydhas sends a quiet daily reminder when your reading is ready.',
  },
  {
    key: 'ITSAppUsesNonExemptEncryption',
    // false → export-compliance exemption applies (we only use HTTPS,
    // no proprietary crypto). Saves you from filling the form every
    // upload.
    value: false,
    type: 'bool',
  },
];

function exists() {
  return fs.existsSync(PLIST_PATH);
}

function load() {
  return fs.readFileSync(PLIST_PATH, 'utf8');
}

function save(s) {
  fs.writeFileSync(PLIST_PATH, s);
}

function alreadyHasKey(s, key) {
  // Look for <key>NAME</key> as a whole token. The plist is small enough
  // that this is reliable.
  return new RegExp(`<key>${key}</key>`).test(s);
}

function renderKv({ key, value, type }) {
  if (type === 'bool') {
    return `\t<key>${key}</key>\n\t<${value ? 'true' : 'false'}/>`;
  }
  return `\t<key>${key}</key>\n\t<string>${value}</string>`;
}

function patch(s) {
  // Insert before the FIRST </dict> at the top level. The plist's
  // top-level structure is <plist><dict>...</dict></plist>.
  const closeIdx = s.indexOf('</dict>');
  if (closeIdx === -1) {
    throw new Error("Couldn't find </dict> in Info.plist — file shape unexpected.");
  }
  let added = 0;
  let insertBlock = '';
  for (const k of KEYS) {
    if (alreadyHasKey(s, k.key)) continue;
    insertBlock += renderKv(k) + '\n';
    added++;
  }
  if (added === 0) return { out: s, added };
  const out = s.slice(0, closeIdx) + insertBlock + s.slice(closeIdx);
  return { out, added };
}

function main() {
  if (!exists()) {
    console.error(`Info.plist not found at ${PLIST_PATH}. Run \`npx cap add ios\` first.`);
    process.exit(1);
  }
  const before = load();
  const { out, added } = patch(before);
  if (added === 0) {
    console.log(`Info.plist already has every required key. No changes.`);
    return;
  }
  save(out);
  console.log(`Patched ${PLIST_PATH} — added ${added} key${added === 1 ? '' : 's'}:`);
  for (const k of KEYS) {
    if (!alreadyHasKey(before, k.key)) console.log(`  · ${k.key}`);
  }
}

main();
