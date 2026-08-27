#!/usr/bin/env node
/**
 * Increment CFBundleVersion in ios/App/App/Info.plist by one.
 *
 * App Store Connect requires every TestFlight upload to have a unique
 * (CFBundleShortVersionString, CFBundleVersion) pair. The marketing
 * version (Short Version, e.g. "1.0") only changes when the user-facing
 * release does; the build number (CFBundleVersion, e.g. "12") MUST
 * change on every binary upload. Forgetting to bump is the most common
 * cause of "ERROR ITMS-90478" rejections at upload time.
 *
 * This script reads Info.plist, finds the CFBundleVersion entry, parses
 * its current integer value, increments by one, and writes it back.
 * Idempotent only in the sense that running it N times bumps by N.
 *
 * Usage:
 *   node scripts/bump-ios-version.js              # bump by 1
 *   node scripts/bump-ios-version.js --set 42     # set to specific value
 *   npm run ios:bump
 */

const fs = require('fs');
const path = require('path');

const PLIST_PATH = path.join('ios', 'App', 'App', 'Info.plist');

function main() {
  if (!fs.existsSync(PLIST_PATH)) {
    console.error(`Info.plist not found at ${PLIST_PATH}.`);
    console.error('Run `npx cap add ios` first.');
    process.exit(1);
  }

  let setTo = null;
  const setIdx = process.argv.indexOf('--set');
  if (setIdx !== -1 && process.argv[setIdx + 1]) {
    const v = parseInt(process.argv[setIdx + 1], 10);
    if (!Number.isFinite(v) || v < 1) {
      console.error(`--set requires a positive integer, got "${process.argv[setIdx + 1]}".`);
      process.exit(1);
    }
    setTo = v;
  }

  const s = fs.readFileSync(PLIST_PATH, 'utf8');
  // Match the <key>CFBundleVersion</key> and its very next <string>...</string>.
  const re = /(<key>CFBundleVersion<\/key>\s*<string>)([^<]*)(<\/string>)/;
  const m = s.match(re);
  if (!m) {
    console.error('CFBundleVersion not found in Info.plist. Has Capacitor regenerated the project?');
    process.exit(1);
  }
  const current = parseInt(m[2], 10);
  if (!Number.isFinite(current)) {
    console.error(`CFBundleVersion isn't an integer: "${m[2]}". Refusing to bump.`);
    process.exit(1);
  }
  const next = setTo !== null ? setTo : current + 1;
  const out = s.replace(re, `$1${next}$3`);
  fs.writeFileSync(PLIST_PATH, out);
  console.log(`✓ CFBundleVersion ${current} → ${next}`);
}

main();
