import { buildBlueprint } from '../lib/blueprint';
import { longitudeToGateLine } from '../lib/humandesign/gateWheel';

function dump(label: string, bp: ReturnType<typeof buildBlueprint>) {
  console.log(`--- ${label} ---`);
  console.log('TZ:', bp.birth.tz);
  console.log('Sun:', bp.natal.sun.longitude.toFixed(4), bp.natal.sun.sign, bp.natal.sun.degree.toFixed(2),
              '→ gate', bp.natal.sun.gate + '.' + bp.natal.sun.line);
  console.log('Moon:', bp.natal.moon.longitude.toFixed(4), bp.natal.moon.sign);
  console.log('NN:', bp.natal.northNode.longitude.toFixed(4));
  console.log('ASC:', bp.natal.asc?.toFixed(3));
  console.log('MC:', bp.natal.mc?.toFixed(3));
  console.log('Type:', bp.humanDesign.type);
  console.log('Profile:', bp.humanDesign.profile);
  console.log('Authority:', bp.humanDesign.authority);
  console.log('Definition:', bp.humanDesign.definition);
  console.log('Strategy:', bp.humanDesign.strategy);
  console.log('Defined Centers:', bp.humanDesign.definedCenters);
  console.log('Cross:', bp.humanDesign.incarnationCross);
  console.log('# Active Channels:', bp.humanDesign.activeChannels.length);
  const pSun = bp.humanDesign.activeGates.find(g => g.planet === 'Sun' && g.chart === 'personality');
  const dSun = bp.humanDesign.activeGates.find(g => g.planet === 'Sun' && g.chart === 'design');
  console.log('Pers Sun gate:', pSun?.gate + '.' + pSun?.line);
  console.log('Des Sun gate:', dSun?.gate + '.' + dSun?.line);
}

// Steve Jobs
dump('Steve Jobs (1955-02-24 19:15 SF)', buildBlueprint({
  localIso: '1955-02-24T19:15',
  lat: 37.7749, lon: -122.4194,
  place: 'San Francisco, California, United States',
  timeUnknown: false,
}));

// Carl Sagan (1934-11-09 05:05 Brooklyn NY)
dump('Carl Sagan (1934-11-09 05:05 Brooklyn)', buildBlueprint({
  localIso: '1934-11-09T05:05',
  lat: 40.6782, lon: -73.9442,
  place: 'Brooklyn, New York, United States',
  timeUnknown: false,
}));

// Frida Kahlo (1907-07-06 08:30 Coyoacán, Mexico)
dump('Frida Kahlo (1907-07-06 08:30 Coyoacan)', buildBlueprint({
  localIso: '1907-07-06T08:30',
  lat: 19.3506, lon: -99.1620,
  place: 'Coyoacán, Mexico',
  timeUnknown: false,
}));

console.log('\n--- gate wheel sanity ---');
console.log('0° Aries →', longitudeToGateLine(0));
console.log('302.0° (Aquarius 2°) →', longitudeToGateLine(302));
console.log('302.5° →', longitudeToGateLine(302.5));
console.log('307.624° (just under gate 19 cusp) →', longitudeToGateLine(307.624));
console.log('307.626° (just into gate 19) →', longitudeToGateLine(307.626));
