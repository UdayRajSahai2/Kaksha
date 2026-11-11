# Backlog

Ideas parked to protect the milestone order (scope creep is a named risk in [`kaksha-spec.md`](kaksha-spec.md)). Add a line here instead of building it. Promote an item only by giving it a spec ID.

- Workbench state is local React state; move it into the Zustand store (WEB-01) when a second view needs the same time or selection.
- The workbench bundles the 150 KB verification fixtures; split them into a lazily loaded chunk if first render approaches the 3 s budget.
- The Hallmark render sweep ran in light mode only (the OS default in headless Chrome); add a dark-mode pass when the globe lands.
