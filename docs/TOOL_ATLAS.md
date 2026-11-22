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
| Market interaction | Synthetic demo instruments; opt-in direct Binance Spot BTC/USDT; instrument search; timeframes; candlestick/OHLC/line/area/Heikin-Ashi; linked/independent one, two or four panes | Permissioned market catalog, venue-specific forex/equities/indices, robust WebSocket backfill and source verification |
| Trend geometry | Trendline, ray, extended line, horizontal line, horizontal ray, vertical line, cross line, three-point parallel channel, editable anchors | Extended/horizontal/vertical rays, median pitchforks, regression channels and other variants with mathematically tested anchors |
| Fibonacci | Basic Fibonacci drawing | Extension, time zones, arcs and multi-anchor tools; avoid implying predictive accuracy |
| Geometric drawing | Rectangle, ellipse, directional arrow, freehand brush | Polygon, path, arc, highlighter, editable multi-point drawing and accessible editing |
| Annotation | Time/price anchored text; style/lock/hide/duplicate/group | Callouts, price flags, structured scenario annotation |
| Measurement/position | Price/time measurement, separate date and price ranges (observed bars, not assumed market-open bars), and *illustrative* long/short position target graphics | Broker-aware contract/tick/lot/pip-value position sizing, currency conversion, execution/fee assumptions and order simulation |
| Technical studies | SMA, EMA, RSI, MACD, ATR, Bollinger, presets; parameterized custom formulas | Curated studies in trend/momentum/volatility/volume families, source-aware study metadata, performance budgets |
| Replay and research | Historical replay, browser-local alerts, chart profiles, study templates, Decision Desk | Strategy Lab with fees/slippage, deterministic backtesting, performance metrics, no-lookahead proofs |
| Workflow UX | Local workspace persistence and export/import, object inspector, resizable panel, dark/light, three accents, Tool Atlas commands, category-based Tool Library with searchable implemented tools, per-user pinned favorites and recent tools | Complete design-token system, keyboard shortcut editor, guided product tour, offline restore, multi-workspace naming |
| Intelligence / discovery | Four explicitly synthetic overview instruments | Reproducible screener, economic calendar, market-session overlaps, watchlists on licensed data, source-safe multi-market alerting |
| YoungMoney3 | **Not connected** | Optional scoped read-only history and execution markers; never use public preview to collect broker credentials |

## Creative, product-native opportunities

These are deliberate opportunities for Market Terminal to create human value beyond a conventional charting catalog. **Not a claim of implemented capability unless explicitly stated.**

### 1. Decision Desk — available in the current feature PR
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

**19 usable drawing tools are registered in the catalog.** This covers the core line, basic Fibonacci, shapes, annotations, measurement and illustrative position families. The Tool Library exposes only implemented operations. Favorites are workspace-local and capped at 12 for usability, *not as a product paywall*. The application also has a standalone one-click horizontal **price level** action.

**TradingView's wider taxonomy is a roadmap reference, not a licensed feature entitlement**. Their published categories include trend and drawing geometry, Gann and Fibonacci constructions, pattern tools (including Elliott Wave and harmonic patterns), brushes/annotation/icons, forecasting/measurement, and additional chart controls. Some require multi-anchor interaction, projection semantics or exchange/volume metadata we do not yet have.

Before adding a new family, engineering must establish (a) a mathematically defined independent model, (b) exact input/selection/edit contracts, (c) import/export safety, (d) touch and keyboard QA, (e) source/provenance constraints and (f) performance at large drawing counts.

References: [TradingView drawing-tool directory](https://www.tradingview.com/support/solutions/43000703396-drawing-tools-available-on-tradingview/), [TradingView favorites](https://www.tradingview.com/support/solutions/43000662392-how-to-favorite-indicators-financials-drawing-tools-and-timeframes/), [TradingView's quick search behavior](https://www.tradingview.com/support/solutions/43000659671-quick-search-on-tradingview-find-anything-super-fast/).

## Responsible sequence

1. **Prove data trust.** Finish PR #48 exchange backfill acceptance; real-provider reconnect testing; stale/disconnect behavior; quote and calendar metadata.
2. **Prove chart interaction.** Physical mobile/desktop gesture acceptance; layout persistence; large drawing performance, graphically accurate anchors and undo/redo.
3. **Ship discoverability and reflection.** PR #50 Tool Atlas + Decision Desk with strict, source-aware workspace semantics and E2E acceptance.
4. **Expand technical catalog** through reusable geometry and study registries, each with deterministic math tests and UI interaction acceptance.
5. **Build intelligence** only against verified provider entitlements, historical completeness and terms.
6. **Build simulation/research**, then opt-in read-only account integration and secure distribution only when permissions are proven.

## Tool implementation acceptance contract

- The action works, not merely a visible menu item.
- The chart still supports pan/zoom, selection and undo/redo after activating the action.
- Source, exchange/venue, delay, staleness and simulation labels are truthful.
- Numerical tools have reference calculations, edge-case tests and instrument-specific validity checks.
- Pointer/touch/keyboard operation, visible focus, button status and error recovery are verified.
- The tool does not require a forced account or introduce an arbitrary paid cap on local analysis.
- A feature is marked available only after unit/build, browser and appropriate real-source/manual acceptance; UI previews may remain experimental.
