# Architecture roadmap

## Principle
No artificial paywalls or numeric caps on drawings, indicators, layouts, locally executed backtests, or watchlists. Practical limits are device memory/performance, storage quotas, and permitted market-data access.

## MVP
React + TypeScript frontend. TradingView Lightweight Charts (Apache 2.0) is a rendering dependency, **not** TradingView's proprietary Advanced Charts library. Initial chart and prices are deterministic **synthetic demo data**, not a live market feed.

## Next milestones
1. Add pluggable provider interface, source attribution, feed status, and historical OHLCV normalization.
2. Implement pointer-driven graphical drawing interactions, persistence, snapping, and undo/redo.
3. Add browser-local indicator computation in Web Workers, replay and bounded strategy testing.
4. Add optional Cloudflare backend for authenticated workspace sync; local-only experience must remain functional.
5. Implement permissioned, read-only YoungMoney3 trade overlays, without broker password or trade-execution access.

## Security and licensing
No secrets committed; never expose provider API credentials in a public client. Validate live-data redistribution and instrument entitlements prior to offering real quotes to public users. Read-only YoungMoney3 scopes require explicit user grants and revocation. Tests must validate candlestick aggregation, technical indicator reference values, user isolation and no-lookahead replay.

## Run
`npm install` then `npm run dev`. `npm run build` checks TypeScript and produces assets.

## Known limitations
This is an interactive **prototype**, not a finished TradingView-equivalent platform. Price levels can currently be created via typed values; pointer-based drag/draw tools, import, full indicators, real feeds and cloud sync are not implemented.
