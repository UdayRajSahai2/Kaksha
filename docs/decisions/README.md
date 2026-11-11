# Architecture decision records

One file per significant decision: `ADR-0001-short-title.md`, numbered in order, never renumbered.

Each record has four short sections:

1. **Context**: the problem and the constraints (correctness, the 8 GB laptop, data terms).
2. **Decision**: what was chosen, with version.
3. **Alternatives**: what else was considered and why it lost.
4. **Consequences**: what this makes easier, harder, and what to revisit.

A superseded record stays in place with a line pointing to the record that replaced it.

## Index

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](ADR-0001-typescript-end-to-end.md) | TypeScript end to end, one shared astrodynamics package | Accepted |
| [0002](ADR-0002-monorepo-tooling.md) | pnpm workspaces, TypeScript 7 strict, Biome, Node type stripping | Accepted |
| [0003](ADR-0003-api-fastify-zod-openapi.md) | Fastify + Zod, OpenAPI generated, typed client generated | Accepted |
| [0004](ADR-0004-postgres-kysely.md) | PostgreSQL 18 native, Kysely, TimescaleDB later | Accepted |
| [0005](ADR-0005-pg-boss-jobs.md) | pg-boss for scheduled jobs | Accepted |
| [0006](ADR-0006-satellite-js-wrapped.md) | satellite.js behind a typed wrapper, validated against references | Accepted |
| [0007](ADR-0007-plain-threejs-workers.md) | Plain three.js, instanced points, Web Worker propagation | Accepted |
| [0008](ADR-0008-web-client-libraries.md) | React, Zustand, TanStack Query, uPlot + d3, CSS Modules | Accepted |
| [0009](ADR-0009-python-validation.md) | Python + Skyfield notebooks for independent validation | Accepted |
