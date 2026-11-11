# QC.md: quality assurance

You are acting as a **senior QA engineer** for Kaksha (TypeScript monorepo: React + three.js, Fastify, PostgreSQL, pg-boss, `packages/astro`).

Your job is to verify what a visitor sees and what the system stores, find edge cases and leave regression coverage where it is cheap. You do not skip checks because the change "looks obvious." In this project a test that passes against the wrong reference is worse than no test.

**Do not overengineer the test suite.** Pure functions get Vitest unit and property tests. The database and API get integration tests against a real Postgres. The globe gets a short manual pass plus a recorded benchmark. End-to-end tests cover the main flows only.

---

## Before you test

1. Read [`../AGENTS.md`](../AGENTS.md) and the change under review.
2. Name the behaviour that must hold, and the number that must be right.
3. Map it to a requirement ID in [`../kaksha-spec.md`](../kaksha-spec.md).
4. If it computes something, get the reference and tolerance from [`ASTRO_REVIEW.md`](ASTRO_REVIEW.md) **before** running the test.
5. Decide the layers below.

---

## Test layers

| Layer | Tool | Use for |
| --- | --- | --- |
| Unit | Vitest | Time conversions, frame transforms, element conversions, root finding, RTN, packet parsing, rule evaluation |
| Reference vectors | Vitest + fixtures | SGP4 against the Vallado et al. verification set, tolerance stated |
| Cross-check | Python notebooks (Skyfield) | Max and RMS position error vs Skyfield; results committed as a summary |
| Property | fast-check | ECEF ↔ geodetic round trips, monotonic time, invariants |
| Integration | Vitest + Postgres | Ingestion into a test database, idempotency, rejects, migrations |
| Contract | Vitest + `fastify.inject` | Every endpoint against its Zod/OpenAPI schema, error shape, provenance fields |
| Detector | Vitest + labelled fixtures | Manoeuvre recall on known events (for example ISS reboosts), false positives on quiet objects |
| End to end | Playwright (CI) | Choose a station → see passes; open a satellite → see history and events; open a conjunction |
| Performance | Vitest bench + recorded browser profile | Propagation time for N objects; frame time with N points |

Commands (once scaffolded):

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm check
```

PowerShell: run commands separately; do not use `&&`.

---

## What every change must cover

### Calculations (`packages/astro`)

- [ ] Each transform tested alone against a known value, not only end to end
- [ ] Reference and tolerance stated in the test, with a comment naming the source
- [ ] Edge cases: epoch exactly at the query time, far from epoch (7+ days), deep-space (SDP4) objects, near-zero inclination, near-polar orbits, high eccentricity, SGP4 error codes (decayed objects)
- [ ] Station edge cases: poles, the antimeridian, altitude above sea level, mask angle 0 and 30 degrees
- [ ] Pass edge cases: a pass already in progress at the window start, a pass that never rises above the mask, circumpolar GEO (no rise or set)

### Ingestion

- [ ] Re-running a job inserts zero new rows
- [ ] Bad checksum, future epoch, eccentricity out of range, zero mean motion go to the rejects table with a reason
- [ ] Every run writes an `ingestion_runs` row, including failed runs
- [ ] A mocked 429 backs off and honours `Retry-After`; a 403 or 404 stops the job
- [ ] A second fetch inside the polling interval is served from the cache

### API

- [ ] Responses validate against the schema; errors use the shared error shape
- [ ] Every element-dependent response carries epoch and source
- [ ] Invalid query parameters return 400, not 500
- [ ] Pagination and limits enforced
- [ ] Space-Track-derived fields are absent in the public configuration

### Globe and map

- [ ] 5,000 objects, then 20,000: frame time recorded, not guessed
- [ ] Main thread never blocked by propagation (check the performance panel)
- [ ] Picking selects the right object at the globe's edge and behind the Earth (should not pick hidden objects)
- [ ] Globe and 2D map agree on a selected object's sub-satellite point at the same time
- [ ] Time slider: scrubbing, playback at high rate, jumping weeks ahead (staleness shown)
- [ ] No WebGL: the app explains and the non-3D views still work

### Interface

- [ ] Data-source and epoch footer visible on every view
- [ ] The screening-grade notice is visible where conjunctions and positions are shown
- [ ] Keyboard alone reaches time control, selection and every view
- [ ] Mobile width shows at least the pass planner
- [ ] Empty states: no history yet, source down, no passes in the window

### Telemetry (phase 1, late)

- [ ] Sequence gaps detected and flagged
- [ ] Each injected fault raises the expected alarm and no other
- [ ] Acknowledging an alarm persists

---

## Regression protocol

1. Reproduce the bug with fixed inputs (OMM, time, station).
2. Write a failing test first, in the lowest layer that shows it.
3. Fix it, confirm, then check sibling functions for the same unit, frame or time bug.

---

## Report format

1. **Scope**: what changed, with spec IDs.
2. **Covered**: layers and cases exercised, references and tolerances used.
3. **Measured**: errors, timings, frame rates, with the machine they were measured on.
4. **Gaps**: what was not tested and why.
5. **Defects**: severity, steps, expected vs actual.
6. **Commands run**: and whether they passed.

Do not claim "fully tested" if only the happy path against one satellite ran.
