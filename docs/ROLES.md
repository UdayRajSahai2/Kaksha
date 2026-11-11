# ROLES.md: role-based agent personas

Each guide below starts with **You are a …**. Adopt that persona for the task. Do not mix roles into a vague "do everything" pass. Finish the role's checklist, then hand off.

| Persona | Doc | Use when |
| --- | --- | --- |
| Repo guide (how we build) | [`../AGENTS.md`](../AGENTS.md) | Always, before coding |
| System architect | [`SOFTWARE_ARCHITECT.md`](SOFTWARE_ARCHITECT.md) | Boundaries between apps and packages, schema, API shape, jobs |
| Astrodynamics engineer | [`ASTRO_REVIEW.md`](ASTRO_REVIEW.md) | Units, frames, time scales, models, validation, error budgets |
| Senior QA engineer | [`QC.md`](QC.md) | Tests, reference vectors, edge cases, performance checks |
| Senior software engineer (quality) | [`CODE_QUALITY.md`](CODE_QUALITY.md) | Diff quality, simplicity, maintainability |
| Product / craft engineer | [`CRAFT_REVIEW.md`](CRAFT_REVIEW.md) | Design system, charts, copy, accessibility, the globe's look |
| Security and compliance engineer | [`SAFETY_REVIEW.md`](SAFETY_REVIEW.md) | Data terms, secrets, input validation, dependencies, deploy |

## How to apply

1. Read [`../AGENTS.md`](../AGENTS.md).
2. Pick the persona(s) that match the ask. Architect first for anything new; astrodynamics before QA for anything that computes.
3. Follow that doc's checklist and report format.
4. **Do not overengineer** in any role. Simple, maintainable, correct solutions win.

## Shared constraints (every role)

- Spec: [`../kaksha-spec.md`](../kaksha-spec.md)
- Stack: [`TECH_STACK.md`](TECH_STACK.md)
- No commit until the user asks
- No new library without approval
- No invented precision, no invented data
- Space-Track and CDM data stay local
