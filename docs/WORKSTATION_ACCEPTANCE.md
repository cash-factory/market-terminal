# Workstation acceptance checklist

Test the feature branch before merging.

- [ ] Sidebar navigation works via pointer and keyboard; active destination is visible.
- [ ] Market overview links launch the corresponding synthetic instrument in Terminal.
- [ ] Ctrl/Cmd+K opens instrument search, input receives focus, Escape closes it.
- [ ] Selecting a timeframe changes the chart while preserving stored price levels.
- [ ] Price level tool visibly arms, a chart click places a level, and Escape cancels.
- [ ] Adding/removing a level updates the chart and sidebar without losing the chart viewport unnecessarily.
- [ ] Workspace export/import round trips settings and price levels.
- [ ] Malformed workspace files fail with a user-visible error.
- [ ] Color themes and dark/light modes remain readable in desktop and mobile widths.
- [ ] Saved preferences survive refresh and reset requires user confirmation.
- [ ] All demo chart values and prices are explicitly marked synthetic.
- [ ] Unit tests and production build pass on GitHub Actions.

These checks are not claims that the browser interactions have already passed.
