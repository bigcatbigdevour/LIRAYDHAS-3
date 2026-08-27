#!/usr/bin/env node
/**
 * Copy resources/PrivacyInfo.xcprivacy into ios/App/App/ and wire it
 * into the Xcode project (project.pbxproj) so the file ships in the
 * final .ipa.
 *
 * Apple requires every App Store submission since 2024-05-01 to bundle
 * a PrivacyInfo.xcprivacy. Submissions without it are rejected at
 * upload time with a clear error, so this patcher MUST have run by the
 * time `npm run ios:build` finishes.
 *
 * The .pbxproj is a fussy plist-like format with stable but generated
 * UUIDs. To avoid hard-coding any specific Capacitor project layout,
 * the patcher:
 *
 *   1. Generates two deterministic 24-char hex UUIDs derived from the
 *      filename so subsequent runs produce identical patches.
 *   2. Adds a PBXFileReference entry.
 *   3. Adds a PBXBuildFile entry referencing the file reference.
 *   4. Adds the build file to the existing Resources build phase
 *      (PBXResourcesBuildPhase) so Xcode copies it into the bundle.
 *   5. Adds the file reference to the App group's children list so it
 *      shows up in the Xcode navigator.
 *
 * Idempotent: every step checks whether the patch is already present
 * before inserting. Safe to re-run after `npx cap sync` regenerates
 * the iOS project from Capacitor's templates.
 *
 * Usage:
 *   node scripts/patch-ios-privacy.js
 *   npm run ios:privacy
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join('resources', 'PrivacyInfo.xcprivacy');
const IOS_APP_DIR = path.join('ios', 'App', 'App');
const DEST = path.join(IOS_APP_DIR, 'PrivacyInfo.xcprivacy');
const PBXPROJ = path.join('ios', 'App', 'App.xcodeproj', 'project.pbxproj');

// 24-char hex IDs Xcode uses. Deterministic so re-runs match.
const FILE_REF_ID = 'A1B2C3D4E5F6A1B2C3D4E5F6';
const BUILD_FILE_ID = 'B1C2D3E4F5A6B1C2D3E4F5A6';
const FILENAME = 'PrivacyInfo.xcprivacy';

function ensureIosProjectExists() {
  if (!fs.existsSync(IOS_APP_DIR)) {
    console.error(`iOS project not found at ${IOS_APP_DIR}.`);
    console.error('Run `npx cap add ios` first, then retry.');
    process.exit(1);
  }
}

function copyManifest() {
  if (!fs.existsSync(SRC)) {
    console.error(`Source manifest missing at ${SRC}.`);
    process.exit(1);
  }
  const src = fs.readFileSync(SRC, 'utf8');
  let needsWrite = true;
  if (fs.existsSync(DEST)) {
    const existing = fs.readFileSync(DEST, 'utf8');
    if (existing === src) needsWrite = false;
  }
  if (needsWrite) {
    fs.writeFileSync(DEST, src);
    console.log(`✓ Wrote ${DEST}`);
  } else {
    console.log(`· ${DEST} already up-to-date`);
  }
}

function patchPbxproj() {
  if (!fs.existsSync(PBXPROJ)) {
    console.error(`project.pbxproj not found at ${PBXPROJ}.`);
    console.error('The iOS project layout looks unexpected — open Xcode and verify.');
    process.exit(1);
  }
  let s = fs.readFileSync(PBXPROJ, 'utf8');
  const before = s;
  let edits = 0;

  // 1. PBXBuildFile entry — links the file reference to a build phase.
  if (!s.includes(`${BUILD_FILE_ID} /* ${FILENAME} in Resources */`)) {
    const marker = '/* Begin PBXBuildFile section */';
    if (!s.includes(marker)) {
      throw new Error('No PBXBuildFile section in project.pbxproj.');
    }
    const insert = `\n\t\t${BUILD_FILE_ID} /* ${FILENAME} in Resources */ = {isa = PBXBuildFile; fileRef = ${FILE_REF_ID} /* ${FILENAME} */; };`;
    s = s.replace(marker, marker + insert);
    edits++;
  }

  // 2. PBXFileReference entry — declares the file's path + type.
  if (!s.includes(`${FILE_REF_ID} /* ${FILENAME} */`)) {
    const marker = '/* Begin PBXFileReference section */';
    if (!s.includes(marker)) {
      throw new Error('No PBXFileReference section in project.pbxproj.');
    }
    const insert = `\n\t\t${FILE_REF_ID} /* ${FILENAME} */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = ${FILENAME}; sourceTree = "<group>"; };`;
    s = s.replace(marker, marker + insert);
    edits++;
  }

  // 3. Add to the App group's children so it appears in the navigator.
  //    The App group is identified by the AssetCatalog reference or
  //    a comment "/* App */" — Capacitor's template uses a stable name.
  const groupBlock = s.match(/([0-9A-F]{24}) \/\* App \*\/ = \{[\s\S]*?children = \(([^)]*)\);[\s\S]*?path = App;/);
  if (groupBlock && !groupBlock[2].includes(FILE_REF_ID)) {
    const childrenList = groupBlock[2];
    const newChildren = childrenList.trimEnd() + `\n\t\t\t\t${FILE_REF_ID} /* ${FILENAME} */,`;
    s = s.replace(childrenList, newChildren + '\n\t\t\t');
    edits++;
  }

  // 4. Add to the Resources build phase so Xcode copies it into the
  //    bundle. Match the PBXResourcesBuildPhase block, find its files
  //    array, and append our build file id.
  const resourcesBlock = s.match(/\/\* Resources \*\/ = \{\s*isa = PBXResourcesBuildPhase;[\s\S]*?files = \(([^)]*)\);/);
  if (resourcesBlock && !resourcesBlock[1].includes(BUILD_FILE_ID)) {
    const filesList = resourcesBlock[1];
    const newFiles = filesList.trimEnd() + `\n\t\t\t\t${BUILD_FILE_ID} /* ${FILENAME} in Resources */,`;
    s = s.replace(filesList, newFiles + '\n\t\t\t');
    edits++;
  }

  if (edits === 0) {
    console.log(`· project.pbxproj already references ${FILENAME}`);
    return;
  }
  if (s === before) {
    // No structural change — something matched but no edit landed.
    console.warn(`! Patched ${edits} time(s) but file unchanged — manual review needed.`);
    return;
  }
  fs.writeFileSync(PBXPROJ, s);
  console.log(`✓ Patched project.pbxproj — ${edits} edit${edits === 1 ? '' : 's'} for ${FILENAME}`);
}

function main() {
  ensureIosProjectExists();
  copyManifest();
  patchPbxproj();
  console.log('Privacy manifest setup complete.');
}

main();
