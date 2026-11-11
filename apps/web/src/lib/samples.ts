/**
 * Sample element sets: three cases from the SGP4 verification set (Vallado et al. 2006),
 * read from the same fixture file the tests use. Their epochs are in 2006, so they are
 * shown at their epoch by default; at today's date they are years out of date.
 */
import { parseVerificationCases } from '@kaksha/astro';
import casesText from '@kaksha/astro/fixtures/sgp4-verification/SGP4-VER.TLE?raw';

export type Sample = { readonly id: string; readonly label: string; readonly text: string };

const cases = parseVerificationCases(casesText);

function sample(satnum: number, label: string): Sample {
  const c = cases.find((x) => x.satnum === satnum);
  if (!c) throw new Error(`Verification case ${satnum} missing`);
  return { id: String(satnum), label, text: `${label}\n${c.line1}\n${c.line2}` };
}

export const SAMPLES: readonly Sample[] = [
  sample(6251, 'DELTA 1 DEB, low Earth orbit'),
  sample(8195, 'MOLNIYA 2-14, 12-hour Molniya orbit'),
  sample(28626, 'XM-3, geostationary'),
];
