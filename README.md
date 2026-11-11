# Kaksha

**Kaksha** (कक्षा, "orbit") is an orbital operations console. It ingests public orbit data, predicts where satellites are, analyses how their orbits change, screens for close approaches, plans ground station passes and runs a simulated telemetry dashboard with alarms. A 3D globe and a 2D map are the visual layer; the analysis is the substance.

> **Not for operational use.** Positions and conjunctions come from public element sets propagated with SGP4 and are screening-grade. See [Known limits](docs/known-limits.md).

## Status

Weeks 1 to 3 done, plus the astro parts of weeks 8 and 9. `packages/astro` propagates with SGP4, converts frames, predicts passes with Doppler, and finds eclipses. Validation: the 33 published SGP4 cases to **0.12 mm** ([results](docs/validation/sgp4-verification.md)); Skyfield to **0.0015 mm** on the same models ([results](docs/validation/skyfield-crosscheck.md)); passes against Skyfield to **0.17 s** ([results](docs/validation/passes-crosscheck.md)). What the models ignore: [Known limits](docs/known-limits.md). The stack and its reasons: [`docs/TECH_STACK.md`](docs/TECH_STACK.md) and [`docs/decisions/`](docs/decisions/README.md).

```bash
pnpm install
pnpm check      # typecheck + lint + test
pnpm dev        # the astro workbench at http://localhost:5173
```

The **astro workbench** runs `packages/astro` in your browser: paste a TLE or OMM (or pick a verification sample) to see the sub-satellite point, ground track and state vectors at any UTC time, and it re-runs the 33 SGP4 verification cases live.

## What it will answer

- When does this satellite pass over my city?
- Did it manoeuvre recently?
- What is close to it?

Every number on screen traces to a source, an epoch and a model.

## Working on it

Read [`AGENTS.md`](AGENTS.md) first, then the role guide in [`docs/`](docs/README.md) that fits the task. Requirements, phases and the performance budget live in [`kaksha-spec.md`](kaksha-spec.md).

## Data sources

CelesTrak, NOAA SWPC, JPL Horizons and The Space Devs' Launch Library 2 in the public demo; Space-Track for local-only features. Terms and attribution are in [`docs/data-sources.md`](docs/data-sources.md).
