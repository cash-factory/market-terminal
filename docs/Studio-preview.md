# Chart Studio review

Run the existing Vite development server and open /market-terminal/?studio. Omit the query to compare with the regular terminal. This is a branch prototype using the existing chart renderer, drawings and workspace format.

## Decision under test

Can a trader draw, edit and resume panning while keeping the price and time axes in the same place? Try Trendline, drag between two prices, adjust Weight in the strip, then choose Done. The Objects inspector exposes detailed settings. Chart setup holds source, display, pane count, linking and comparison controls.

We considered an editor under the plot and a floating editor over the candles. The first consumes vertical space when expanded. The second can cover the anchor being adjusted. This prototype reserves a shallow strip outside the plotting area, reusing its space for navigation hints and drawing properties. This is a judgment to test with users.

## Evidence

At 1363 × 936 in desktop Chrome, the earlier deployed chart region was 888 px wide and began at y=426. In this branch the primary chart surface measured 1002 × 651 at y=275 and ended at y=926. Drawing a trendline activated Objects and exposed Weight immediately. Selecting 5 px updated both controls. Done restored navigation, and undo/redo retained the object. The footprint after Done matched the footprint while drawing.

The repository includes a targeted browser regression for this workflow. The desktop check does not establish mobile ergonomics, measurable task-speed improvements or production readiness. Next field checks include touch drawing on a short viewport, focus return after editing, multi-pane linking, inspector use while zoomed, and continued navigation after a workspace import.

## Design references

- [Photoshop contextual task bar](https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/boost-workflows-with-the-contextual-task-bar.html) — actions can follow selection. Here their location remains fixed outside the data.
- [TradingView favorites](https://www.tradingview.com/support/solutions/43000662392-how-to-favorite-indicators-financials-drawing-tools-and-timeframes/) — repeated drawing actions benefit from direct access. The rail is a first experiment with that principle.
- [Visual Studio Code Zen Mode](https://code.visualstudio.com/docs/editing/getting-started/userinterface) — focus can be a reversible workspace state. The existing focus shortcut remains available.
