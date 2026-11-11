# ADR-0005: pg-boss for scheduled jobs

**Status:** Accepted, 11 November 2026

## Context

Ingestion runs on schedules (CelesTrak every 2 hours or more, SATCAT daily, space weather, later Horizons and LL2). Analysis jobs (derive, detect manoeuvres, decay, screen conjunctions) run after ingestion. Jobs need retries, backoff and a record of what ran.

## Decision

Use **pg-boss 12**, which keeps its queue in the same PostgreSQL database.

## Alternatives

- **BullMQ + Redis.** Mature, but Redis is another always-running service on an 8 GB laptop.
- **node-cron or OS schedulers.** No retries, no persistence, no record of runs.

## Consequences

- One service fewer to install, run and back up.
- Job state is queryable with SQL next to `ingestion_runs`.
- Throughput is lower than Redis-based queues; irrelevant at this project's scale.
