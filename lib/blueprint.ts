import type { Blueprint } from './types';
import { computeNatal } from './astrology/natal';
import { computeHumanDesign } from './humandesign/calculate';
import { localCivilToUtc, tzFromLatLon } from './location/timezone';

export interface BuildBlueprintArgs {
  localIso: string;     // "YYYY-MM-DDTHH:mm"
  lat: number;
  lon: number;
  place: string;
  timeUnknown: boolean;
}

export function buildBlueprint(args: BuildBlueprintArgs): Blueprint {
  const tz = tzFromLatLon(args.lat, args.lon);
  const utc = localCivilToUtc(args.localIso, tz);

  const natal = computeNatal({
    utc,
    lat: args.lat,
    lon: args.lon,
    timeUnknown: args.timeUnknown,
  });

  const humanDesign = computeHumanDesign({ birthUtc: utc });

  return {
    version: 1,
    birth: {
      iso: args.localIso,
      lat: args.lat,
      lon: args.lon,
      tz,
      place: args.place,
      timeUnknown: args.timeUnknown,
    },
    natal,
    humanDesign,
  };
}
