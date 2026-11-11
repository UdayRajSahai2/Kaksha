const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?Z$/;

/** A UTC instant from ISO 8601 text that ends in Z; anything else (local time, offsets) is refused. */
export function parseUtc(text: string): number | null {
  const trimmed = text.trim();
  if (!ISO_UTC.test(trimmed)) return null;
  const ms = Date.parse(trimmed);
  if (!Number.isFinite(ms)) return null;
  // Date.parse rolls impossible dates over (31 April becomes 1 May); refuse them instead.
  return new Date(ms).toISOString().slice(0, 10) === trimmed.slice(0, 10) ? ms : null;
}
