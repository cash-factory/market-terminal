# Market Terminal — Sequential Delivery Program

> Product rule: implement broad functionality without arbitrary feature-count caps.
> Engineering rule: finish a phase's functional acceptance gates, then progress to the next phase.
> A passing build is necessary but not sufficient: verify browser operation before calling a phase complete.

## Phase 1 — Advanced charting (CURRENT)

**Already delivered:** live/synthetic source distinction, basic price levels, trendlines,
rectangles, Fibonacci, drag/click creation, undo/redo, object lock/hide/duplicate, local
persistence, replay, EMA, Bollinger, RSI, MACD, ATR.

**Advanced charting milestones:**
- [x] OHLC magnet, ray and price-measure drawings (#20)
- [x] Independent two-chart layout, saved comparison instrument (#21)
- [x] Built-in indicator presets and custom saved chart templates (#23)
- [x] Configurable study parameters with valid numeric bounds (#24)
- [x] Saved one/two/four chart layouts and independently selected comparison symbols (#25)
- [x] Drawing anchor interpolation across actual observed bars and trading gaps (#26)
- [x] Advanced arrows, ellipses, freehand brush, notes and illustrative long/short position graphics (#27)
- [x] Multi-select, grouping, layered object ordering and style controls with keyboard deletion (#28)
- [x] Per-pane timeframes and supported source selection; optional linked crosshairs and time windows (#29)
- [x] Candlesticks, OHLC bars, close line/area and derived Heikin-Ashi views (#30)
- [x] Three-anchor parallel-channel drawing with editable third control (#31)
- [x] Constrained no-eval user-defined indicator formulas and saved overlays (#32)
- [ ] Complete longer multi-point drawing library: shapes, brush editing and
      adjustable broker-aware position targets (2R illustration is not trading risk sizing)
- [ ] Venue-specific exchange calendars, source tick precision, session-aware
      anchors and fully validated OHLC snapping across live-history transitions
- [ ] Chart-profile templates covering every pane's frame, source, symbol, style
      and optional linking; compare overlays and layout presets
- [ ] Broader curated built-in indicators and safe formula-performance budgets
      for unusually large workspaces; prevent pathological resource consumption
- [ ] Touch/keyboard/accessibility QA, Safari and Firefox regression,
      actual mobile device acceptance and large-workspace benchmarks
- [ ] Recoverable chart-error states, benchmark baselines and performance
      regressions across all chart layout modes

**Exit:** confirmed desktop/mobile chart workflows, accurate chart-time alignment,
reliable save/restore, multiple charts with distinct source provenance, real browser
regression tests, and no arbitrary counts on core tools.

## Phase 2 — Market intelligence and connections

Prerequisite: chart data contracts and source labels from Phase 1.

- [ ] Provider discovery/catalog: explicit asset classes, exchange/venue, symbol,
      tick/lot/contract metadata, source timezone and trading calendar
- [ ] Licensed or permitted historical/live access for crypto, forex, equities and indices,
      with delay/licensing/restriction disclosures; never relabel synthetic fixtures as live
- [ ] WebSocket reconnect/backfill, server clock/staleness detection, historical gap repair,
      provider rate limits and failover with explicit provenance
- [ ] Market screener with reproducible filters, sorting and watchlist workflows
- [ ] Economic calendar, market-hours calendar, trading sessions and DST-aware overlaps
- [ ] Multi-symbol price alerts; server delivery only once authenticated backend and
      notification mechanisms exist
- [ ] Verify provider entitlements and redistribution rights before public resale/hosting

**Exit:** each supported market has an identified, verifiable data provider, source status,
valid calendars, reproducible search and alert/screener workflows.

## Phase 3 — Trading tools and research

Prerequisite: historical data provenance, instrument specs, reliable chart controls.

- [ ] Portfolio simulation / paper trading with order lifecycle and fill/fee/slippage assumptions
- [ ] Position sizing with tick/lot/contract values, quote/account currency conversions
- [ ] Strategy replay with simulated entry/stop/target and no look-ahead information
- [ ] Backtesting engine, event/equity curve, drawdown, trade statistics and reproducible seeds
- [ ] Strategy Lab with comparison, export, risk analysis and versioned result provenance
- [ ] Explicitly distinguish simulation from connected broker account or executable quote

**Exit:** deterministic tests on reference datasets; proven absence of future-data leakage,
repeatable performance results, realistic and documented execution assumptions.

## Phase 4 — Workstation product experience

Prerequisite: stable core workflows.

- [ ] Multiple named workspace profiles with layout persistence, backup and version migrations
- [ ] Designed theme system, icon/spacing consistency, adjustable panel sizes, reduced-motion support
- [ ] Desktop/tablet/touch accessibility testing, keyboard command palette and context actions
- [ ] Skippable, revisitable product tour and feature-aware tooltips
- [ ] In-app notifications with actionable statuses and recoverability
- [ ] Optional encrypted/authenticated sync with explicit user control, not mandatory for local use
- [ ] Browser performance/security testing and safe crash recovery

**Exit:** coherent workflows across devices, successful keyboard/touch and usability tests,
clear action outcomes and recoverable workspace data.

## Phase 5 — YoungMoney3 integration, desktop distribution, beta

Prerequisite: provider identity, risk model and secure permissions.

- [ ] Optional **read-only** account linking and explicit revocable scopes
- [ ] Broker trade execution markers, account timezone, stop/target provenance and journaling overlays
- [ ] Prevent broker credentials, trading controls or private account data from reaching an
      untrusted static preview; audit linkage and access
- [ ] Versioned Windows desktop packaging, update/signing strategy and release artefacts
- [ ] Beta hardening, CI/security review, documentation, upgrade and migration strategy

**Exit:** opt-in integration with audited privacy boundaries, installable reproducible
desktop builds, testable recovery paths and a usable beta release.

## Build and release gates

Each milestone follows: isolated feature branch → unit tests → production build →
Chromium E2E chart/interaction tests → PR review → merge → GitHub Pages deployment →
user-facing acceptance in the preview.

The GitHub Pages preview is a public demonstration surface. Do not upload passwords,
investor credentials, paid market feeds or private user trade records. Local workspaces
are browser-scoped and should be exported before clearing the browser.

The program is intentionally modular. "No arbitrary limits" does not imply infinite
RAM/storage, free exchange licensing or unrestricted upstream APIs. Unsupported
providers and services must show an honest unavailable state rather than simulated
production data.
