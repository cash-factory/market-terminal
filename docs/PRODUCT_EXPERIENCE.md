# Market Terminal — Product Experience Standards

## Product promise

Market Terminal is a **complete trading workspace**, not merely a chart renderer. Its experience must be as carefully engineered as its indicator and market-data engines. No artificial product limits on core analysis features; provide graceful performance management instead.

## Core destinations

1. **Home / Market overview** — session status, recently used workspaces, favourite markets, market freshness, quick launch.
2. **Terminal** — distraction-free multi-chart analysis with contextual tool controls, resizable/collapsible areas, search, watchlists, alerts.
3. **Analysis library** — drawing presets, technical indicators, templates and saved studies.
4. **Replay & Strategy Lab** — explicit simulation states, playback controls, fees/slippage, test results, accessible chart annotations.
5. **Market discovery** — instrument search, sorting, watchlists, metadata, provider attribution.
6. **Notifications & activity** — alert status, undo actions, background progress, recoverable errors.
7. **Settings & customization** — curated dark/light themes, editable color tokens, keyboard shortcuts, workspace and backup controls.
8. **Optional YoungMoney3 bridge** — separate, read-only, permission-based access to journal/trade overlays.

## UI standards

- Professional, distinctive, intentionally designed; avoid gratuitous gradients, clutter, oversized cards, and copy-heavy screens.
- Establish a consistent type scale, spacing system, color semantics, icon sizing, control density, and design tokens.
- Build desktop-first for intensive market analysis; intentionally adapt workflows on tablets/mobile.
- Keep charting as a primary workspace, not the entire application navigation.
- Reveal detailed explanations contextually (tooltips, expandable help, first-use guidance) rather than permanently filling screens with text.
- Provide user-adjustable panel sizes and preserve those sizes in local workspace state.
- Prefer reduced-motion-friendly transitions: feedback should inform rather than distract.
- Support light, dark and user-defined palettes; maintain contrast in all states and ensure bullish/bearish candles remain distinguishable.
- Provide navigable onboarding that is optional, skippable, and available again from Help.

## Interaction contract

Every action has an explicit feedback state: idle → pending → success or error, with retry or undo where meaningful. No silent buttons. Cursor and keyboard interaction must be consistent.

Drawing tools must support:
- Selection, edit handles, dragging, snapping, locking, visibility, delete, undo/redo, and keyboard shortcuts.
- Direct chart manipulation without opening unnecessary modal dialogs.
- Unlimited object counts as a product policy, with viewport culling and non-blocking performance warnings rather than paywalls.
- Durable workspace export/import with schema versioning.

Every data-dependent component must visibly identify when information is demo, live, delayed, stale, or offline; no simulated price should masquerade as live.

## Quality gates

- Automated tests cover keyboard accessibility, tool feedback, persistence and chart interaction math as features are developed.
- Test at compact laptop, desktop, tablet and phone viewport sizes.
- Check hover, active, disabled, loading, success, empty, error and disconnected states.
- Verify reduced-motion and focus visibility.
- Optimize workspaces with many objects using offscreen work, virtualization and progressive rendering.
- Validate real user workflows: find instrument → open chart → draw → save → reload → export; and open market overview → select saved workspace.

## Delivery sequencing

**Foundation UX** (now): app shell/navigation, spacing/type/theme tokens, responsive and keyboard-accessible controls, toasts/status feedback.

**Chart UX** (next): contextual drawing tool palette, selection handles, drag interactions, compact properties editor, history, autosave and export.

**Platform UX** (later): market overview, discovery, alert center, strategy lab, accounts and onboarding.

New functional features must ship with usability states and accessibility support. UX is not a separate final polish phase.
