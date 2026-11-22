# Market Terminal overhaul review

**Decision requested:** choose the default working layout. I recommend Chart desk for drawing, inspection and replay. Market notebook gives instrument switching priority. Both are static composition studies. The layouts can each support light and dark appearance. [View the three design boards](Market-Terminal-Directions.pdf).

## Audit baseline

Reviewed main at 401752da51224c94d5d82643b10e236db8260c69, built that checkout, and inspected the [deployed workstation](https://cash-factory.github.io/market-terminal/) in desktop Chrome. The deployed UI exposed the Markets and Objects tabs introduced by PR 46. The deployment SHA was not independently attested.

Visited all six destinations. On Terminal I armed Trendline, dragged between two coordinates on the chart, saw Undo enable and Objects 1 become selected, then entered and exited focus mode. The chart remained visible in focus. Independent live-feed availability, physical touch behavior, screen-reader experience and destructive reset were outside this manual sample.

## Findings by priority

| Priority | Evidence | Effect and proposed change |
|---|---|---|
| High | At a rendered 1363 × 936, the 888 px-wide chart region started at y=426 and ended at y=997. Setup and drawing controls consumed 186 px. Undo and redo wrapped onto a row of their own. | Reading a price against its time axis requires a page scroll on this desktop. Give the plot a viewport-height budget and move drawing families into a rail. Keep interval, studies, replay and layout within one action. |
| High | In Preferences, both the description and reset confirmation mention layout or levels. The handler replaces the whole workspace with defaults, including drawings, alerts, risk inputs, templates and saved profiles. Source inspection, reset not executed. | Show affected categories and counts and provide export before confirmation. Test cancel and confirm against a populated disposable workspace. |
| High | On a storage-write exception App.tsx displays an error, but the chart footer still says “Locally saved” and the application footer says “Workspace saved locally.” | Derive both feedback and persistent status from the last write result. Verify simulated unavailable storage and a subsequent successful save. |
| High | The exporter has no size limit and the importer rejects files above 2,000,000 bytes. The workspace page describes the backup as preferences and drawing levels. | Before promising restoration, round-trip a populated export near and above this boundary and surface the actual backup scope. |
| Medium | In the single-chart view both crosshair linking and time-range linking are in the main toolbar. Demo and disabled Binance Spot sit beside EUR/USD. | Show pane-link controls with multi-pane layout. Keep data-source availability in the instrument picker, with the current source visible by the price. |
| Medium | Synthetic data is repeated in the top bar, chart heading, badge, explanatory sentence and footers. The market-hours reference occupies another full-width row. | Give each displayed pane one clear source and freshness indicator and expose details on demand. Preserve distinctions among synthetic, delayed/stale, live, replay and market-hours reference. |
| Medium | “Search markets or commands” opens an instrument dialog. App.tsx filters only four instruments by name, symbol and market. | Label it “Search instruments” for this release. Use commands in this entry point only when actual actions are available. |
| Medium | A price level can be created in Draw and in Markets; created shapes appear in Objects. The resizer and visibility toggle call the entire inspector a watchlist. | Keep the fast numeric entry, index levels and shapes coherently, and name the panel for both uses. Preserve the automatic selection after drawing. |
| Medium | At 960 px and below CSS places the inspector after the chart. At 620 px the navigation hides text and mobile drawing controls use 10 px labels. Existing mobile layout assertion checks horizontal overflow. | Test reachability in the first viewport and after drawing. Use a dismissible labeled sheet for mobile editing. Verify pan, zoom, sheet close, focus return and tool cancellation on touch. This is a source finding, not a measured mobile session. |
| Medium | Markets/Objects expose tab roles with click handlers but lack tablist arrow-key navigation. Appearance choices expose selection visually without a pressed state. | Test keyboard traversal, selected state announcements, modal focus return and interrupted drags. |
| Medium | Overview leads with a slogan and a quota statistic. Alerts splits monitoring limitations over several passages. Workspace understates backup content. | Lead Overview with resume instrument and timeframe. On Alerts keep monitoring status by the threshold, link to detailed conditions, and distinguish an armed local alert from an actively updating feed. |
| Maintenance | README describes the Binance adapter as unconnected. The deployed Overview advertises opt-in BTC/USDT and usePriceFeed wires REST history and WebSocket updates. | Update documentation when the accepted UI ships. Verify loading, history, connecting, live, stale, retry and error using deterministic fixtures. |

## Architecture and preservation contract

React 18, TypeScript and Vite serve a browser-local single-page app at /market-terminal/. App.tsx (1,089 lines) coordinates navigation, persisted preferences, drawing history, overlays and panes. ChartCanvas.tsx integrates Lightweight Charts. DrawingOverlay.tsx handles the SVG interaction layer; geometry, snapping and object operations have separate modules. Domain logic for risk, replay, alerts, studies and sources is already separate. The 703-line global stylesheet contains multiple rounds of workstation, focus and responsive overrides.

| Area | Preserve during shell replacement |
|---|---|
| Chart and market data | Four demo markets, six intervals, five display styles, comparison overlays, market-hours provenance, optional BTC/USDT Binance feed, retry and per-pane recovery. Keep demo and provider records distinct. |
| Chart layouts | One, two and four panes, independent symbols/intervals/sources, linked crosshairs and visible ranges, saved profiles, focus mode and panel resizing. |
| Drawing | Levels, trendlines, rectangles, Fibonacci, ray, measure, arrow, ellipse, annotation, long/short positions, brush and channel. Preserve click/drag/touch gestures, anchors and hit-testing during pan/zoom, magnet, repeat, cancellation, undo/redo, object selection, styles, groups, lock, visibility and layering. |
| Analysis | Built-in and configurable studies, formula studies and templates; historical replay controls; local active-feed alert monitoring; instrument-linked risk inputs and estimates. Preserve source, currency and modeling assumptions at the point of use. |
| Workspace | Dark/light and violet/teal/amber; instrument search and shortcuts; local persistence and JSON transfer. Current export version 23; import explicitly accepts versions 1–23. Keep fixtures from earlier versions. |
| Navigation | Overview, Terminal, Risk Planner, Price Alerts, Workspace and Preferences. Advanced commands can move if their behavior remains reachable by pointer and keyboard. |

## Implementation and acceptance

1. **Visual review.** Compare the same EUR/USD task in both concepts, including the selected-trendline state. Review the third board for the phone editor. Decide where the watchlist and object controls belong before changing main.
2. **Branch prototype.** Start with the real ChartCanvas and DrawingOverlay. Extract the shell, market controls, drawing palette and inspector around existing command handlers. Keep state keys and pane identity stable. Record chart dimensions before and after opening a tool.
3. **First acceptance slice.** At 1440 × 900 and 1366 × 768, show the complete single-pane time and price axes at default zoom. At 390 × 844, show the chart and direct access to drawing without horizontal page overflow. Draw, edit, undo, redo, switch panes and reload a populated workspace. Record desktop, tablet and phone captures for default, selected object, replay and four-pane states.
4. **Secondary surfaces.** Apply the agreed hierarchy to Risk, Alerts, Workspace, Preferences and Overview. Exercise empty, populated, error, stale, storage-failed and imported states. Use keyboard-only and touch passes plus dark/light contrast verification.
5. **Regression and merge.** Preserve behavioral tests. Replace the existing assertion that drawing controls must be below market controls only after a geometry change has been approved; retain checks for access and real drawing placement. Add a first-viewport axis assertion. Require unit/build, Chromium regression and all four cross-browser/touch projects to pass. Review rendered evidence against the chosen direction before merging.

## Verification record

- Local npm test: 114 passing tests in 29 files. TypeScript and production Vite build passed.
- The unmodified default Playwright config enumerates 53 tests in 26 files. The separate smoke config runs three scenarios in Firefox, WebKit, mobile Chromium and mobile WebKit. CI captures failure traces; no visual baseline approval is encoded in the workstation layout test.
- Browser binary download was unavailable locally and the installed Chromium process was denied a socket at startup. Local automated browser assertions could not establish a result. Manual desktop observations above came from the rendered deployment.
- On the head of the merged PR 46, GitHub reported success for [unit/build](https://github.com/cash-factory/market-terminal/actions/runs/45050483164), [Chromium](https://github.com/cash-factory/market-terminal/actions/runs/45050483061), and [cross-browser/touch](https://github.com/cash-factory/market-terminal/actions/runs/45050483119). Those are historical runs on the PR head.
