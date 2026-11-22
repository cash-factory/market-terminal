# Contributing to Market Terminal

## Local verification

```sh
npm install
npm test
npm run build
npm run dev
```

Pull requests run the same test and production-build checks in GitHub Actions.

## Engineering rules

- Never imply synthetic fixture prices are real market prices.
- Core chart drawings, indicators, watchlists, and workspace layouts must not have artificial paywall counters.
- User-configured provider secrets must not be checked into source control or exposed in browser bundles.
- Every feed adapter must record provenance, entitlement, timezone and freshness metadata.
- Persisted workspaces need schema versions and recoverable export paths.
- New indicators require deterministic fixtures and reference-value tests.
- Chart interactions should be keyboard-accessible and provide clear feedback.
- YoungMoney3 integration must be optional, read-only, scoped and revocable by default.

## Roadmap

Next: pointer-driven drawings (trendline, horizontal line, rectangle, Fibonacci), history/undo/redo, viewport-aware rendering, and import/export support.
