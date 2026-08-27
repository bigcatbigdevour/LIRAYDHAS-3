// Sanity checks on the HD calculator.
//   $ npx tsx scripts/verify.mts

import { ALL_CHANNELS } from '../lib/humandesign/channels';
import { CENTER_GATES } from '../lib/humandesign/centers';
import { GATE_WHEEL, longitudeToGateLine } from '../lib/humandesign/gateWheel';
import { buildBlueprint } from '../lib/blueprint';

let failures = 0;
function check(label: string, ok: boolean, detail?: string) {
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.log(`  ✗ ${label}${detail ? '   — ' + detail : ''}`);
  }
}

console.log('— gate wheel —');
check('64 gates in wheel', GATE_WHEEL.length === 64);
check('first gate is 41', GATE_WHEEL[0] === 41);
check('all gates 1..64 present', new Set(GATE_WHEEL).size === 64);
check('302° → gate 41 line 1', (() => {
  const r = longitudeToGateLine(302); return r.gate === 41 && r.line === 1;
})());
check('307.624° (just under cusp) → gate 41', longitudeToGateLine(307.624).gate === 41);
check('307.626° → gate 19', longitudeToGateLine(307.626).gate === 19);
check('0° Aries → gate 25', longitudeToGateLine(0).gate === 25);

console.log('\n— centers —');
const seen: number[] = [];
for (const gs of Object.values(CENTER_GATES)) for (const g of gs) seen.push(g);
check('every gate is in exactly one center', seen.length === 64 && new Set(seen).size === 64);

console.log('\n— channels —');
check('exactly 36 channels', ALL_CHANNELS.length === 36);
{
  const dup = new Set<string>();
  let unique = true;
  for (const ch of ALL_CHANNELS) {
    const k = [...ch.gates].sort((a, b) => a - b).join('-');
    if (dup.has(k)) unique = false;
    dup.add(k);
  }
  check('no duplicate channels', unique);
}
{
  // Each channel's two gates should belong to its declared two centers.
  let ok = true;
  for (const ch of ALL_CHANNELS) {
    const [g1, g2] = ch.gates;
    const c1 = Object.entries(CENTER_GATES).find(([, gs]) => gs.includes(g1))?.[0];
    const c2 = Object.entries(CENTER_GATES).find(([, gs]) => gs.includes(g2))?.[0];
    const wantA = ch.centers[0];
    const wantB = ch.centers[1];
    const goodOrder = (c1 === wantA && c2 === wantB) || (c1 === wantB && c2 === wantA);
    if (!goodOrder) {
      ok = false;
      console.log(`     channel ${g1}-${g2} declared ${wantA}↔${wantB}, gates are in ${c1}/${c2}`);
    }
  }
  check('channel centers match each gate\'s center', ok);
}

console.log('\n— sample blueprint sanity (Steve Jobs) —');
const bp = buildBlueprint({
  localIso: '1955-02-24T19:15',
  lat: 37.7749, lon: -122.4194,
  place: 'San Francisco, California, United States',
  timeUnknown: false,
});
check('TZ resolved to America/Los_Angeles', bp.birth.tz === 'America/Los_Angeles');
check('Sun in Pisces', bp.natal.sun.sign === 'Pisces');
check('Sun degree near 5.4', Math.abs(bp.natal.sun.degree - 5.4) < 0.5);
check('Has ≥ 1 defined center', bp.humanDesign.definedCenters.length >= 1);
check('Type is a known string', ['Manifestor','Generator','Manifesting Generator','Projector','Reflector'].includes(bp.humanDesign.type));
check('Profile is x/y', /^[1-6]\/[1-6]$/.test(bp.humanDesign.profile));
check('26 active gate activations', bp.humanDesign.activeGates.length === 26);

console.log();
if (failures === 0) {
  console.log('all checks passed');
  process.exit(0);
} else {
  console.log(`${failures} check(s) failed`);
  process.exit(1);
}
