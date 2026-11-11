# CRAFT_REVIEW.md: craft standard review

You are a **senior product engineer** (craft, data visualisation and design systems focus) reviewing Kaksha for **craft**: whether it feels finished and intentional, reads like a real operations console, and lets a new visitor answer three questions quickly.

Craft is not decoration. Looks come third in this project, after correctness and engineering practice. Craft here means a hiring engineer can find the proof (validation numbers, sources, limits) and a curious visitor can answer: **when does this satellite pass over my city, did it manoeuvre recently, and what is close to it?**

**Do not overengineer.** Use the tokens and the existing chart components before inventing anything.

---

## When to use this doc

- Any change under `apps/web`
- Charts, the globe, the map, the sky plot
- Copy, labels, tooltips, empty states
- Accessibility or motion work

Read [`../kaksha-spec.md`](../kaksha-spec.md) (design system section) and [`../AGENTS.md`](../AGENTS.md).

---

## Product craft

- [ ] Traces to a spec ID, or the gap was called out
- [ ] The three visitor questions are each reachable in two clicks from landing
- [ ] Every number shows its unit; every result shows source, epoch and model (footer or tooltip)
- [ ] The screening-grade notice is visible and plain, not hidden in a modal
- [ ] Known limits and data sources are linked from every view
- [ ] Copy is plain and specific; no hype (revolutionary, real-time AI, military-grade)
- [ ] No invented data: empty history says "not enough history yet", not a fake chart

---

## Data visualisation craft

- [ ] Axes labelled with units; time axes in UTC with the zone shown
- [ ] Detected events marked on trend charts, with confidence
- [ ] Ranges shown as ranges (decay), uncertainty as uncertainty (halo, band)
- [ ] Colour-blind-safe palette; status never shown by colour alone (shape, icon or label too)
- [ ] Linked brushing: a filter in one view updates all views
- [ ] Charts handle gaps in data without drawing a false line across them

---

## Visual craft

- [ ] Every colour is a token in `styles/tokens.css`; three.js colours read the same tokens
- [ ] One accent for the primary action and selection; warning and critical reserved for alarms and close approaches
- [ ] Numbers in tabular figures so columns align
- [ ] Orbit lines and ground tracks only for selected objects
- [ ] No logos of NASA, ESA, CelesTrak or companies; plain names and neutral icons

---

## Layout craft

- [ ] No overlap at 360, 768, 1024, 1440 and 1920 px wide
- [ ] Mobile shows at least the pass planner (spec WEB-10)
- [ ] Touch targets at least 44 px
- [ ] Nothing sized in `100vw`; no horizontal page scroll

---

## Motion craft

- [ ] Only `transform` and `opacity` animate in CSS; never `transition: all`
- [ ] Every animation has a reduced-motion path; time playback is never forced on
- [ ] The globe is still unless the visitor plays time or drags

---

## Accessibility craft

- [ ] Semantic elements; dialogs and panels labelled
- [ ] `:focus-visible` on every control
- [ ] Keyboard shortcuts for time control, documented in the UI
- [ ] Body contrast 4.5:1 or more, controls 3:1 or more
- [ ] Charts have a text or table alternative for the key values
- [ ] Describe accessibility as "aligned with" WCAG 2.2 AA; do not claim certification

---

## Anti-patterns

| Avoid | Why |
| --- | --- |
| A beautiful globe with no numbers | The analysis is the substance |
| Neon "hacker" styling, glowing everything | Reads as a toy, not a console |
| A bare total ("9,412 active satellites") | Every count needs its source, definition and time |
| A single reentry date | Decay is a range |
| Pc on a TLE-only conjunction | Invented precision |
| An ascent trajectory drawn as if real | Only if clearly labelled illustrative |
| Auto-playing time at high speed on load | Disorienting; breaks reduced motion |

---

## Review output

1. **Verdict**: ship / ship with nits / needs work.
2. **Craft wins**: what already meets the bar.
3. **Must-fix**: breaks honesty, accessibility or clarity.
4. **Nits**: optional polish.
5. **Spec gaps**: anything that needs a spec update first.
