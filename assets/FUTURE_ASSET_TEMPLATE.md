# Future Peak asset request template

The library is an expandable system, not a claim that every future feature can already be predicted.

## Asset contract
- **Feature and user action:** The interface workflow where this asset appears
- **Evidence and status:** Whether the asset can show actual data or must remain illustrative
- **Surface:** Navigation / Chart / Overlay / Empty state / Onboarding / Settings
- **Accessibility:** Screen-reader label, contrast, reduced motion or sound equivalent
- **Scale:** Mobile 320px / laptop 1366px / desktop 1920px / zoom 200%
- **Appearance:** Peak Glass, Peak Night, Peak Light, High Contrast
- **Licensing:** Original / open source with license / paid license (include provenance)
- **Asset source:** Prefer editable SVG, avoid embedded typefaces or stock-raster dependency
- **Performance target:** Reuse design tokens; avoid increasing chart interaction frame costs
- **Verification:** Visual preview, screenshot tests, browser interaction where used, real content/state checks

## Suggested next families, conditional on actual implementation
- Anchored volume and advanced drawing geometry guides
- Indicator and data-provenance onboarding illustrations
- Multi-monitor / multi-window workspace layout examples
- Replay-scenario end states and archived study thumbnails
- Improved market session reference maps with dynamic status overlays
- Keyboard shortcut assistive overlays and accessible high-contrast variants

Add the source file, update the manifest, and extend `scripts/verify-assets.mjs` coverage. New file count alone is not a success measure.
