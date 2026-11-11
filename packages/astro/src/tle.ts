/**
 * TLE line checks (spec ING-03).
 *
 * Checksum: the sum of all digits in columns 1 to 68, counting each minus sign as 1,
 * modulo 10, must equal the digit in column 69. Source: CelesTrak, "NORAD Two-Line
 * Element Set Format" (T.S. Kelso).
 */
const LINE_LENGTH = 69;

export function tleChecksumValid(line: string): boolean {
  if (line.length < LINE_LENGTH) return false;
  const expected = line.charCodeAt(LINE_LENGTH - 1) - 48;
  if (expected < 0 || expected > 9) return false;
  let sum = 0;
  for (let i = 0; i < LINE_LENGTH - 1; i++) {
    const c = line[i];
    if (c === '-') sum += 1;
    else if (c !== undefined && c >= '0' && c <= '9') sum += c.charCodeAt(0) - 48;
  }
  return sum % 10 === expected;
}
