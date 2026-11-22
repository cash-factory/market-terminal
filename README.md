# Market Terminal

A **local-first market analysis and decision research workstation**, built with React, TypeScript and [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts) (Apache 2.0). Market Terminal is independent of YoungMoney3. No broker execution or account connection is enabled in this repository.

## Available workflows

- **Chart Studio:** one-, two- and four-pane charts, independent frames/sources, chart types, indicators, saved profiles, drawing and direct manipulation.
- **Drawing tools:** a 34-type implementation catalog on the layered drawing-system branch, grouped into trend/channels, Fibonacci/Gann, manually anchored patterns, measurement, shapes, annotations and markers. Notable additions: real three-to-six-point drawing gestures, median pitchfork, Fibonacci extension and time guides, ABCD/XABCD/Elliott pivot annotations, Gann grid, callout evidence notes and date+price ranges. Select a family on the chart rail or search within the **Tool Library**; pin favorites and return to recent tools. These analytical drawings do not predict market outcomes.
- **Chart workflows:** historical replay, browser-local price alerts, searchable Tool Atlas (`Ctrl/⌘ + K`), and **Chart Context Lens** for source-qualified price levels and chart objects. Decision Desk and Risk Planner are intentionally hidden from the current chart-first UI; previously saved browser data remains intact.
- **Local-first:** automatic browser workspace persistence and import/export with schema validation. No account is required for local analysis.
- **Experience:** source-status labels, mobile-friendly layered drawing rail and tool library, per-object Style / Coordinates / Visibility dialogs (with undo), source-bound chart observations, dark/light appearance and keyboard-friendly inspection.

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
