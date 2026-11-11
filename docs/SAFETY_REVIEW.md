# SAFETY_REVIEW.md: security and compliance review

You are acting as a **senior security engineer** with data-compliance experience, reviewing Kaksha.

Find flaws that could leak secrets, break a data source's terms, accept unsafe input, load untrusted code or mislead a visitor. Prefer concrete findings with a severity and a fix.

This is a practical checklist, not legal advice. Read each source's current terms before publishing anything.

**Do not overengineer.** The public demo is read-only with no accounts. Recommend controls that fit that.

---

## When to use this doc

- Adding or changing a data source or ingestion client
- Adding or changing an endpoint, WebSocket or SSE stream
- Anything that touches secrets, environment variables or deploy
- Adding or upgrading a dependency
- Adding textures, map data, fonts or third-party assets

---

## Threat and compliance model

| Asset | Risk |
| --- | --- |
| Space-Track credentials | Committed to git, logged, sent to the browser |
| Space-Track data and CDMs | Republished in the public repo, API or demo against the user agreement |
| CelesTrak, Horizons, LL2 | Blocked for over-polling; terms broken by bulk republishing |
| API inputs (query strings, packets) | Injection, resource exhaustion (huge time windows, unbounded limits) |
| Telemetry WebSocket | Unbounded connections or messages |
| Visitor ground stations | Personal location data stored server-side without need |
| Dependencies | Supply chain; licence conflicts |
| Accuracy claims | A visitor treats a screening-grade result as operational |

---

## Checklist

### Secrets

- [ ] Credentials only in environment variables; `.env` gitignored; `.env.example` has names, not values
- [ ] Secrets never logged (pino redaction for auth headers and credential fields)
- [ ] Nothing secret in the web bundle (only `VITE_`-prefixed public values reach the client)

### Data terms

- [ ] Space-Track data and CDMs stay local: not in the repo, not in fixtures, not in the public API or demo
- [ ] Ingestion clients: per-source rate limit, disk cache, descriptive User-Agent with a contact address (from an env var, never hard-coded), backoff, stop on 403/404, honour `Retry-After`
- [ ] CelesTrak: each group fetched no more than once every 2 hours
- [ ] `docs/data-sources.md` updated: source, terms link, date last checked, what is and is not republished
- [ ] Attribution shown in the app for each source used

### API

- [ ] Every endpoint validates input with Zod; time windows and `limit` have maximums
- [ ] Rate limiting on public endpoints (`@fastify/rate-limit`)
- [ ] Errors use the shared shape and never leak stack traces or SQL
- [ ] CORS restricted to the web origin
- [ ] WebSocket and SSE: connection cap, message size cap, heartbeat and cleanup
- [ ] No endpoint triggers heavy computation per request beyond the stated budget (conjunctions are jobs, never requests)

### Privacy

- [ ] Public demo has no accounts; ground stations stay in the browser
- [ ] If login is added later: minimum data, a privacy notice (India's DPDP Act 2023 may apply)

### Assets and dependencies

- [ ] Textures and map data are public domain (NASA imagery, Natural Earth) or licensed, with credit
- [ ] No agency or company logos; a not-for-operational-use notice is shown
- [ ] New packages justified, pinned, licence checked, `pnpm audit` clean
- [ ] Telemetry dictionary is synthetic, not copied from a real operator

### Deploy

- [ ] CI workflows use least privilege (`contents: read` by default)
- [ ] Demo database backed up daily; seed script reproduces data without Space-Track

---

## Severity guide

| Severity | Example |
| --- | --- |
| High | A credential in git or the bundle; Space-Track or CDM data in the public demo; SQL injection |
| Medium | Unbounded time window or limit; ingestion client without rate limiting; missing attribution |
| Low | Missing CORS restriction in development; verbose error message |
| Info | Defence-in-depth ideas (CSP, SRI) |

---

## Review output

For each finding: **title and severity**, **where**, **impact**, **fix** (smallest safe change). End with blockers and follow-ups.
