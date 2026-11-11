# Kaksha: product spec

Requirements, phases and budgets for Kaksha, an orbital operations console. Derived from the design document *Orbital Ops Console: System Design* (11 November 2026). When this file and the design document disagree, this file wins; change it here first.

Every feature and bugfix maps to an ID below. A request with no ID gets a spec change proposed before code is written.

---

## 1. Product

**What it is.** A web application that ingests public orbit data, predicts where satellites are, analyses how their orbits change, screens for close approaches, plans ground station passes and runs a simulated telemetry dashboard with alarms. The globe and map are the visual layer; the analysis is the substance.

**Audience.** Hiring engineers at space companies. Priority: correctness, then engineering practice, then looks.

**Non-goals.** Not an operational collision-avoidance tool. Does not claim operational accuracy. TLE/OMM results are screening-grade, and the app says so.

### Success criteria

| ID | Criterion |
| --- | --- |
| SC-01 | SGP4 positions match the published verification vectors and Skyfield, with max and RMS error published |
| SC-02 | 20,000+ objects render at 60 fps on the dev laptop (Ryzen 5 2500U, GTX 1050, 8 GB), or the gap is measured and documented |
| SC-03 | A new visitor can answer: when does this satellite pass over my city, did it manoeuvre recently, what is close to it |
| SC-04 | Every number on screen traces to a source, an epoch and a model |

---

## 2. Phases and cut order

| Phase | Weeks | Scope |
| --- | --- | --- |
| 1. Earth operations | 1–14 | Sections 3.1–3.9 |
| 2. Beyond Earth | 15–17 | Section 3.10 |
| 3. Space industry map | 18–20 | Section 3.11 |

If behind, protect in this order: (1) correct core, weeks 1–3; (2) globe and passes, 6–8; (3) orbit analytics, 9–11; (4) conjunctions, 12; (5) telemetry, 13. Telemetry and CZML shrink first. Phases 2 and 3 are cut whole, from the end.

### Milestones (phase 1)

| Week | Focus | Done when |
| --- | --- | --- |
| 1 | Monorepo, tooling, CI, `packages/astro` skeleton, time utilities | CI green on an empty but real project |
| 2 | SGP4 wrapper, TEME → ECEF → geodetic, reference-vector tests | Test suite passes and error table exists |
| 3 | Python cross-check against Skyfield | Max and RMS error in km stated |
| 4 | CelesTrak ingestion, schema, migrations, `ingestion_runs`; start history polling | Re-running the job creates no duplicates |
| 5 | API v1, OpenAPI, bulk latest elements | Client generated from the spec; contract tests |
| 6 | Globe: three.js, worker propagation, instanced points | 5,000 objects smooth; frame-time benchmark recorded |
| 7 | 20k+, picking, filters, time slider, linked 2D map | 60 fps met or gap documented |
| 8 | Ground stations, passes, sky plot, Doppler | Passes match an independent tool for sample cases |
| 9 | Eclipse module, history for the chosen subset | Eclipse times validated against a reference |
| 10 | Derived elements, trend charts, manoeuvre detector v1 | Detector recall and false positives on labelled cases |
| 11 | Decay estimator, space weather, staleness overlay | Decay ranges compared with known reentries |
| 12 | Conjunction screening, RTN view, CDM comparison (local) | Screening finds known CDM events for a test day |
| 13 | Telemetry sim, CCSDS, ingest, TimescaleDB, alarms | Injected faults raise the expected alarms |
| 14 | CZML, Known limits, README, ADRs, demo deploy, video | A stranger runs it with one command and understands it in five minutes |

---

## 3. Requirements

### 3.1 Core astrodynamics (`packages/astro`)

| ID | Requirement |
| --- | --- |
| CORE-01 | Physical quantities carry units in names or branded types; vectors carry their frame |
| CORE-02 | UTC at every boundary; Julian date internally; ignored corrections (UT1-UTC, leap seconds, polar motion) stated |
| CORE-03 | SGP4/SDP4 via satellite.js behind a typed wrapper; loads OMM and TLE; output labelled TEME |
| CORE-04 | TEME → ECEF (GMST rotation) → geodetic (WGS-84) |
| CORE-05 | ECEF → topocentric ENU → azimuth, elevation, range, range rate |
| CORE-06 | Reference-vector tests against the Vallado et al. verification set with stated tolerances |
| CORE-07 | Skyfield cross-check notebook; max and RMS error published in README and Known limits |
| CORE-08 | The package has no UI, network or database imports |

### 3.2 Ingestion

| ID | Requirement |
| --- | --- |
| ING-01 | Prefer OMM JSON; keep TLE lines when present (nullable) and `raw_omm` |
| ING-02 | Idempotent on `(norad_id, epoch, source)` |
| ING-03 | Validate checksum, epoch, eccentricity, mean motion; quarantine failures in a rejects table |
| ING-04 | Record every run in `ingestion_runs` (fetched, inserted, rejected, error) |
| ING-05 | Polite clients: per-source rate limit, disk cache, User-Agent with contact, backoff, stop on 403/404 |
| ING-06 | CelesTrak each group at most every 2 hours; history polling for about 200 chosen objects from week 4 |
| ING-07 | Space weather (Kp, F10.7) from NOAA SWPC |
| ING-08 | Space-Track and CDMs are local-only features |

### 3.3 API

| ID | Requirement |
| --- | --- |
| API-01 | OpenAPI generated from Zod schemas; TypeScript client generated from OpenAPI |
| API-02 | ISO 8601 UTC, units in field names, pagination, ETag on element data, one error shape |
| API-03 | Element-dependent responses include the element set's epoch and source |
| API-04 | Endpoints: satellites search and detail, element history, bulk latest elements (compressed), events, passes, eclipses, conjunctions, CDMs (local), CZML export, health, metrics, WS telemetry |
| API-05 | Rate limiting and input bounds on every endpoint |

### 3.4 Web client

| ID | Requirement |
| --- | --- |
| WEB-01 | One store holds time, selection, filters and station; every view subscribes (linked brushing) |
| WEB-02 | Element sets sent to a worker pool once; workers write positions to transferable `Float32Array`s |
| WEB-03 | One instanced points object for all satellites; colour by orbit class or type |
| WEB-04 | Propagate at 5–10 Hz and interpolate; render at 60 fps |
| WEB-05 | Picking by GPU colour ID or spatial index, never raycasting thousands of meshes |
| WEB-06 | Orbit lines and ground tracks only for selected objects |
| WEB-07 | Globe and 2D map share time and agree on positions (explicit Earth rotation) |
| WEB-08 | Data-source and epoch footer on every view |
| WEB-09 | Keyboard time control; colour-blind-safe palette; status not by colour alone |
| WEB-10 | Mobile layout shows at least the pass planner |
| WEB-11 | Screening-grade notice wherever positions and conjunctions are shown |
| WEB-12 | Views: globe, map, pass planner, orbit analytics, conjunctions, telemetry, Known limits, Data sources |
| WEB-13 | Astro workbench: a page that runs `packages/astro` in the browser on a pasted element set (position, vectors, ground track, element age) and re-runs the SGP4 verification set live. Each new astro capability gets a panel here when it lands, so it can be checked by eye before its product view exists |

### 3.5 Passes, eclipses, Doppler

| ID | Requirement |
| --- | --- |
| PASS-01 | Coarse step (about 30 s), then refine rise, culmination and set by root finding |
| PASS-02 | Output rise/set times and azimuths, max elevation, duration, visibility (sunlit satellite, dark station) |
| PASS-03 | Sky plot data (time, azimuth, elevation) and elevation-versus-time curve |
| PASS-04 | Passes match an independent tool for sample cases |
| ECL-01 | Sun position from a low-precision series; cylindrical shadow first, conical as refinement |
| ECL-02 | Eclipse entry and exit per orbit; feeds the telemetry power model |
| DOP-01 | Doppler curve over a pass for a user-chosen frequency (`-f0 * rangeRate / c`) |

### 3.6 Element history

| ID | Requirement |
| --- | --- |
| HIST-01 | Derived semi-major axis, perigee and apogee altitude, period; Kozai/Brouwer handling documented |
| HIST-02 | Manoeuvre detector: robust baseline (rolling median, MAD); raise, lower, plane change; confidence and bracketing epochs |
| HIST-03 | Detector measured on hand-labelled cases (recall) and quiet objects (false positives) |
| HIST-04 | Decay estimate as a range, never a single date |
| HIST-05 | Staleness: element age at the viewing time and an uncertainty overlay that grows with age |
| HIST-06 | Trend charts (altitude, inclination, eccentricity, RAAN) with events marked |

### 3.7 Conjunctions

| ID | Requirement |
| --- | --- |
| CONJ-01 | Coarse altitude-shell filter, then grid hash or k-d tree on a time grid |
| CONJ-02 | TCA refined by golden-section or Brent; miss distance and relative speed |
| CONJ-03 | Relative position in the primary's RTN frame |
| CONJ-04 | Pc only from a real CDM covariance; otherwise miss distance and a "no covariance" note |
| CONJ-05 | Runs as a background job, one chosen satellite against a filtered set |
| CONJ-06 | Local CDM view compares CDM values with Kaksha's own result |

### 3.8 Telemetry

| ID | Requirement |
| --- | --- |
| TLM-01 | Synthetic small satellite: power (from eclipses), thermal, attitude; labelled synthetic |
| TLM-02 | Fault injection: battery degradation, stuck sensor, temperature spike, packet loss, time-tagged mode command |
| TLM-03 | Simplified CCSDS Space Packet (6-byte primary header, time secondary header, dictionary-defined payload) |
| TLM-04 | Typed parser with sequence-gap detection; decoding by a JSON telemetry dictionary |
| TLM-05 | Rules: static limits (yellow/red), rate of change, rolling z-score, one combined-channel rule |
| TLM-06 | Alarms stored, acknowledgeable, with history; streamed over WebSocket; 1 Hz or slower |

### 3.9 Operations and honesty

| ID | Requirement |
| --- | --- |
| OPS-01 | Structured logs, `/health`, metrics (ingestion lag, job duration, API latency) |
| OPS-02 | CI: lint, typecheck, unit, reference-vector tests, build, container build |
| OPS-03 | Seed script reproduces the demo data without Space-Track |
| OPS-04 | One-command local run (from week 13: Docker Compose) |
| LIM-01 | A Known limits page in the app, mirrored in `docs/known-limits.md` |
| LIM-02 | A Data sources page in the app, mirrored in `docs/data-sources.md` |
| LIM-03 | Not-for-operational-use notice; no agency or company logos |

### 3.10 Beyond Earth (phase 2)

| ID | Requirement |
| --- | --- |
| BEY-01 | Sun, Moon and planets from astronomy-engine in the browser |
| BEY-02 | About 15 deep-space spacecraft from JPL Horizons, fetched by a job, stored in chunks, Hermite-interpolated |
| BEY-03 | Distance from Earth and Sun, speed, one-way light time |
| BEY-04 | True-scale and logarithmic scale toggle; floating origin; markers not true-size spheres |
| BEY-05 | One tested ICRF ↔ TEME/ECEF module; Sun direction agrees in both views |
| BEY-06 | Past (reconstructed) and future (predicted) paths labelled differently |

### 3.11 Space industry map (phase 3)

| ID | Requirement |
| --- | --- |
| MAP-01 | CelesTrak SATCAT status codes as the single status source; every count shows source, definition and time |
| MAP-02 | Density bins when zoomed out; points when zoomed in or filtered |
| MAP-03 | Launch sites (seed file + LL2) and launches (LL2) with T-minus countdowns; SSE for status changes |
| MAP-04 | Launch-to-object matching stored with a confidence; tested on past launches |
| MAP-05 | Detail panels for satellite, site, launch, vehicle and country, each ending with source and time |
| MAP-06 | Natural Earth outlines drawn with d3-geo on canvas; no tile server |

---

## 4. Performance budget

Measured on the dev laptop and recorded in the repo. Starting targets; adjust to what is measured.

| Metric | Target |
| --- | --- |
| Propagate 20,000 objects once | Under 15 ms across workers (at most 3 workers on this CPU) |
| Frame time with 20,000 points | Under 16 ms |
| First meaningful render | Under 3 s on broadband |
| Pass prediction, one satellite, 7 days | Under 200 ms server-side, cached |
| Conjunction screening, one shell, 24 h | Minutes, in a background job |

---

## 5. Design system

Not chosen yet. A design pass happens before week 6 (the first real UI) and writes the tokens here. Fixed constraints for that pass:

- Reads as an operations console, not a game or a toy
- Colour-blind-safe categorical palette; warning and critical colours reserved for alarms and close approaches
- Tabular figures for numbers; units always shown
- Every colour is a token in `apps/web/src/styles/tokens.css`; three.js reads the same tokens
- Light and dark themes are both legible; dark is not mandatory

---

## 6. Legal constraints (summary)

Full detail in [`docs/data-sources.md`](docs/data-sources.md). Not legal advice.

- The public demo uses CelesTrak, NOAA SWPC, JPL Horizons and LL2 only.
- Space-Track data and CDMs: local only; the public repo shows code, tests and Kaksha's own summary results.
- Credit every source in the app and README; textures and map data are public domain or licensed with credit.
- No accounts in the public demo; ground stations stay in the browser.
