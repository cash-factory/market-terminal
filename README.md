# Market Terminal

**Market Terminal** is a local-first, multi-market charting and analysis workstation. It is independent of YoungMoney3. An optional permissioned, read-only bridge is planned, but not implemented.

## What works today

- A responsive Chart Studio with one-, two-, and four-chart layouts, per-pane symbols, timeframes, chart styles and source selection.
- Interactive trendlines, levels, channels, Fibonacci, shapes, annotations, measurement and illustrative position drawings; selection, styling, grouping, lock/hide, undo/redo and snap controls.
- Multiple built-in technical studies, configurable indicator settings and a constrained, non-eval formula system.
- Market selection, local watchlist/overview, price alerts, chart replay, saved chart profiles and workspace import/export.
- Browser-local workspace persistence, theme options and focused-chart controls.
- Automated unit tests and Playwright workflows, including browser and mobile-emulation smoke coverage.

**Data provenance matters:**

- **EUR/USD, AAPL, US100 and default BTC/USDT charts are synthetic demonstrations**, not live quotes, and must not be used for execution or backtesting performance claims.
- **BTC/USDT has an opt-in, direct Binance Spot public-data mode.** It fetches exchange candles and subscribes to a public WebSocket for updates. On disconnect it can re-fetch history; missing bars are marked stale until reconciled.
- Binance Spot quotes are **not CFD, forex, equity, broker execution, or universally available data**. Direct exchange access may be blocked by network restrictions or Binance policy; public redistribution and commercial use require a separate rights assessment.
- This is **not a broker, trade execution interface, authenticated trading account, or provider of guaranteed real-time market data**. No automatic synthetic fallback may be represented as live.

See [the phase delivery program](docs/DELIVERY_SEQUENCE.md) and [current QA requirements](docs/PHASE1_QA.md) for the work remaining before a broader beta claim.

## Public review preview

When GitHub Pages is enabled in the repository, merging to `main` triggers the [Deploy Market Terminal preview](.github/workflows/deploy-preview.yml) workflow. The configured Pages environment contains the resulting URL.

If Pages has not been configured, in **Settings → Pages**, select **GitHub Actions** as the build source, then trigger the deployment workflow. A preview cannot be considered deployed until the workflow succeeds and the URL loads.

GitHub Pages is public. Do not upload passwords, brokerage credentials, paid feeds, private accounts or personal trade records. Browser-local workspaces remain on the viewer's own device; export before clearing browser data.

## Local development

Requires Node.js 22 or another supported Node.js version for the installed toolchain.

```bash
npm install
npm test
npm run build
npm run dev
```

The Vite base path is `/market-terminal/` for GitHub Pages.

## Engineering principles

- Truthful source, market, and freshness labels; failures degrade to **stale/unavailable**, never to invented prices.
- Core analysis workflows remain local-first and accessible without compulsory account creation.
- No artificial object-count or indicator-count paywalls; protect usability through practical performance budgets and recovery states.
- Read-only integrations must use explicit scoped permissions and preserve trade provenance.
- Passing CI is necessary but insufficient: verify real mouse, touch, keyboard, browser and hardware workflows before sign-off.

Contributions and known issues are tracked in [GitHub Issues](https://github.com/cash-factory/market-terminal/issues).
