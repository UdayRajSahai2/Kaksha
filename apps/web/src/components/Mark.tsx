/** The Kaksha mark (docs/brand): an orbit with the planet at a focus and the satellite in amber. Colours come from --color-mark-* tokens. */
export function Mark({ size }: { readonly size: number }) {
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" className="mark">
      <g transform="rotate(-24 60 60)" fill="none">
        <ellipse cx="60" cy="60" rx="46" ry="34" className="mark__ring" strokeWidth="8" />
        <circle cx="91" cy="60" r="10" className="mark__planet" />
        <circle cx="27.5" cy="36" r="8" className="mark__satellite" />
      </g>
    </svg>
  );
}
