# Multi-chart layouts: 1 / 2 / 4 panels

Market Terminal supports a primary chart and up to three local comparison panels.

- **One chart**: focus on a single instrument and its local drawing workspace.
- **Two charts**: one primary and one comparison, side by side on wide screens.
- **Four charts**: one primary and three comparisons in a 2×2 desktop grid.

All panels use the same selected timeframe and technical study parameters for this
release. Each has its own symbol and its own drawing/level collection. You can select
a comparison symbol directly from that panel or make the comparison the primary
chart to manage it in the right-hand object list. Switching to replay temporarily
focuses the primary chart and restores the selected multi-chart layout on exit.

**Market data:** Only the primary chart can opt into Binance Spot BTC/USDT through
the current public adapter. All comparison charts are explicitly labelled as
synthetic demonstration data and never inherit primary exchange attribution.

**Performance:** Opening four charts multiplies chart rendering cost and study
computation. There are no artificial caps on saved drawings, but browser RAM and
device graphics capabilities still matter. Multi-chart mobile layouts stack
vertically so that price axes remain usable.

Future enhancements in Phase 1: independent per-pane timeframes/providers,
linked crosshair/viewport options, arbitrary layouts and chart profile templates.
