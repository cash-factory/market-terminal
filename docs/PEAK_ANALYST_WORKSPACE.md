# Peak — private technical analyst workspace

## Outcome contract
Serve a private group of fewer than 10 analysts with reliable charting, watchlists, drawing object management, reversible actions and historically disciplined simulation. Accounts, if later added, should store preferences, favorites, templates and sessions rather than enable trade execution. This repository remains browser-local without hosted login.

## Architecture decisions
- **Peak Client Workspace:** React + Lightweight Charts 5. The library provides chart rendering and plugin primitives, **not** TradingView's proprietary Supercharts feature set. Drawing state is our domain model.
- **Workspace Service (local):** validated, versioned browser JSON; watchlist order, favorite instruments, chart configurations, drawings, sizing assumptions and archived simulation results. Import supports older schemas. Clear browser storage will clear local work without a backup.
- **Drawing Engine:** own time/price anchors, multi-point gestures, layer hierarchy, groups, undo/redo, visibility and tool-specific settings; stable chart coordinates independent of mouse pixels. Future drawing families should be shipped only after pointer editing, export/import and tests exist.
- **Replay & Laboratory:** frozen data snapshot; entry occurs at the next observed candle open after the decision; one scenario at a time; stops/targets evaluated only on revealed bars. Same-bar ambiguity uses stop-first. Open gaps are priced at bar open. Invalid opening gaps that cross the stop are explicitly marked invalid. The model intentionally omits spread, slippage, fees, FX conversion, tick/lot rules and liquidity; saved results are hypothetical.
- **Position sizing:** standalone calculator reuses the existing independent risk model. A more advanced configurable model is already available in long/short drawing settings. No broker connectivity is implied.
- **Market feeds:** demo symbols are synthetic. Only BTC/USDT has an opt-in direct Binance Spot feed; no entitlement to commercial redistribution or other asset-class live data is asserted.

## Interaction contract
1. A watchlist item can be added, removed, favorited or reordered; favorites appear above unpinned items and all changes persist locally.
2. From a chart, start replay. Arrow-left/right steps one observed candle backward/forward; Space toggles playback outside inputs. Controls provide equivalent buttons. Seeking backward recalculates the current scenario from known bars only.
3. Place hypothetical stop/target around the last observed close and set equity, risk percentage and value per price unit. Arm at known candle close. The next candle determines opening fill, then bars determine a disclosed, hypothetical outcome.
4. Archive a completed scenario to the workspace. Use Workspace → Saved replay studies for inspection or removal; export JSON to back it up.
5. Open Position sizing independently to compute risk-based theoretical units from hypothetical equity, entry, stop, target and unit multiplier.

## Drawing families and next work
Existing tool families have implemented lines, channels, price/time measurement, Fibonacci retracement/extension/time/circles, Gann box, some manual harmonic/Elliott patterns, shapes, annotations and long/short positions. The backlog includes Gann fans/squares, broader Fibonacci tools, volume profile, anchored VWAP, projection studies, complex pattern geometry and additional presentation tools. These require real independent renderers, input/anchor handling, settings, accessible inspector controls and regression tests. Listing them is not claiming they are implemented.

**Priority:** stabilize drawing invariants (hit testing, multi-anchor modification, scale transforms, no-lookahead overlays, performance), deepen historical replay, add genuinely sourced OHLCV/volume pipelines, then expand expensive drawing families. Profile and time/cycle geometry should be source- and timeframe-aware rather than cosmetically simulated.

## Review gates
- Automated: `npm test`, `npm run build`, targeted Playwright chart/replay/watchlist flows.
- Manual: verify mobile panel ergonomics, keyboard focus order, draw/edit/undo and export/import, source disclosure, and replay behavior across seconds and daily bars.
- Public GitHub Pages remains public if merged to main; there is **no private-account boundary**. Add actual auth/hosting only if group data must synchronize between devices.
