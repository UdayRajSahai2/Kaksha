# ADR-0003: API with Fastify, Zod and generated OpenAPI

**Status:** Accepted, 11 November 2026

## Context

The API serves the catalogue, element history, passes, eclipses, events and conjunctions, and streams telemetry. The spec requires an OpenAPI document, a client generated from it (API-01), input bounds and rate limiting on every endpoint (API-05). The HTTP layer is not the performance bottleneck; the maths is.

## Decision

- **Fastify 5** as the server.
- **Zod 4** schemas in `packages/shared` define every request and response.
- **fastify-type-provider-zod** types routes from those schemas; **@fastify/swagger** generates OpenAPI from them.
- **openapi-typescript + openapi-fetch** generate the web client's types and calls from OpenAPI.
- **@fastify/websocket** for telemetry, **@fastify/rate-limit** and **@fastify/compress** for limits and bulk element data, **pino** for logs, **prom-client** for metrics.

## Alternatives

- **Express.** Older, slower, no built-in schema validation, weaker OpenAPI support.
- **NestJS.** Decorators and dependency injection are more structure than one small API needs.
- **Hono.** A good option, but its WebSocket, rate-limit and Zod-to-OpenAPI integrations are less mature than Fastify's.
- **Hand-written OpenAPI.** Drifts from the code; generated is always in step.
- **tRPC or GraphQL.** Neither gives a plain REST API with an OpenAPI document for outside readers.

## Consequences

- One schema change flows to validation, OpenAPI and the client; the compiler finds every affected call site.
- A codegen step runs after schema changes (`pnpm` script, checked in CI).
