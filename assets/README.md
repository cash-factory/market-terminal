# Market Terminal — Peak visual asset library

The deployable, versioned source assets are in [public/assets](../public/assets). This directory documents how to use them. The static Vite site serves files under `/market-terminal/assets/` when deployed to GitHub Pages; use `import.meta.env.BASE_URL + "assets/…"` in React instead of hard-coding the prefix.

## Design direction
- Brand: angular two-peak red M, dark graphite and white wordmarks.
- Atmosphere: quiet horizon/mountain backgrounds *behind* glass panels, never on chart candles or scale labels.
- UI: functional data density, translucent navigational surfaces, solid-contrast charts, one clear active accent.
- Icons: keep existing `lucide-react` for generic actions; use `public/assets/icons/terminal-symbols.svg` for domain-specific silhouettes.
- Audio: optional, muted by default, no autoplay or loud notifications.
- Illustration: use only for landing/onboarding/empty states and explanatory templates, not as fabricated market evidence.
- Unknown or synthetic market sources must stay explicitly labelled; never illustrate them as genuine feed output.

## Rights and production status
Original vectors and original synthetic UI earcons in this kit were authored specifically for this project; no third-party fonts, photos or recordings are embedded. Assets are static visual resources, not integrations. Additional UI wiring, cross-device testing, SVG sanitization for user uploads, product-copy review, and accessibility verification are separate acceptance gates.

See `public/assets/manifest.json` and `public/assets/USAGE.md` for full inventory, intended UI slots, source formats and extension rules.
