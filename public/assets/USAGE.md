# Market Terminal asset integration

## Scope
Brand, glass and mountain atmosphere, technical iconography, feature illustrations, session references, semantic colour tokens and optional UI earcons. These files are source resources; the application redesign is not implemented by adding them.

## Vite / GitHub Pages
Paths under `public/assets/` are available at `${import.meta.env.BASE_URL}assets/…`. Do not hard-code `/assets/`: the deployed base is `/market-terminal/`.

```tsx
const ASSET_BASE = import.meta.env.BASE_URL + "assets/";
<img src={ASSET_BASE + "brand/lockup-dark.svg"} alt="Market Terminal" />
<img src={ASSET_BASE + "illustrations/empty-watchlist.svg"} alt="" loading="lazy" />
```

## Usage hierarchy
- Header: logo lockup or standalone mark, without duplicative accessible names.
- Sidebar: muted Peak horizon behind solid-enough glass to preserve contrast; one red active-state accent.
- Chart: entirely solid work surface; never place decorative mountain, grain or glass behind candle prices, crosshair, selected anchors, graph ticks or chart labels.
- Watchlists, drawing management and alerts: dense functional rows; illustrations only for empty/onboarding states.
- Replay: preserve paused/revealed/unknown-data distinctions and controls, with opt-in and rate-limited earcons.
- Session map: decorative map only; calculate session open states with timezone and DST-aware logic.
- Sources: demo/synthetic/live/stale/offline must be textual, not colour alone; never imply sourced data from illustration.
- Themes: include solid fallback and reduce transparency on devices without backdrop-filter; high-contrast override.

## Standards and budgets
- Icons: 16–24 px; touch controls at least 44 px; illustration max width 540 px for empty states.
- Alt text: explanatory images get meaningful text, redundant decorative images use `alt=""`.
- Prefer existing Lucide icons for generic actions; use terminal sprite for specialised market-analysis concepts.
- Motion: respect `prefers-reduced-motion`; avoid motion that interferes with drawing pointer tracking.
- Sound: muted by default, separate opt-in/volume toggle, visual equivalent for every event.
- Naming: lowercase-kebab-case, meaningful purpose, versioned manifest; audit license and provenance before adding third-party resources.

## Future families
Reserved asset namespaces for anchored-volume analysis, advanced pattern research, multi-monitor layouts, new data feeds and accessibility states. There are no fabricated integrations, broker credentials, real performance metrics or copyrighted audio in the library.
