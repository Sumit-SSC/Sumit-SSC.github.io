# Phase A — Visual edit on real homepage

## What it does

- Loads copy for the Projects / Case Studies **view switcher titles** from `data/homepage-ui.json`.
- With **`?admin_edit=1`** on `pages/homepage.html`, a floating panel lets you load/save those titles via the Worker API (legacy fallback flow).
- Saves go to **`content/drafts`** as `data/homepage-ui.json`. Merge `content/drafts` → your GitHub Pages branch to update the live site.

## Try it (recommended: admin workspace)

1. Set **Cloudflare Worker** variable `CONTENT_BASE_BRANCH` to the **exact branch GitHub Pages builds** (same as in GitHub → Settings → Pages).
2. Deploy latest Worker code from `cloudflare-worker/admin-api/src/index.js`.
3. Open **`https://event.sumit.indevs.in/admin/index.html`** (or `https://admin.sumit.indevs.in/` after DNS) → **Login** in the ribbon → use the sidebar and inspector. No manual `?admin_edit=1` in the address bar.

### Optional: standalone homepage

1. Log in via `https://event.sumit.indevs.in/admin/index.html` → **Login (GitHub)**.
2. Open `https://event.sumit.indevs.in/pages/homepage.html?admin_edit=1` if you want the old floating bar only (adjust host if needed).

5. Use **Reload from API** → edit titles → **Save draft**.
6. On GitHub: confirm commit on `content/drafts`, then merge into your Pages branch.

## API (Worker)

- `GET /api/admin/homepage-ui` — session required; returns `{ ok, ui }`.
- `POST /api/admin/homepage-ui` — body `{ featuredTitle, caseStudiesTitle }`; writes draft JSON.

## Future (Phase B+)

- Inline click-to-edit on the title element, preview domain, audit log, new-project wizard.
