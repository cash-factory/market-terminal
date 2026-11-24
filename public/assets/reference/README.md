# Screenshot-informed Market Terminal asset refinement

These original, editable SVGs are derived from the **visual language**, not copied pixel-for-pixel, of three user-supplied Market Terminal UI concept screenshots.

## Distinctive characteristics
- **Navigation**: compact, 1.65 px white/neutral monoline icons with comfortable 24 px viewboxes, no decorative icon containers; active state is a deep-red *background* or thin underline.
- **Drawing rail**: chart-first icons displayed on a nearly black solid strip, not floating inside glowing cards. Preserve the original drawing geometry and hit targets.
- **Replay**: red circular primary Play/Pause, monochrome skip/step icons, an explicit speed control, and a progress timeline with visible bar milestones. Visual art `media/replay-transport.svg` is a reference, not a coded player.
- **Media**: translucent charcoal/graphite panels over low-contrast alpine backgrounds; original luminous flowing signal ribbon for small onboarding/study cards. Do not place these backgrounds under chart candles, grid/axis labels, or drawing handles.
- **Market sessions**: dotted geography and low-saturation markers; compute active status and day/night transitions dynamically using proper timezones and DST. `session-map-dots.svg` has a *decorative illustrative London accent*, not a live active badge.
- **Simulation**: optional low-contrast volumetric bars only for empty-state illustrations or page headers, never a fabricated results chart.

## Original references and explicit exclusions
Observed in the supplied concepts: angular red M mark, icon-rail and grouped sidebar, red-highlighted replay controls, glass panels, market session map, alpine/graphite horizon, and red filament ribbon.

Do **not** reproduce visual-only claims or features that are outside the current private analyst scope: account execution, broker Positions/Orders/Trade History, simulated profit badges presented as validated data, paid-upgrade advertising, or journal product modules from YoungMoney3.

## File usage
Reference icons are individually stored under `public/assets/reference/icons`, with a sprite `reference/reference-icons.svg` and `reference/icon-registry.json`. Domain icons complement existing Lucide rather than replacing it across all controls.

Source SVG paths work with the existing Vite base: `${import.meta.env.BASE_URL}assets/reference/media/alpine-horizon.svg`.

## Screen-to-asset mapping
| Surface | Preferred media / icon examples | Rule |
|---|---|---|
| Workspace overview | `alpine-horizon.svg`, `workspace-grid`, `workspace-stack` | Mountain at low opacity beneath panel surfaces |
| Chart workspace | `chart-trendline`, `chart-fibonacci`, `chart-magnet`, `chart-lock` | No decorative image overlays in canvas |
| Replay laboratory | `replay-control-play`, `replay-control-back`, `replay-control-speed` | Timeline and tool state remain working DOM controls |
| Simulation | `simulation-ambient-bars.svg`, `workspace-simulation` | Illustrative only, no implied trading results |
| Watchlists & saved workspaces | `favorites-star`, `template-board`, `workspace-stack` | Rows/cards must be keyboard-accessible |
| Market context/session | `session-map-dots.svg`, `session-globe`, `session-timeline.svg` | Source of session status must be real time logic |
| Preferences | `ui-panel-glass`, existing theme tokens | Usable high-contrast and reduced-transparency modes |
| Help / onboarding | `red-signal-ribbon.svg`, `workspace-research` | No persistent unrelated promotional elements |

These are source assets and reference illustrations. Nothing is deployed or wired into the live application by these commits.
