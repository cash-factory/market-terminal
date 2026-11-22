# Market Terminal

A **local-first market analysis and decision research workstation**, built with React, TypeScript and [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts) (Apache 2.0). Market Terminal is independent of YoungMoney3. No broker execution or account connection is enabled in this repository.

## Available workflows

- **Chart Studio:** one-, two- and four-pane charts, independent frames/sources, chart types, indicators, saved profiles, drawing and direct manipulation.
- **Drawing tools:** a 34-type implementation catalog on the layered drawing-system branch, grouped into trend/channels, Fibonacci/Gann, manually anchored patterns, measurement, shapes, annotations and markers. Notable additions: real three-to-six-point drawing gestures, median pitchfork, Fibonacci extension and time guides, ABCD/XABCD/Elliott pivot annotations, Gann grid, callout evidence notes and date+price ranges. Select a family on the chart rail or search within the **Tool Library**; pin favorites and return to recent tools. These analytical drawings do not predict market outcomes.
- **Research:** historical replay, browser-local price alerts, risk planner, searchable Tool Atlas (`Ctrl/⌘ + K`), **Decision Desk** for time-stamped observations, and **Chart Context Lens** for distance to user-marked price levels, source status and quick in-browser alerts.
- **Local-first:** automatic browser workspace persistence and import/export with schema validation. No account is required for local analysis.
- **Experience:** source-status labels, mobile-friendly layered drawing rail and tool library, per-object Style / Coordinates / Visibility dialogs (with undo), source-bound chart observations, dark/light appearance and keyboard-friendly inspection.

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
