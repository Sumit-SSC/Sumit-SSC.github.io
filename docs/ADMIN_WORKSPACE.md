# Admin workspace (`/admin/`)

## What it is

A full-screen **editor shell** (sidebar + live site preview + inspector). You do **not** add `?admin_edit=1` by hand: the shell loads your public pages with `?admin_embed=1` automatically.

- **URL:** `https://sumit.indevs.in/admin/index.html`  
- **Optional subdomain:** add DNS `admin` → GitHub Pages, then open `https://admin.sumit.indevs.in/` — the root `index.html` redirects to `/admin/index.html`.

## Cloudflare

1. **Worker variable** `ALLOWED_ORIGINS` must include `https://admin.sumit.indevs.in` (and your main site origins) so cookies work for Login / Save.
2. Deploy the latest Worker after changing variables.

## Features

- **Projects (home):** inspector tabs **Titles** (homepage view labels) and **Homepage JSON** (Editor.js → `homepage-content` API target).
- **Projects / case studies lists:** loaded from public `data/projects.json` and `data/case_studies.json`; click any row to edit that record in the inspector (Editor.js) while the iframe shows the live detail page.
- **Case studies archive / About:** preview only in the iframe; static HTML note in the inspector.
- **Ribbon:** Login, Session, Refresh preview, Open live page, Insert (paragraph / heading / list / code), Reload, Save.
- **Preview strip:** embedded pages show a thin “Live preview · Admin workspace” bar (`admin-embed-bootstrap.js`).

## Config

Edit the `window.__ADMIN_APP__` block at the top of `admin/index.html` if your production host or API base changes.

## Legacy

- `/dev/index.html` remains a lightweight JSON editor.
- Standalone `?admin_edit=1` on `homepage.html` still works **outside** the iframe; inside the admin preview iframe, the duplicate Phase A bar is suppressed so controls stay in the workspace.
