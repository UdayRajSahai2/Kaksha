# ADR-0004: PostgreSQL 18, Kysely, TimescaleDB later

**Status:** Accepted, 11 November 2026. Amended the same day: 17 became 18, the version actually installed. 17 had been a cautious guess about TimescaleDB support; nothing before week 13 depends on it, and the Docker fallback below covers week 13.

## Context

The data is relational (catalogue, element sets, events, conjunctions) and, from the telemetry phase, time series. Idempotent ingestion relies on unique keys and upserts. The laptop cannot spare the memory for Docker Desktop all day.

## Decision

- **PostgreSQL 18**, installed natively on Windows, `shared_buffers` about 256 MB.
- **Kysely 0.29 + pg** for type-safe queries that read like SQL.
- **Kysely Migrator** with numbered migrations in `infra/migrations/`, raw SQL inside.
- **TimescaleDB** added in week 13 for the telemetry hypertable, continuous aggregates and retention.

## Alternatives

- **Prisma or TypeORM.** Hide SQL behind their own model; Prisma ships a query engine. Reviewers should see the SQL.
- **Drizzle.** Reasonable; Kysely's builder maps more directly to the schema in the design document.
- **A separate time-series database.** Another service; TimescaleDB keeps one database.
- **Postgres in Docker from day one.** Costs RAM that the browser and dev servers need.

## Consequences

- Row types are written by hand in `packages/shared` (or generated later if that becomes tedious).
- Before week 13, check TimescaleDB's supported Postgres versions and Windows builds. If native support is missing, move the database into the `timescale/timescaledb` image; with data for about 200 objects, dump and restore is small.
