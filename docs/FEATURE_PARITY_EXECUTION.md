# Market Terminal — verified workstation parity program

## Boundary

This project is an independently authored local-first financial charting workstation, **not a TradingView clone or replacement of TradingView's proprietary library**. Market data is never obtained from TradingView; the open-source Lightweight Charts renderer is licensed separately. No broker execution, licensed stock/forex feed or cloud account synchronization is present.

## Feature inventory

| Function | Current implementation | Remaining limits |
| --- | --- | --- |
| Chart panes | One, two, four charts; independent symbols/intervals; crosshair and range links | Generic multi-pane groups, 6/8-pane layouts, explicit pane-specific scale profiles |
| Chart rendering | Candles, OHLC bars, close line, area, Heikin-Ashi; new normal/log/percent/indexed scales and inversion | Nonstandard price-built forms require documented mathematics |
| Drawing engine | 37 direct-manipulation tools; properties, anchors, templates, favorites, undo/redo, grouping | Nested groups, per-pane scene graph, broader family geometry, named drawing templates |
| Research workflow | Browser-local notes, decision records, context, replay, price alerts; deterministic SMA Strategy Lab with explicit costs and next-bar fills | Durable server alerts, configurable strategy engine, paper execution |
| Watchlists | Multiple local lists, sections, notes, reordering, favorites, persistence | Provider-backed symbol catalog, commercial quote and fundamental permissions |
| Screener | Search, categories, min/max change, sort, transfer to local lists | Only four synthetic sample instruments; no actual exchange screening |
| Chart utilities | UTC observed-bar navigation, source-labelled OHLC CSV export | Image capture with drawing overlays, complete layout and indicator exports |
| Data integrity | Binance Spot BTCUSDT opt-in, native 1s and derived seconds, reconnect/backfill/gap detection candidate | Real connection/outage acceptance, provider entitlement catalog, other venues |

## Acceptance gates for current PR

1. Every unit test, TypeScript build, full Chromium drawing/browser test, Firefox, WebKit and mobile suite passes at the **latest head**, not an intermediate commit.
2. Watchlists survive reload and export/import. Removing a section moves its instruments rather than deleting them. Unknown/duplicate tickers are rejected.
3. Screener values are sourced only from explicitly synthetic candle fixtures and are never presented as live quotes.
4. UTC navigation maps a requested timestamp to a real observed candle, including missing-session fixtures, without adding data.
5. Export and replay preserve symbol/source/interval and visible-data boundaries.
6. Logarithmic, percentage, indexed, inverted and normal modes work through the actual chart library and persist.
7. Binance WebSocket history reconciliation preserves last finalized OHLC, repairs gaps, and does not mark a broken or silent feed live. Simulated network tests are not real-provider acceptance.
8. Real hardware, accessible pointer/focus workflows and performance remain acceptance obligations beyond CI.

## Next foundation tasks

- Introduce canonical provider + instrument metadata (venue, contract, tick, session calendars, account currency).
- Replace ad-hoc drawing grouping with validated hierarchical scene operations and undoable commands.
- Generalize symbol-interval link groups and editable chart workspace templates.
- Add indicator registry with numeric reference fixtures and bounded computation.
- Introduce deterministic replay clock, paper-order ledger and strategy testing with strictly no future-data leakage.
- Build legitimate provider connectors with verified redistribution rights; support market screeners over source-qualified snapshots.
- Add authenticated backend only for server alerts, sync or read-only YoungMoney3 integration, with independent security review.

## Design intent

Prefer functional controls with restrained typography, consistent density and clear action outcomes over decorative UI. Source status is always visible. If an action depends on missing data or backend capabilities, display an unavailable state rather than a mock button.
