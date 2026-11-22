# Market Terminal

A local-first, free-to-use multi-market analysis workstation. Market Terminal is independent of YoungMoney3, with optional read-only integration planned.

## Features available in this prototype

- Responsive market overview and trading terminal
- Synthetic demonstration candles for forex, crypto, stocks and indices
- Timeframes, SMA overlay and symbol search
- Horizontal levels, trendlines, rectangles and Fibonacci drawings
- Drawing management, undo/redo, browser-local preferences and workspace export/import
- Dark/light appearance and several accent styles

**All prices currently displayed by the application are synthetic.** The Binance Spot historical adapter exists in the codebase but is not yet integrated into the chart UI. This is not a broker, live trading terminal or source of real-time quotes.

## View the public preview

The project is configured to auto-deploy to **GitHub Pages** whenever code is merged into `main`.

**One-time repository configuration is required:**

1. Visit [Settings → Pages](https://github.com/cash-factory/market-terminal/settings/pages).
2. Under **Build and deployment**, change **Source** to **GitHub Actions**.
3. Save the selection.
4. In [Actions](https://github.com/cash-factory/market-terminal/actions/workflows/deploy-preview.yml), re-run the failed deployment job, or select **Run workflow** on `main`.
5. Confirm the **Deploy Market Terminal preview** workflow succeeds, then open the site URL shown in the deployment's `github-pages` environment.

GitHub Pages serves publicly accessible static sites. Do not put secrets, broker credentials, or restricted personal records into this app or repository. Browser-local workspaces remain on each device and are not shared through GitHub Pages.

## Local development

```bash
npm install
npm test
npm run build
npm run dev
```

Vite is configured with `/market-terminal/` as the GitHub Pages project-base path.

## Current engineering work

Tracked in [GitHub issues](https://github.com/cash-factory/market-terminal/issues), including drawing improvements, market-data integration, richer UX, and YoungMoney3 linking.

## Product principles

No artificial quotas on core drawing objects, indicators or workspace layouts. Real constraints include client performance, storage availability, market data entitlements and provider licensing.
