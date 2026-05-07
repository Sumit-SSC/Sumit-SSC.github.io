## Asset Retirement Log

This file tracks assets moved out of active `assets/` into archive folders.

### Date
- 2026-04-17

### Why
- Reduce root `assets/` clutter.
- Keep legacy/demo files available without risking active-site breakage.
- Avoid hard deletes until we fully remove/archive legacy/demo pages.

### JS moved to `archive/assets/js-unused/`
- `assets/js/components.js` -> `archive/assets/js-unused/components.js`
- `assets/js/homepage.js` -> `archive/assets/js-unused/homepage.js`
- `assets/js/homepage copy.js` -> `archive/assets/js-unused/homepage copy.js`
- `assets/js/materailMain.js` -> `archive/assets/js-unused/materailMain.js`

### CSS moved to `archive/assets/css-unused/`
- `assets/css/aboutme.css` -> `archive/assets/css-unused/aboutme.css`
- `assets/css/aboutmeNoscript.css` -> `archive/assets/css-unused/aboutmeNoscript.css`
- `assets/css/social.css` -> `archive/assets/css-unused/social.css`
- `assets/css/socialNoscript.css` -> `archive/assets/css-unused/socialNoscript.css`

### Verification notes
- No references found from active site pages to the moved CSS files.
- Remaining references to moved JS are only in:
  - `archive/legacy/*`
  - `docs/projects-legacy/*`
  - docs examples (`docs/COMPONENT_SYSTEM.md`)

### Next optional cleanup
- If you no longer need legacy/demo pages, archive `docs/projects-legacy/` too.
- Update legacy/demo file paths if you want those pages runnable from archive.
