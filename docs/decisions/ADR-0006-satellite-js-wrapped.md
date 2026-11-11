# ADR-0006: satellite.js behind a typed wrapper

**Status:** Accepted, 11 November 2026

## Context

Public element sets (OMM/TLE) are fitted to SGP4 theory and only meaningful when propagated with SGP4/SDP4. Propagation must run in browser workers and in Node. Writing SGP4 from scratch is a large, error-prone job that would not show more skill than validating an existing implementation well.

## Decision

Use **satellite.js 7.1** (SGP4/SDP4, loads OMM) for propagation only. Wrap it in `packages/astro` with branded unit types and frame-labelled outputs (`posTemeKm`). Frames, passes, eclipses, Doppler, RTN, root finding and detectors are Kaksha's own code. Validate the wrapper against the Vallado et al. verification vectors and Skyfield (ADR-0009).

## Alternatives

- **Own SGP4 port.** Weeks of work with high risk of subtle bugs.
- **Server-only propagation (Python sgp4 or Orekit).** Cannot run in the browser.
- **CesiumJS.** Large, and hides the frame work this project exists to show.

## Consequences

- satellite.js types and units never leak past the wrapper.
- Read the satellite.js 7 README and changelog before writing the wrapper; older tutorials target older APIs.
- The published error table states what was measured, not what the library claims.

## Findings from validation (week 2)

Validating rather than trusting paid off immediately:

- `SatRec.epochyr` is documented as a four-digit year, but both loaders store the two-digit TLE year. Reading it as documented put every epoch in the 1900s. The wrapper applies the TLE pivot and a test cross-checks against `jdsatepoch`.
- `gstime` takes a float64 Julian date (about 40 microseconds of resolution); Kaksha computes GMST from milliseconds.
- `eciToGeodetic` returns a wrong height on the polar axis; Kaksha uses its own WGS-84 conversion.
- `json2satrec` truncates OMM epochs to whole milliseconds (recorded in Known limits).
- Propagation itself matches the verification vectors to 0.12 mm.
