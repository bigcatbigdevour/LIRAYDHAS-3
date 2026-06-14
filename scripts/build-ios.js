#!/usr/bin/env node
/**
 * Static iOS build wrapper.
 *
 * Next.js `output: 'export'` doesn't support route handlers (anything
 * in app/api). For the iOS build we want the static pages but NOT the
 * API routes — those stay on Vercel and the app fetches them via
 * NEXT_PUBLIC_API_BASE.
 *
 * This script:
 *   1. Renames app/api to .ios-api-stash (so Next ignores it).
 *   2. Runs next build with BUILD_TARGET=ios and the live API base.
 *   3. Restores app/api on success OR failure — never leaves the source
 *      tree in a stashed state.
 *   4. Runs `cap sync ios` so the new out/ lands in the iOS project.
 *   5. Runs the Info.plist patcher.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SRC = path.join('app', 'api');
// Stash OUTSIDE the app/ folder. Anything inside app/ is scanned by
// Next.js even if its name starts with a dot.
const STASH = '.ios-api-stash';

function exists(p) {
  try { fs.statSync(p); return true; } catch { return false; }
}

function stash() {
  if (!exists(SRC)) {
    console.log('No app/api directory — nothing to stash.');
    return false;
  }
  if (exists(STASH)) {
    throw new Error(
      `${STASH} already exists. A previous build left it behind — ` +
      `mv it back to app/api manually, then re-run.`,
    );
  }
  fs.renameSync(SRC, STASH);
  return true;
}

function restore() {
  if (!exists(STASH)) return;
  if (exists(SRC)) {
    // app/api was somehow recreated mid-build (?). Don't clobber it,
    // log and leave the stash so the developer can resolve manually.
    console.warn(
      `[warn] app/api was recreated during the build; leaving ${STASH} in place.`,
    );
    return;
  }
  fs.renameSync(STASH, SRC);
}

function run(cmd, extraEnv = {}) {
  execSync(cmd, {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
  });
}

const apiBase =
  process.env.NEXT_PUBLIC_API_BASE || 'https://liraydhas-3.vercel.app';

let stashed = false;
try {
  stashed = stash();
  run('npx next build', {
    BUILD_TARGET: 'ios',
    NEXT_PUBLIC_API_BASE: apiBase,
  });
} finally {
  if (stashed) restore();
}

// Stash is back; now do the Capacitor + plist steps. These can fail
// without leaving the tree corrupted.
console.log('');
console.log('[ios:build] static export ready in ./out');
console.log('[ios:build] syncing into Capacitor iOS project…');
try {
  run('npx cap sync ios', {
    BUILD_TARGET: 'ios',
  });
} catch (e) {
  console.log('');
  console.log('cap sync ios failed.');
  console.log('Likely cause: the iOS folder doesn\'t exist yet. Run:');
  console.log('  npx cap add ios');
  console.log('then re-run npm run ios:build.');
  process.exit(1);
}

try {
  run('node scripts/patch-ios-info-plist.js');
} catch (e) {
  console.warn('[warn] Info.plist patch step failed. Run npm run ios:plist manually.');
}

try {
  run('node scripts/patch-ios-privacy.js');
} catch (e) {
  console.warn(
    '[warn] PrivacyInfo.xcprivacy patch step failed. Run npm run ios:privacy manually.\n' +
    '       Submissions without a privacy manifest are rejected at upload.',
  );
}

try {
  run('node scripts/patch-ios-entitlements.js');
} catch (e) {
  console.warn(
    '[warn] App.entitlements patch step failed. Run npm run ios:entitlements manually.\n' +
    '       Without aps-environment push notifications will silently fail in TestFlight.',
  );
}

console.log('');
console.log('[ios:build] done.');
console.log('Open Xcode with: npm run ios:open');
console.log('Pre-submission check: npm run ios:preflight');
