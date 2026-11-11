# ADR-0009: Python and Skyfield for validation

**Status:** Accepted, 11 November 2026

## Context

SC-01 requires published errors against the verification vectors and an independent reference library. A cross-check written in the same language and library as the code under test is not independent.

## Decision

Validation notebooks in `notebooks/`: Python 3.13, environment managed by **uv**, with **Skyfield**, **sgp4**, numpy, pandas, matplotlib and JupyterLab. They read the same OMM fixtures and times as the TypeScript tests and publish max and RMS error. Results are summarised in the README and `docs/known-limits.md`.

## Alternatives

- **Orekit.** Respected, but a Java bridge for a cross-check Skyfield already provides.
- **TypeScript-only validation.** Not independent of satellite.js.

## Consequences

- Python is a validation tool only; no production code path depends on it.
- Notebooks run locally and their outputs are committed as summaries, so CI does not need Python.

## Findings from the cross-check (week 3)

- Agreement with Skyfield on the same models is sub-micrometre in position (TEME 0.00052 mm, Earth-fixed 0.0015 mm).
- It found an inconsistency in Kaksha: the velocity transform used the WGS-84 nominal Earth rate instead of the rate of the GMST model it rotates by, 1.9 mm/s off at 220 000 km. Fixed in `temeToEcef` (`gmstRateRadPerS`).
- Against the full IAU 2000/2006 chain the difference is Earth rotation over UT1 - UTC, as documented in Known limits; 4.3 mm remains once that is removed.
