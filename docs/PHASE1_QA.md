# Phase 1 Quality Verification

The full Chromium Playwright regression suite is a merge gate. A second, intentionally
small smoke matrix runs on Firefox, WebKit, emulated Android Chromium, and emulated
iOS WebKit. Both use **built Vite production assets**, not a static mockup.

## Verified by automation
- Chart loads and drawing captures a pointer gesture.
- Saved drawings remain after page reload.
- Multi-chart layout, selected timeframes, and full chart profiles restore.
- Technical studies and chart display styles remain active after reload.
- Touch-sized layouts expose major chart controls without horizontal document overflow.
- Unexpected browser JavaScript exceptions fail the smoke test.

## Outstanding manual physical-device acceptance
- Windows Chromium/Firefox with mouse and keyboard: pan, zoom, drag, resize and group
  drawing objects; export/import a 1,000+ drawing workspace.
- iOS Safari on physical iPhone/iPad: chart touch gestures, two-tap tools, scroll
  conflicts, keyboard focus, safe-area padding and orientation changes.
- Android Chrome on physical phone/tablet: tap-to-draw, drag handles, panel resizing,
  notification visibility and orientation changes.
- Mac Safari on real Mac hardware: active chart gesture interaction and local storage.
- Benchmark chart snapshots at 100,000+ candles and verify memory/interaction latency
  under four simultaneous panes on representative hardware.

## Data and execution boundaries
Demo EURUSD, AAPL and US100 candles are illustrative and continuous; their calendar
or tick precision **must not** be inferred to represent a broker venue.
Binance Spot BTC/USDT is the only currently selectable real-data connection and
may be unavailable where exchange connectivity is restricted.

Broker-specific tick/lot/contract and holiday calendars, redistributable live
equities/forex feeds, server alerts and actual order execution are Phase 2/3
dependencies. Those cannot be declared production-ready based on chart-only tests.

## Acceptance rule
Do not call Phase 1 fully accepted merely because unit tests or automated browser
emulations pass. Record actual device and large-workspace findings before sign-off.
