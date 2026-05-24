# spanda UI Kit

A high-fidelity recreation of the spanda product surfaces, dressed in the **Wise-inspired** visual system from this design system (lime-green CTA, sage canvas, 24 px pill geometry, Manrope 900 display).

**Note:** this kit overrides the existing earth-tone palette in the source codebase (`aravinthkumarpk/spanda`) on purpose. It is a *design-system mockup*, not a drop-in skin for the live app.

## Files

| File | What it is |
|---|---|
| `index.html` | Interactive click-thru prototype. Loads all components below. |
| `App.jsx` | Top-level shell, manages active view + open modals. |
| `AppHeader.jsx` | Logo, version pill, repo selector, search, view tabs, Add button. |
| `Primitives.jsx` | Badge, Pill, IconBtn, PriorityChip, AgentChip, shared atoms. |
| `QueuesView.jsx` | Default queue table, filters + bulk-editable rows. |
| `OverviewView.jsx` | Kanban by workflow state across the whole portfolio. |
| `SetlistView.jsx` | Wave-grid execution plan (the Gantt-style canvas). |
| `BeatDetail.jsx` | Lightbox showing one beat's full metadata. |
| `TakeABeatCard.jsx` | The primary input widget on the hero (Wise's currency-converter equivalent). |
| `TerminalPanel.jsx` | Docked bottom panel streaming live agent output. |

## Surfaces covered

The kit renders interactive versions of the four most-used screens from the spanda product:

1. **Queues** (default), list of ready beats, filterable, with the **Take!** CTA per row.
2. **Setlist**, the wave-and-step execution plan, with selectable beats per wave column.
3. **Overview**, portfolio kanban with one column per workflow state.
4. **Beat detail**, lightbox with description, dependencies, handoff capsules, and the agent dispatch panel.

Plus the persistent chrome (header, search, terminal panel) on every view.

## What's deliberately minimal

This is a cosmetic recreation. The kit:

- ✅ Reproduces the visual and interaction language.
- ✅ Wires fake state so you can switch views, click rows, open the beat detail.
- ❌ Does not implement real agent dispatch, lease lifecycle, or any backend logic.
- ❌ Does not implement Active / Escalations / ReTakes / History / Diagnostics (the visual primitives generalize, extend `QueuesView` with a state filter to cover Active and ReTakes).

## What to read in the source repo for canonical implementations

| Surface in this kit | Canonical source file |
|---|---|
| `AppHeader` | `src/components/app-header.tsx`, `app-header-parts.tsx` |
| `QueuesView` row | `src/components/beat-column-defs.tsx`, `beat-row-ship-correction.test.ts` |
| `SetlistView` | `src/components/setlist-view.tsx` |
| `OverviewView` | `src/components/beat-state-overview-matrix.tsx`, `beat-overview-tile.tsx` |
| `BeatDetail` | `src/components/beat-detail.tsx`, `beat-detail-lightbox.tsx` |
| `TerminalPanel` | `src/components/terminal-panel.tsx` |
