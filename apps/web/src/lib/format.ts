/** Display formatting. A true minus sign and a non-breaking space before every unit. */
const NBSP = ' ';
const MINUS = '−';

export function fixed(value: number, digits: number): string {
  const text = Math.abs(value).toFixed(digits);
  return value < 0 && Number(text) !== 0 ? `${MINUS}${text}` : text;
}

export function withUnit(value: number, digits: number, unit: string): string {
  return `${fixed(value, digits)}${NBSP}${unit}`;
}

export function latitude(deg: number): string {
  return `${Math.abs(deg).toFixed(3)}°${NBSP}${deg >= 0 ? 'N' : 'S'}`;
}

export function longitude(deg: number): string {
  return `${Math.abs(deg).toFixed(3)}°${NBSP}${deg >= 0 ? 'E' : 'W'}`;
}

/** 2026-11-11 06:12:34 UTC */
export function utc(ms: number): string {
  return `${new Date(ms).toISOString().slice(0, 19).replace('T', ' ')}${NBSP}UTC`;
}

/** Whole-second ISO form, the value the time field accepts. */
export function isoUtc(ms: number): string {
  return `${new Date(ms).toISOString().slice(0, 19)}Z`;
}

/** Signed span such as "2 d 03 h 14 min after epoch". */
export function age(ms: number): string {
  const totalMin = Math.round(Math.abs(ms) / 60_000);
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  const span =
    d > 0
      ? `${d}${NBSP}d ${String(h).padStart(2, '0')}${NBSP}h`
      : `${h}${NBSP}h ${String(m).padStart(2, '0')}${NBSP}min`;
  if (totalMin === 0) return 'at epoch';
  return `${span} ${ms >= 0 ? 'after' : 'before'} epoch`;
}

/** Two significant figures in millimetres, for verification errors given in km. */
export function mm(km: number): string {
  return km === 0 ? `0${NBSP}mm` : `${(km * 1e6).toPrecision(2)}${NBSP}mm`;
}
