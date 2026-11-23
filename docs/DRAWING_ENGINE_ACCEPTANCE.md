# Drawing Engine & Chart Interaction — acceptance contract

This document applies to the next Peak analyst workstation milestone. It is
**not** a blanket declaration that every chart interaction is production-ready.
The public GitHub Pages build is a review surface, not a private data service.

## Non-negotiable interaction behavior

1. **Stable coordinates.** Every drawing uses timestamp/price anchors, not
   persistent pointer pixels. Dragging whole objects shifts all points,
   controls and targets by the same visual delta at the current chart scale.
   Editing one pivot must not silently move the others.
2. **Atomic changes.** Invalid times, negative/nonfinite prices, unprojectable
   control points and locked group members reject the entire edit. No partial
   saved objects and no phantom Undo history.
3. **Group semantics.** A whole-object drag transforms every member at once;
   group geometry stays visually aligned across market closures and
   compressed time axes. Endpoint edits affect one selected member only.
4. **Precise snapping.** The OHLC magnet chooses actual on-screen candle points
   within a pixel tolerance, with no synthetic fills or cross-source matches.
   Magnets do not warp an entire object during drag.
5. **Reversible work.** Create, edit, group, delete and style changes are
   deterministic and recoverable through Undo/Redo; successful edits persist
   across reload and versioned workspace export/import.
6. **Predictable input.** Chart selection, pointer handles, right-click
   properties, Escape to cancel, Delete to remove, and keyboard Undo are
   coordinated at the workspace level even with four chart panes. Input
   fields and modal editors retain their own keyboard behavior.
7. **Responsiveness.** Ordinary crosshair motion does not trigger wholesale
   drawing-overlay rerenders if chart projection is unchanged; panning,
   zooming, price scaling and resize must still update projected drawings.

## Automated evidence in the repository

| Scenario | Coverage | Source |
| --- | --- | --- |
| Tool placement and persistence for all implemented families | Playwright Chromium | `e2e/all-drawing-lifecycles.spec.ts` |
| Individual tool edit, anchors, Undo/Redo, reload | Playwright representative family matrix | `e2e/drawing-handle-acceptance.spec.ts` |
| Screen-space translation across time gaps; invalid projected anchors | Vitest | `src/drawing/interactions.test.ts` |
| Atomic grouped edits; locked members; market identity | Vitest | `src/drawing/manage.test.ts` |
| Nearest on-screen OHLC magnetic snap | Vitest | `src/drawing/snap.test.ts` |
| Pointer dragging, group movement, four-pane Delete | Playwright | `e2e/drawing-interaction-integrity.spec.ts` |
| Existing drawing settings, timeframes, chart layouts, import and touch emulation | Existing Vitest / Playwright | `e2e/`, `src/drawing/` |

Passing CI does **not** certify every interaction on a physical phone or across
all browser/OS input drivers.

## Manual release acceptance — must be recorded before claiming full completion

- [ ] Windows mouse and keyboard: create/edit/drag, lock and group on 1s, 5s,
  1h and 1d; test crosshair vs drawing mode, right-click properties, keyboard
  focus and deliberate Escape cancellation.
- [ ] Physically test iOS Safari and Android Chrome: touch dragging, two-tap
  multi-anchor placement, accidental page-scroll prevention, orientation,
  safe-area padding, long-press context actions and accessibility focus.
- [ ] Test macOS Safari trackpad pan, zoom and drawing selection.
- [ ] Open **four different source-qualified panes**, move grouped drawings,
  change linking modes and validate no source, symbol or timeframe leakage.
- [ ] Reload/export/import a workspace containing **at least 1,000** mixed
  drawings and a large highlighter stroke without losing controls or labels.
- [ ] Measure four-pane responsiveness and memory with **100,000+** observed
  candles where the data contract permits. Record latency, hardware, frame
  and source; do not fabricate performance measurements.
- [ ] Verify no future drawing anchors or study outcomes leak through
  historical replay, including after moving and importing drawings.
- [ ] Run keyboard-only and screen-reader focus checks on tool shelf,
  inspector, dialogs and data source warnings.

**Definition of done:** all applicable automated suites green, manual cases
verified on real devices, no data-loss interaction failures, and no unsupported
claims of source validity, execution quality or TradingView feature parity.
Until those checks are recorded, call this a hardening increment rather than
the fully accepted milestone.
