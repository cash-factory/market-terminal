# Market Terminal icon system

97 original, line-based icons (24 × 24, 1.65 stroke) and a single symbol sprite. Generic icons still come from the project's installed `lucide-react` library; this kit addresses specialised charting/research states and optional navigation variants.

Inline HTML/React usage (not `<img>` where inherited colour cannot reliably cross the SVG boundary):

```tsx
function MarketIcon({id,label}:{id:string;label:string}) {
 return <svg viewBox="0 0 24 24" width="20" height="20" role="img" aria-label={label}>
  <use href={import.meta.env.BASE_URL+`assets/icons/terminal-symbols.svg#${id}`} />
 </svg>
}
```

For action buttons, provide an accessible name on the **button** and mark the SVG `aria-hidden`. Don't indicate state by colour alone. Use theme colour, not the wordmark red, for arbitrary icon glyphs.

The separate `individual/*.svg` files are source-ready fallback glyphs. In image tags they may not inherit CSS `currentColor`; apply an explicit presentation method in the consumer.
