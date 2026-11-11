# Agent review docs

These guides tell AI coding agents how to work on **Kaksha**. They sit next to the root [`AGENTS.md`](../AGENTS.md).

Every specialist doc is role-based ("You are a …"). See [`ROLES.md`](ROLES.md) for the full persona map.

## Read order

| Doc | Role | When to read |
| --- | --- | --- |
| [`../AGENTS.md`](../AGENTS.md) | How to build in this repo | Always, before coding |
| [`ROLES.md`](ROLES.md) | Which persona to adopt | When choosing a review or design pass |
| [`TECH_STACK.md`](TECH_STACK.md) | The chosen stack and why | Before adding or changing any library |
| [`SOFTWARE_ARCHITECT.md`](SOFTWARE_ARCHITECT.md) | System architect | New app, package, table, endpoint or job; "where does this live?" |
| [`ASTRO_REVIEW.md`](ASTRO_REVIEW.md) | Astrodynamics engineer | Any calculation, frame, unit, time scale or number on screen |
| [`QC.md`](QC.md) | Senior QA engineer | Before finishing a feature or bugfix; when asked to test |
| [`CODE_QUALITY.md`](CODE_QUALITY.md) | Senior software engineer (quality) | After writing code; before claiming done |
| [`CRAFT_REVIEW.md`](CRAFT_REVIEW.md) | Product / craft engineer | UI, charts, copy, colour, motion, the globe |
| [`SAFETY_REVIEW.md`](SAFETY_REVIEW.md) | Security and compliance engineer | Data sources, secrets, endpoints, dependencies, deploy |

Reference docs (content, not roles):

| Doc | Holds |
| --- | --- |
| [`../kaksha-spec.md`](../kaksha-spec.md) | Requirements with IDs, phases, performance budget |
| [`known-limits.md`](known-limits.md) | What the models ignore and the measured errors; mirrored in the app |
| [`validation/`](validation/) | Generated result tables (SGP4 verification); CI fails if they drift |
| [`data-sources.md`](data-sources.md) | Every source, its terms, when they were last checked, what is republished |
| [`decisions/`](decisions/) | Architecture decision records, one per significant choice |

## Rule

Agents must not skip these docs because a task "looks small." A one-character change to a constant can move every satellite on the globe by kilometres, and a new endpoint can leak data the project is not allowed to republish.
