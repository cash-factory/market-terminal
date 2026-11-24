# Peak asset acceptance criteria

- [ ] All SVGs parse as XML and render at 100%, 125%, 200% zoom.
- [ ] Cross-browser sprite `<use>` and Vite base paths verified in Chromium/Firefox/WebKit.
- [ ] Logo legible as a favicon and as horizontal/compact lockups on light and dark surfaces.
- [ ] Backdrop blur has usable fallback and meets relevant contrast requirements.
- [ ] Chart and drawing pointer targets unaffected; UI tested at 320, 768, 1366 and 1920 px.
- [ ] Synthetic/decorative chart art cannot be mistaken for real-source claims.
- [ ] Sound is opt-in and low volume, with visual equivalents and an independent disable control.
- [ ] Save/reload, workspace import/export, replay stepping, watchlists and keyboard shortcuts remain reliable after later UI integration.
- [ ] Full tests and human screenshot review pass before merge/deploy.

Asset creation is complete for these files; UI integration and real-browser validation remain separate work.
