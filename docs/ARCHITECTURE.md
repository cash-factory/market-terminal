# Peak technical-analysis workspace — architecture

## Product boundary
Private, local-first technical-analysis and structured market-study workstation for a small group. Not a broker, trade execution client, order router, portfolio accounting system or proprietary TradingView Supercharts implementation. The `lightweight-charts` library renders charts; Peak independently owns interaction, drawing, replay, storage and calculation semantics.

The GitHub Pages preview is **public** and is not private multi-user hosting. Local browser workspaces are not synchronized or backed up unless exported. Do not store credentials or private trading records in source code or publicly deployed assets.

## Implemented services and responsibilities

| Area | Code | Responsibility |
| --- | --- | --- |
| Peak Client Workspace | `src/App.tsx`, `src/charts/`, `src/ChartCanvas.tsx` | Page orchestration, chart layouts, keyboard controls, focus state, responsive workstation |
| Peak Drawing Engine | `src/drawing/`, `src/levels/` | Semantic price/time anchors, tool operations, rendering overlays, object editing/grouping/layers, tool-specific properties, favorites, undo/redo |
| Peak Workspace Service (local) | `src/workspace.ts`, `src/watchlist/` | Validated versioned JSON persistence, prior-schema compatibility, chart preferences, instrument/favorite order, saved research, export/import |
| Peak Core Domain | `src/market.ts`, `src/data/`, `src/analysis/`, `src/replay/` | OHLC candle contracts, source identity, valid timeframes, hypothetical sizing and causal historical scenario evaluation |
| Supporting context | `src/alerts/`, `src/commands/`, `src/indicators/`, `src/context/` | In-tab alerts, navigable command catalog, basic technical studies and contextual inspection |

Use the functional specification in [PEAK_ANALYST_WORKSPACE.md](PEAK_ANALYST_WORKSPACE.md) and tool inventory in [TOOL_ATLAS.md](TOOL_ATLAS.md).

## Immutable invariants
- Every drawing and scenario is identified by source, instrument, frame or coordinate semantics as appropriate; avoid drifting pixel-only geometry.
- A replay uses a frozen historical snapshot, never a joined live stream; simulations may examine only candles at or before the visible cursor. Scenario entry is at the first **subsequent** bar opening. Ambiguity and unsupported gap behavior are explicitly disclosed.
- No fabricated provider prices or volumes are allowed. EURUSD/AAPL/US100 and default BTCUSDT are synthetic; BTCUSDT has an opt-in direct Binance Spot feed, not executable broker quotes.
- Instruments without a supported price source cannot be added to a supposedly live watchlist. True volume drawing tools require reliable source and volume-unit metadata; synthetic volume cannot substitute for observations.
- Object edits and drawing operations should be undoable; import/export should preserve old work and validate untrusted JSON.
- Brokerage-specific lot sizes, leverage, tick values, currency conversion and costs are **user assumptions** unless independently sourced. Risk figures are illustrative.

## Planned boundaries
1. **Reliability:** centralize command history beyond drawings; test focus, pointer hit testing, keyboard reversal, multi-anchor manipulations, cross-chart coordination, autosave failures and export/restore.
2. **Research depth:** replay checkpoints, tagged assumptions, deterministic dataset provenance and study comparisons without lookahead.
3. **Data:** pluggable historical provider registry, exchange-session calendars, timestamp/volume normalization, missing bar status, offline caching and data licenses.
4. **Tool richness:** genuinely interactive Gann/Fib family expansion, volume profile and anchored VWAP after volume support, pattern and cycle geometry, shape/annotation presentation, drawing presets and object manager accessibility.
5. **Small-group identity (optional):** only if cross-device sync becomes necessary, add narrow authentication, encrypted storage, isolation and conflict-safe versioning. Do not overbuild brokerage/accounting integration.

## Verification and release
- On each PR run `npm test` and `npm run build`, plus Playwright full Chromium interaction and multi-engine/touch smoke suites.
- Verify UI manually in dark/light, mobile/desktop, on chart pan/zoom and extreme price/time ranges; inspect accessible keyboard and focus behavior.
- Recheck data provenance, user isolation (when identities exist), candle completeness and replay no-lookahead before expanding functionality.
- Do not merge to public `main` or assume GitHub Pages deployment without approval and review of CI and release implications.
