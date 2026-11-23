# Market Terminal — Tool Atlas and Product Capability Map

**Status:** Working product specification for the Market Terminal project, November 2026.
**Operating goal:** Make a market-analysis workstation that improves the trader's full decision cycle, not a superficial imitation of another chart renderer.

The tool taxonomy below is informed by established professional charting categories, including TradingView's published guide to drawing tools: <https://www.tradingview.com/support/solutions/43000703396-drawing-tools-available-on-tradingview/>. It is **not** a claim that Market Terminal can use TradingView's proprietary charting library, feeds or licensed indicators.

## Truthful capability states

**Available** = implemented in this repository, subject to code and browser QA.
**In development** = designed but not fully implemented or accepted.
**Provider-dependent** = requires market data identity, entitlement, metadata, or infrastructure that does not yet exist.

| Family | Available now | In development / later |
| --- | --- | --- |
| Market interaction | Source-labelled synthetic demo instruments; opt-in Binance Spot BTC/USDT with native 1s candles and derived 5s/10s/15s/30s/45s; searchable interval picker, native minute/hour/day, candlestick/OHLC/line/area/Heikin-Ashi; one, two or four panes | Permissioned market catalog, venue-specific forex/equities/indices, robust WebSocket backfill and source verification |
| Trend geometry | Trendline, ray, extended line, horizontal line, horizontal ray, vertical line, cross line, three-point parallel channel, info line and three-point median pitchfork; edit handles and properties | Trend angle, regression channels, disjoint channels, alternate Schiff/inside pitchforks and scale-aware slope interpretation |
| Fibonacci | Fibonacci retracement, three-point trend extension, time zones and geometric circles; proportional Gann box (scale-dependent) | Gann fan, arc/wedge, trend-time and fixed square tools; no claim of statistical prediction |
| Geometric drawing | Rectangle, ellipse, triangle, directional arrow, freehand brush | Multi-corner polyline, arc, highlighter, rotated rectangle and accessible curve editing |
| Annotation | Time/price anchored text, callouts with user-classified supporting/challenging evidence, price notes, arrow markers; style/lock/hide/duplicate/group | Advanced callout layouts, overlap prevention and note templates |
| Measurement/position | Price/time ruler, info line, separate and combined date/price ranges (observed bars rather than assumed candles), and illustrative long/short position graphics | Broker-aware contract/tick/lot/pip-value position sizing, currency conversion, execution/fee assumptions and order simulation |
| Technical studies | SMA, EMA, RSI, MACD, ATR, Bollinger, presets; parameterized custom formulas | Curated studies in trend/momentum/volatility/volume families, source-aware study metadata, performance budgets |
| Replay and research | Historical replay, browser-local alerts, chart profiles, study templates; Decision Desk and Risk Planner intentionally hidden from navigation (legacy workspace data retained) | Strategy Lab with fees/slippage, deterministic backtesting, performance metrics, no-lookahead proofs |
| Workflow UX | Local workspace persistence and export/import, object inspector, resizable panel, appearance controls, Tool Atlas, a seven-family layered drawing rail, two-column searchable Tool Library, favorites, recent tools, and per-object Style / Coordinates / Visibility pop-up | Complete design-token system, keyboard shortcut editor, guided product tour, offline restore, multi-workspace naming |
| Intelligence / discovery | Four explicitly synthetic overview instruments | Reproducible screener, economic calendar, market-session overlaps, watchlists on licensed data, source-safe multi-market alerting |
| YoungMoney3 | **Not connected** | Optional scoped read-only history and execution markers; never use public preview to collect broker credentials |

## Creative, product-native opportunities

These are deliberate opportunities for Market Terminal to create human value beyond a conventional charting catalog. **Not a claim of implemented capability unless explicitly stated.**

### 1. Decision Desk — implemented historically, presently hidden from navigation
A low-friction observational precommitment: original thesis, evidence required, invalidation, source-qualified observed candle, and append-only review. The original text and candle remain visible and are not overwritten by later outcome knowledge.

**Test:** User can capture in under a minute without losing chart context or accessing future replay data. Requires real trader usability research before claiming improved decisions.

### 2. Evidence Counterweight — proposed
Optional side-by-side evidence *for* and *against* a current hypothesis, with contradiction notices tied to observable facts rather than a proprietary trade signal. Avoid AI mental-state guesses.

**Test:** Can traders record a disconfirming condition without adding distracting form burden?

### 3. Chart Context Capsule — proposed
An intentionally small transferable, versioned state: source, venue, symbol, timeframe, candle interval, chart layout, drawings, analysis and data-freshness confidence. Collaborators should know what data was actually seen, not merely receive a picture.

**Test:** Reproduces the same analytical context within data entitlements and avoids silently substituting synthetic data for real feeds.

### 4. Replay Integrity Monitor — proposed
When a backtest or replay is used, label which bar was visible, prevent future observations from entering generated metrics, and state slippage/fee model assumptions.

**Test:** Known synthetic reference datasets reproduce the expected outcomes and fail under intentionally injected future leakage.

### 5. Learning Loop — proposed
Group repeated *self-reported* strategy deviations and hypothesis invalidations separately from P/L. Do not claim to diagnose trader psychology or promise financial outcomes.

**Test:** Validate usefulness with trader observation, qualitative feedback and privacy/comprehension testing.

## Current drawing-library coverage

**37 source-aware drawing tool definitions are implemented, including trend angle, a candle-close regression channel and a translucent highlighter.** This covers the core line, basic Fibonacci, shapes, annotations, measurement and illustrative position families. The Tool Library exposes only implemented operations. Favorites are workspace-local and capped at 12 for usability, *not as a product paywall*. The application also has a standalone one-click horizontal **price level** action.

**TradingView's wider taxonomy is a roadmap reference, not a licensed feature entitlement**. Their published categories include trend and drawing geometry, Gann and Fibonacci constructions, pattern tools (including Elliott Wave and harmonic patterns), brushes/annotation/icons, forecasting/measurement, and additional chart controls. Some require multi-anchor interaction, projection semantics or exchange/volume metadata we do not yet have.

Before adding a new family, engineering must establish (a) a mathematically defined independent model, (b) exact input/selection/edit contracts, (c) import/export safety, (d) touch and keyboard QA, (e) source/provenance constraints and (f) performance at large drawing counts.

References: [TradingView drawing-tool directory](https://www.tradingview.com/support/solutions/43000703396-drawing-tools-available-on-tradingview/), [TradingView favorites](https://www.tradingview.com/support/solutions/43000662392-how-to-favorite-indicators-financials-drawing-tools-and-timeframes/), [TradingView's quick search behavior](https://www.tradingview.com/support/solutions/43000659671-quick-search-on-tradingview-find-anything-super-fast/).

## TradingView reference inventory — implementation honesty

The following categories are an **implementation backlog**, not an inventory of available controls. TradingView's proprietary Advanced Charts library and data/feed entitlements cannot be assumed to be free or included with our use of the open-source Lightweight Charts renderer.

| Professional charting family | Available in Market Terminal | Next candidates | Dependencies and reasons to defer |
| --- | --- | --- | --- |
| Lines and reference geometry | Trendline, ray, extended line, horizontal line/ray, vertical line, cross line, parallel channel, info line and median pitchfork | Trend angle, disjoint/flat channels, regression trend | Correct two-/three-anchor editing, pixel-slope disclosure and shape performance |
| Fibonacci and Gann | Retracement, three-point extension, time-zone, elliptical ratio circles and scale-dependent Gann box | Arcs, fan, spiral and fixed-scale Gann variants | Mathematically testable time/price coordinate models; Gann angles depend on chart scale |
| Geometric markup | Rectangle, ellipse, three-point triangle, arrow, freehand brush | Rotated box, arc, polyline, curved path, highlighter | Multi-point gestures, handles, snapping, hit-testing and keyboard/touch contracts |
| Annotations | Text note, anchored callout and price note, arrow marker, horizontal level | Richer anchored notes, overlap handling and reusable templates | Overlap prevention, accessibility, chart-privacy and export formats |
| Patterns | Manually anchored ABCD, XABCD and Elliott 0–5 impulse pivots; cyclic-line guides | Harmonic rule validation, additional Elliott corrections, head-and-shoulders | Multi-anchor schemas, non-predictive labeling, honest interpretation |
| Measurement and planning | Price/time ruler, price range, date range, illustrative long/short positions | Bar-pattern comparison, projections, source-aware risk/contract sizing | Broker contract specs, pip value, fee assumptions, no-lookahead replay validation |
| Data-dependent analysis | SMA, EMA, RSI, MACD, ATR, Bollinger, validated formula studies | Volume profile, anchored VWAP, footprint, breadth, multi-exchange comparison | Licensed volume/venue data, normalization and redistribution permission |
| Operational workflows | Tool Atlas, pinned favorites, contextual drawing properties and per-tool defaults, Chart Context Lens, replay and source labels | Strategy Lab, chart provenance capsule, evidence counterweight, user-defined shortcuts | Reliable data providers, accessible interactions, measurable decision quality |

### Differentiation beyond drawing quantity

1. **Source-qualified action:** The Chart Context Lens reports distance to the trader's own marked prices without asserting they are objectively valid support or resistance.
2. **No hidden market assumptions:** Date Range reports actual observed bars rather than assuming every minute across a weekend contains a tradable candle.
3. **Chart-first analysis:** Context Lens links source-qualified level distances, marked drawings and user-classified evidence. It no longer sends users to a separate decision journal.
4. **Fast recall:** A single Tool Library organizes verified chart tools, persistent favorites and recent actions without burying the chart under dozens of permanent icons.
5. **Financial realism:** Position illustrations never masquerade as executable broker orders or reliable P/L forecasts absent contract metadata.

**Release gates:** A tool is considered complete only after deterministic mathematics, source/storage safety, real pointer gestures, keyboard/mobile interaction, visual layout, regression, performance and user comprehension have been checked. Live-provider claims additionally require real-source interruption acceptance.

## Drawing interaction and settings acceptance

**Implementation branch:** `feat/layered-drawing-system-settings` (stacked PR #52). The target is a professional but independently designed chart experience, not use of TradingView's proprietary library.

- **Studio rail:** Cursor, Lines, Fibonacci/Gann, Patterns, Measurement, Shapes, Annotations, Markers; each opens only that relevant category in a layered, searchable library. Frequently used tools remain accessible as pinned favorites. The unmodified Classic layout is retained for regression compatibility.
- **Anchor discipline:** one click for markers and anchored notes; drag or two clicks for two-point instruments; explicitly staged three, four, five or six anchors for pitchforks, extensions, triangles and manually interpreted wave/pattern tools. The extra vertices are editable independently after creation, alongside moving the whole shape.
- **Per-object properties:** settings can be opened from the object tree or chart double-click. Style preview, line weight and pattern, opacity, applicable fills/midlines/labels, UTC/time and price coordinates, per-timeframe visibility, hiding and locking. Applying a change creates a single undoable history entry.
- **Source and data safety:** a drawing remains bound to its original symbol and price-data source. The importer validates all coordinates and anchor counts. Date range counts **observed** candles; it does not interpolate across holidays.
- **Forecast disclaimers:** Gann grids/circle ratios are derived from pixel/price/time coordinate geometry and change visually with scale; manual ABCD/XABCD/Elliott anchor labels are **not** automatically identified market patterns, harmonic signal validation or execution advice.
- **Research original:** a user can classify a callout as supporting/challenging/unclassified evidence for their own thesis. Chart Context Lens counts both, optionally suggesting what disconfirming facts might still be needed, **without an AI verdict or performance claims**. These classifications are observations made by the trader, not verified truth.
- **Unimplemented references:** additional named TradingView tools live in the app's descriptive research backlog, not as clickable mock tools. Volume/footprint-dependent tools require real volume licensing and mathematically sound provider inputs.

**Release tests:** unit math/schema tests, actual mouse/touch gestures, pattern vertex correctness, popup save/undo/reload, mobile category access, visual viewport QA and source provenance. A passing build alone is not sufficient. Product-performance and user-comprehension tests with traders remain separate from automated code acceptance.

## Responsible sequence

1. **Prove data trust.** Finish PR #48 exchange backfill acceptance; real-provider reconnect testing; stale/disconnect behavior; quote and calendar metadata.
2. **Prove chart interaction.** Physical mobile/desktop gesture acceptance; layout persistence; large drawing performance, graphically accurate anchors and undo/redo.
3. **Consolidate chart-first UX.** PR #53 hides the old journal/planner pages without deleting their data, provides seconds intervals, tool-specific settings and independent defaults.
4. **Expand technical catalog** through reusable geometry and study registries, each with deterministic math tests and UI interaction acceptance.
5. **Build intelligence** only against verified provider entitlements, historical completeness and terms.
6. **Build simulation/research**, then opt-in read-only account integration and secure distribution only when permissions are proven.

## Chart-first independent tool controls (PR #53)

**State:** Implemented on the review branch with automated tests; not a claim of full TradingView Supercharts parity or of licensed market feeds.

- **Purposeful category navigation:** Seconds and standard timeframe groups are searchable and compact; chart tools are grouped by analytical role.
- **Seconds integrity:** 1s, 5s, 10s, 15s, 30s and 45s. Binance Spot BTCUSDT requests provider-native 1-second klines, and derived periods use only *observed* base candles. Empty/missing exchange seconds are not invented. Local synthetic instrument candles are clearly labelled synthetic. Seconds charts are not tick charts.
- **Independent per-object settings:** Fibonacci retracement/extension/circles support individually toggled, colored, editable ratios and label modes; pitchfork permits multiple offset rails; Gann box has variable geometric subdivisions; trendline/extended-line/ray/info-line support segment/right/left/both projections; price/time measurements select their own quantities; notes adjust typography; arrow markers change direction; channels expose middle rails and illustrated positions retain independent entry/stop/target coordinates. Price-level references have their own exact-price, color, line pattern/weight, axis-label, and timeframe visibility properties.
- **Per-tool defaults:** Users can save or reset a style/analytical preset for each drawing type. A new drawing uses the matching saved preset without copying prior chart coordinates, IDs, market symbol or data provider. Presets are validated on import; local workspace persistence is non-destructive.
- **Temporary navigation de-scope:** Standalone Decision Desk and Risk Planner are not visible. Old workspace records are preserved, which also protects backwards-compatible imports.
- **QA:** Unit reference calculations, geometry, safe parsing, actual browser pointer gestures, frames/popup state, persistence across reload, mobile width and keyboard accessibility. Real provider network/market disconnections and user comprehension require separate field acceptance.

## Tool implementation acceptance contract

- The action works, not merely a visible menu item.
- The chart still supports pan/zoom, selection and undo/redo after activating the action.
- Source, exchange/venue, delay, staleness and simulation labels are truthful.
- Numerical tools have reference calculations, edge-case tests and instrument-specific validity checks.
- Pointer/touch/keyboard operation, visible focus, button status and error recovery are verified.
- The tool does not require a forced account or introduce an arbitrary paid cap on local analysis.
- A feature is marked available only after unit/build, browser and appropriate real-source/manual acceptance; UI previews may remain experimental.
