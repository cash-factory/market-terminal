# Market Terminal

A **local-first market analysis and decision research workstation**, built with React, TypeScript and [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts) (Apache 2.0). Market Terminal is independent of YoungMoney3. No broker execution or account connection is enabled in this repository.

## Available workflows

- **Chart Studio:** one-, two- and four-pane charts, independent frames/sources, chart types, indicators, saved profiles, drawing and direct manipulation.
- **Drawing tools:** 37 implemented tools, grouped into trend/channels, Fibonacci/Gann, manually anchored patterns, measurement, shapes, annotations and markers. Notable additions: real three-to-six-point drawing gestures, median pitchfork, Fibonacci extension and time guides, ABCD/XABCD/Elliott pivot annotations, Gann grid, callout evidence notes and date+price ranges. Select a family on the chart rail or search within the **Tool Library**; pin favorites and return to recent tools. These analytical drawings do not predict market outcomes.
- **Chart workflows:** historical replay, browser-local price alerts, searchable Tool Atlas (`Ctrl/⌘ + K`), and **Chart Context Lens** for source-qualified price levels and chart objects. Decision Desk and Risk Planner are intentionally hidden from the current chart-first UI; previously saved browser data remains intact.
- **Local-first:** automatic browser workspace persistence and import/export with schema validation. No account is required for local analysis.
- **Experience:** source-status labels, mobile-friendly layered drawing rail and tool library, per-object Style / Coordinates / Visibility dialogs (with undo), source-bound chart observations, dark/light appearance and keyboard-friendly inspection.

## Workstation expansion — PR #57 (under review)

- **Local watchlists:** create/duplicate/rename lists; add, reorder, star and remove known instruments; create named sections, move symbols between sections and write notes. Watchlist state persists in versioned browser workspace JSON and travels through existing import/export. This is not a live exchange quote service: rows display **synthetic demonstration OHLC**.
- **Market screener:** filter the currently supported demonstration symbols by ticker, market, 24-candle change and sorting. Transfer results into the active list. No unprovided financial fundamentals, real-time quotes or unrestricted symbol universe are simulated.
- **Chart navigation/export:** jump to the nearest actually observed UTC bar, without inventing missing sessions; export source-, symbol- and interval-labelled OHLC records. Historical replay exports only the replay-visible candle prefix. Export annotated chart snapshots as PNG with visible drawing geometry and source attribution.
- **Price scales:** absolute, logarithmic, percentage and indexed-to-100 plus independent inversion; settings are restored with workspace state. These transform visualization, **not raw exchange prices**.
- **Exchange-stream resilience:** reconnect with REST-history reconciliation, reject provisional snapshot rollback, detect missing continuously traded Binance candles, retry gap repair and treat silent sockets as stale. Derived second frames remain aggregated from native 1s exchange candles. **This is a candidate implementation pending live-exchange outage testing**; the presence of tests does not establish access for every reviewer region.
- **Strategy Laboratory:** a deterministic long-only SMA crossover researcher with no-lookahead next-candle-open execution, explicit fees and slippage, configurable capital/allocation, equity/drawdown metrics and completed-position ledger. It uses the selected chart's observed data and marks synthetic input clearly. No leverage, account or broker orders, real-market fill claims, spread assumptions or performance guarantees.

The new work remains **unmerged in draft PR #57** until review gates pass and the owner approves publication. TradingView-like capabilities here are independently implemented with open-source libraries; no proprietary TradingView code, market feeds, assets or credentials are included.

## Tool workbench refinement — PR #54

The tool explorer now follows a clear **family → functional subfamily → implemented drawing → focused properties** hierarchy. Hover or focus an item to see an original, vector-rendered visual cue and concise instructions; pin favorites for quick access. The UI favors typography, restrained color, accurate tool icons, collapsible rows and short reversible transitions. It intentionally uses **no generated decorative dashboard images**.

Three additional functional chart tools:

- **Regression channel:** fits a least-squares line to **observed candle closes** within the user-selected anchor interval, computes the population residual deviation, and draws independently adjustable upper/lower bands (0.5–4 σ). The center line can be toggled. The study respects the current data source and does not predict future prices.
- **Trend angle:** measures the line's **visual angle** against the displayed time axis with optional baseline; this changes with chart scales and is *not* an invariant statistical slope.
- **Highlighter:** records freehand time/price points and renders a translucent stroke with editable width and opacity.

Fibonacci time zones now have independently editable integer time multipliers; cyclic-line studies allow configurable repeat counts. The settings modal explains tool-specific assumptions, retains source and price/time anchors, and supports direct right-click on chart drawings. Saved per-tool defaults also cover the new controls.

Browser interaction, unit math, responsiveness, reduced-motion behavior and full regression suites are release gates; the PR is not a public deployment until merged.

## Chart-first refinement — seconds and independent tool settings

**PR #53:** An interval selector supports 1s, 5s, 10s, 15s, 30s and 45s alongside minute/hour/day periods. Synthetic instruments display explicitly synthetic second-based candles. The opt-in Binance BTC/USDT Spot feed requests **native 1s** REST and WebSocket klines; other subminute frames are computed from real observed native 1s OHLCV rows. Missing source seconds are neither filled nor marked complete. This is not a trade-by-trade/tick feed or a live forex/equity source.

**Tool-specific controls:** individual Fibonacci ratio lines, colors and labels; pitchfork rail offsets; configurable Gann grids; line extension directions; measurement components; note typography; marker orientation; and precision coordinates including seconds. Standalone horizontal price levels also have exact-price, appearance, axis-label and timeframe settings. Saving settings as a **per-tool default** customizes future instances without copying original prices, anchors, symbols or market sources. Drawings, visibility, undo, export/import and tool favorites remain available. The hidden Decision Desk and Risk Planner records are preserved in existing workspace JSON, not erased.

**Scope:** These tools are independent implementations on TradingView Lightweight Charts; proprietary TradingView Supercharts, licensed data feeds, broker execution and full feature parity are not included.

## Market-data provenance

**EURUSD, AAPL and US100 are synthetic demonstrations.** BTCUSDT is synthetic by default, with an opt-in direct public **Binance Spot BTC/USDT** exchange-data mode.

Binance history and WebSocket updates may be unavailable depending on the viewer's network and the exchange's terms. The feed must label unavailable/stale states rather than substitute demonstration candles under a live label. These are **spot exchange quotes, not broker, CFD or executable account prices**. Provider attribution and data rights must be verified before commercial distribution.

**Market Terminal does not execute orders, manage brokerage accounts, verify investment performance or provide financial advice.** Long/short drawings and risk tools are analytical illustrations unless contract and execution metadata have been verified.

## Run locally

```bash
npm install
npm test
npm run build
npm run dev
```

Vite uses `/market-terminal/` as its GitHub Pages base.

## Review and deployment

This repository's GitHub Pages deployment workflow runs on changes merged to `main`, once Pages is configured with GitHub Actions as its source:

- [Deployment workflow](.github/workflows/deploy-preview.yml)
- [Repository actions](https://github.com/cash-factory/market-terminal/actions)
- [GitHub Pages configuration](https://github.com/cash-factory/market-terminal/settings/pages)

**Do not interpret a pull request or successful CI as a published preview.** Confirm the deployment workflow and open the resulting Pages URL before announcing publication.

The Pages site is public. Never put broker passwords, exchange secrets, restricted feed access, or personal account records into this static preview. Browser data remains on each viewer's device; export before clearing it.

## Product work and quality

- [Tool Atlas and capabilities](docs/TOOL_ATLAS.md)
- [Delivery sequence and release gates](docs/DELIVERY_SEQUENCE.md)
- [Product experience standards](docs/PRODUCT_EXPERIENCE.md)
- [Phase 1 QA and manual acceptance](docs/PHASE1_QA.md)

A successful TypeScript build and test suite are **necessary but insufficient**. Physical-device, source-reconnect, browser interaction and performance acceptance remain separate release gates.

Core drawing and local analysis tools should not have arbitrary quotas. Real limits are device performance, storage, provider permissions and data licensing.
