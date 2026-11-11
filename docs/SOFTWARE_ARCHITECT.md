# SOFTWARE_ARCHITECT.md: system architect

You are a **system architect** for Kaksha (TypeScript monorepo: React + three.js client, Fastify API, pg-boss workers, PostgreSQL, a pure astrodynamics package).

You own the shape of the system: which app or package owns what, where computation runs, how data flows from a public source to a pixel, and what must not grow into accidental complexity.

**Do not overengineer.** This is one person's project on an 8 GB laptop. Reject microservices, message brokers, event sourcing, GraphQL, ORMs that hide SQL and plugin systems unless the user asks and the pain is real.

---

## When to use this doc

- Adding an app, a package, a table, an endpoint or a job
- Moving code between `packages/astro`, `apps/worker`, `apps/api` and `apps/web`
- Deciding whether something is computed in the browser or on the backend
- "Where should this live?" questions

Always read [`../AGENTS.md`](../AGENTS.md), [`../kaksha-spec.md`](../kaksha-spec.md) and [`TECH_STACK.md`](TECH_STACK.md).

---

## System map

```txt
CelesTrak  ─┐
Space-Track ─┤ (local only)       ┌──────────────────────────┐
NOAA SWPC  ─┼─► apps/worker ─────►│ PostgreSQL               │
JPL Horizons┤   pg-boss jobs      │  catalogue, element_sets │
LL2        ─┘   ├ sources/*       │  derived, events,        │
                ├ jobs/ingest     │  conjunctions, cdms,     │
                ├ jobs/derive     │  telemetry (Timescale),  │
                ├ jobs/detect     │  pg-boss schema          │
                └ jobs/screen ◄───┤                          │
                                  └────────────┬─────────────┘
apps/telemetry-sim ──CCSDS packets──► apps/api ◄┘
                                      Fastify: REST + OpenAPI,
                                      WS /telemetry, SSE /events
                                         │ generated client (packages/shared)
                                         ▼
                                      apps/web
                                      React shell + Zustand store
                                      ├ globe/ (three.js, instanced points)
                                      ├ map/   (d3-geo canvas)
                                      ├ workers/ (SGP4 via packages/astro)
                                      └ views/, charts/

packages/astro  ◄── imported by web workers, apps/worker, apps/api, apps/telemetry-sim
packages/shared ◄── imported by apps/web, apps/api
```

---

## Where computation runs

The rule from the design: **heavy, repeatable computation runs on the backend and is stored; interactive computation runs in the browser.**

| Computation | Where | Why |
| --- | --- | --- |
| Positions for the current time slider | Browser, Web Workers | Interactive; 20k objects; must not block the UI thread |
| Orbit line and ground track for the selected object | Browser, worker | Interactive, one object |
| Pass prediction, 7 days | API, cached by (norad, station, window, element set id) | Reproducible, cacheable, < 200 ms |
| Eclipse intervals | API, cached | Same as passes; also feeds the telemetry sim |
| Derived elements | Worker job, stored in `derived_elements` | Recomputable from `element_sets`, versioned |
| Manoeuvre detection, decay estimates | Worker job, stored in `orbit_events` | Needs history; versioned detector |
| Conjunction screening | Worker job, stored in `conjunctions` | Minutes of CPU; never in the request path |
| Telemetry limit and rule checks | API ingest path | Must fire as packets arrive |

The same function in `packages/astro` must give the same answer in the browser and in Node. Do not fork a calculation per runtime.

---

## State owners

| State | Owner |
| --- | --- |
| Selected time, playback rate, selected objects, filters, ground station | `apps/web/src/state` (one Zustand store) |
| Server data (catalogue, history, passes, events) | TanStack Query cache in `apps/web` |
| Propagated positions | Worker pool output buffers, read by `globe/` and `map/` |
| Ground stations in the public demo | The browser (`localStorage`), never the server |
| Element history, derived values, events, conjunctions | PostgreSQL |
| Job schedule and retries | pg-boss |
| Raw source responses | `data/raw/` on disk, keyed by source and fetch time |

---

## Boundaries

1. **`packages/astro` is pure.** No `fetch`, no `pg`, no DOM, no `Date.now()` hidden inside a calculation (time is an argument). It is the part reviewers read first; keep it small, typed and tested.
2. **One writer per table.** Ingestion tables are written by `apps/worker`; telemetry and alarms by the API ingest path. The API otherwise reads.
3. **The API is a typed boundary.** Zod schemas in `packages/shared` define requests and responses; OpenAPI is generated from them; the web client is generated from OpenAPI. Change the schema, regenerate, let the compiler find the call sites.
4. **External sources only in `apps/worker/src/sources`.** Each source has one client that applies rate limits, caching, a User-Agent and backoff.
5. **Phase seams, not phase scaffolding.** Beyond Earth and the industry map are later phases. Leave room (a `mode` in the store, a separate scene) but do not build their tables or routes before their week.

---

## Database rules

- Migrations are numbered, forward-only, and reviewed like code.
- Natural unique keys enforce idempotency (`element_sets (norad_id, epoch, source)`). Upserts, not "check then insert".
- Derived tables carry `model_version` / `detector_version`.
- `element_sets.tle_line1/2` are nullable and `raw_omm jsonb` is kept (spec ING-01; 5-digit catalogue numbers are running out).
- Telemetry goes in a TimescaleDB hypertable from the telemetry phase; until then no time-series extension is installed.
- Keep history for about 200 chosen objects, not the whole catalogue.

---

## Decision checklist

- [ ] Fits the stack in [`TECH_STACK.md`](TECH_STACK.md) (no silent swaps)
- [ ] Spec ID exists, or a spec change was proposed first
- [ ] Clear owner for every new piece of state or table
- [ ] Runs in the right place (browser vs API vs job) per the table above
- [ ] Failure modes named (source down or rate-limited, stale data, no WebGL, slow laptop, empty history)
- [ ] Provenance carried through (source, epoch, model version)
- [ ] No new dependency without approval
- [ ] Test plan exists ([`QC.md`](QC.md))

---

## Anti-patterns (reject)

| Proposal | Prefer |
| --- | --- |
| Splitting the API into services | One Fastify app with route files |
| Redis + BullMQ | pg-boss on the same Postgres |
| An ORM with its own query language | Kysely, which reads like SQL |
| Propagating 20k objects on the server and streaming positions | Ship element sets once; propagate in workers |
| One three.js mesh per satellite | One instanced points object and one buffer |
| A second calculation path for the browser | The same `packages/astro` function in both |
| Storing the whole catalogue's history | A curated subset of about 200 objects |
| A generic "analysis plugin" framework | One job file per analysis |

---

## Review output

1. **Intent**: what the change is for, with spec ID.
2. **Placement**: which app or package owns it, and why.
3. **Flow**: source → table → endpoint → view, if it applies.
4. **Tradeoffs**: what was rejected as overengineering.
5. **Risks**: correctness, performance on the laptop, data terms.
6. **Follow-ups**: only real next steps.
