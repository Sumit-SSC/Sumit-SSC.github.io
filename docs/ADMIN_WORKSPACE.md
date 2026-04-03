# Admin workspace (`/admin/`)

## What it is

A full-screen **editor shell** (sidebar + live site preview + inspector). You do **not** add `?admin_edit=1` by hand: the shell loads your public pages with `?admin_embed=1` automatically.

- **URL:** `https://sumit.indevs.in/admin/index.html`  
- **Optional subdomain:** `https://admin.sumit.indevs.in/` — after DNS is set, the site root `index.html` redirects to `/admin/index.html`.

---

## Two hostnames — do not mix them up

| Hostname | What it is | DNS target |
|----------|------------|------------|
| **`admin-api.sumit.indevs.in`** | **Cloudflare Worker** — OAuth, session cookies, read/save JSON, publish. | Attached in **Workers & Pages → your Worker → Domains** (Cloudflare creates the route; do **not** point this at `github.io`). |
| **`admin.sumit.indevs.in`** (optional) | **GitHub Pages** — static files only (`/admin/index.html`, assets). | **CNAME** → `Sumit-SC.github.io` |
| **`sumit.indevs.in`** | Main portfolio site | Your existing Pages / DNS setup |

- **No conflict:** They are different DNS **names**. One can point to the Worker, another to GitHub.
- **DNS cannot include a path.** There is no way to map “only `/admin`” in Cloudflare DNS. You only set the **hostname**; the **path** `/admin/index.html` is just a file inside the same GitHub repo, served at `https://admin.sumit.indevs.in/admin/index.html` once DNS points to GitHub.
- If **`admin-api`** was accidentally given a **CNAME to `github.io`**, the API and health check will **not** hit the Worker — fix: remove that record and use the Worker custom domain from the dashboard instead.

---

## Cloudflare DNS — `admin.sumit.indevs.in` → GitHub Pages (optional static UI)

Your Pages site is **`Sumit-SC.github.io`** (user site). GitHub serves it when the request hits **`Sumit-SC.github.io`** with a `Host` header that matches a hostname you control via DNS.

### 1. Where to add the record

Open the Cloudflare dashboard → select the **DNS zone** that contains **`sumit.indevs.in`** (the zone might be named `sumit.indevs.in`, or a parent zone like `indevs.in` — add the record under the zone that is authoritative for `*.sumit.indevs.in`).

### 2. Create a CNAME

| Field | Value |
|--------|--------|
| **Type** | `CNAME` |
| **Name** | `admin` (this means `admin.sumit.indevs.in` when the zone is `sumit.indevs.in`) |
| **Target / Content** | `Sumit-SC.github.io` |
| **TTL** | Auto or 300 |

If your DNS is under a **parent** zone (e.g. zone `indevs.in`), the **name** is often the full relative name, e.g. `admin.sumit` (check your provider’s UI — the result must resolve to `admin.sumit.indevs.in`).

### 3. Proxy status (orange cloud vs grey cloud)

- **DNS only (grey cloud)** — Recommended to start: traffic goes straight to GitHub. GitHub issues the TLS certificate for your hostname. Fewer moving parts.
- **Proxied (orange cloud)** — Traffic goes through Cloudflare first. Then set **SSL/TLS** → encryption mode to **Full** or **Full (strict)** so the browser trusts Cloudflare and Cloudflare can reach GitHub over HTTPS. If you see **525** or redirect loops, switch this hostname to **DNS only** or adjust SSL mode.

### 4. GitHub repository settings

1. Repo **`Sumit-SC/Sumit-SC.github.io`** → **Settings** → **Pages**.
2. Under **Custom domain**, you may already use `sumit.indevs.in`. The **same deployment** can also be reached at `admin.sumit.indevs.in` once DNS points to GitHub.
3. After the CNAME propagates, open **https://admin.sumit.indevs.in** once. If GitHub shows a domain verification step or HTTPS pending, wait a few minutes and refresh; GitHub usually provisions a certificate for the new hostname automatically when DNS is correct.
4. Keep **Enforce HTTPS** enabled when GitHub offers it.

### 5. Verify DNS (optional)

From your PC:

```text
nslookup admin.sumit.indevs.in
```

You should see a CNAME chain ending at something under **`github.io`**. Then:

```text
curl -sI https://admin.sumit.indevs.in/
```

Expect **HTTP/2 200** or **302** once TLS is active.

### 6. What this repo does

The root **`index.html`** includes a small script: if the host is **`admin.sumit.indevs.in`** and the path is `/` or `/index.html`, the browser is sent to **`https://sumit.indevs.in/admin/index.html`** (canonical URL for the admin UI).

That script runs **only after GitHub serves `index.html`**. If you see **GitHub’s 404 page** for `https://admin.sumit.indevs.in/`, GitHub is not serving this repo for that hostname yet — the script never runs.

**Fix (pick one):**

1. **GitHub Pages — add the hostname**  
   Repo → **Settings** → **Pages** → **Custom domain** → add **`admin.sumit.indevs.in`** (keep `sumit.indevs.in` as well). Save and wait for the DNS check / certificate. Then `https://admin.sumit.indevs.in/` should load `index.html` and redirect.

2. **Cloudflare — redirect only (no GitHub host needed)**  
   If DNS for `admin` is **DNS only** (grey cloud) to GitHub, Cloudflare redirect rules **do not run** (traffic bypasses Cloudflare). Do this instead:  
   - **Rules** → **Redirect Rules** → create: if `hostname` equals `admin.sumit.indevs.in`, then redirect to `https://sumit.indevs.in/admin/index.html` (302).  
   - Ensure an `admin` DNS record exists and is **proxied** (orange cloud) so the rule applies. You may replace `admin`’s CNAME to `github.io` with a proxied placeholder (e.g. CNAME to `sumit.indevs.in`) or follow Cloudflare’s redirect docs — the redirect fires **before** any origin, so you never rely on GitHub accepting `admin` as a Pages host.

**Practical default:** use **`https://sumit.indevs.in/admin/index.html`** directly and skip the `admin` subdomain until DNS + GitHub or Cloudflare are configured.

### 7. Cloudflare Worker (`admin-api` — API only)

1. **Workers & Pages** → your Worker → **Domains** → you should see **`admin-api.sumit.indevs.in`** (or add it). This is **separate** from GitHub Pages DNS.
2. **Settings** → **Variables**: set **`ALLOWED_ORIGINS`** to include every origin that loads the admin UI, e.g. `https://sumit.indevs.in`, `https://admin.sumit.indevs.in` (see `wrangler.toml`).
3. Redeploy after changing code or vars.

Cookies for Login / Save are set on **`admin-api.sumit.indevs.in`**. The static admin page (on `sumit.indevs.in` or `admin.sumit.indevs.in`) calls that API with `credentials: "include"` — those origins must be in **`ALLOWED_ORIGINS`**.

---

## Troubleshooting: health / API errors

1. **Confirm the Worker URL** (in a browser or `curl`):
   - `https://admin-api.sumit.indevs.in/api/admin/health`  
   - Expected: `{"ok":true,"service":"portfolio-admin-api"}`  
   - If you get GitHub’s 404 page or HTML, **`admin-api` is not routed to this Worker** — check Worker → Domains and DNS (no `github.io` CNAME on `admin-api`).
2. **Fallback:** use your `*.workers.dev` URL from the Worker overview with the same path, e.g. `https://portfolio-admin-api.<you>.workers.dev/api/admin/health`. If that works but the custom domain does not, the issue is **custom domain / DNS**, not the script.
3. **`CONTENT_BASE_BRANCH`** missing in the Worker causes errors on **content** routes, not on `/health`.
4. After OAuth or CORS changes, hard-refresh the admin page or try an incognito window.

## Features

- **Projects (home):** inspector tabs **Titles** (homepage view labels) and **Homepage JSON** (Editor.js → `homepage-content` API target).
- **Projects / case studies lists:** loaded from public `data/projects.json` and `data/case_studies.json`; click any row to edit that record in the inspector (Editor.js) while the iframe shows the live detail page.
- **Case studies archive / About:** preview only in the iframe; static HTML note in the inspector.
- **Ribbon:** Login, Session, Refresh preview, Open live page, Insert (paragraph / heading / list / code), Reload, Save.
- **Preview strip:** embedded pages show a thin “Live preview · Admin workspace” bar (`admin-embed-bootstrap.js`).

## Draft vs live vs backups

1. **Save draft** — Writes JSON to the **draft branch** (`CONTENT_DRAFT_BRANCH`, default `content/drafts`). Safe to experiment.
2. **Publish to live** — Copies that file from draft → **GitHub Pages branch** (`CONTENT_BASE_BRANCH`). Before overwriting the live file, the Worker saves a **backup** under `data/_admin_backups/backup-{target}-{timestamp}.json` on the live branch (snapshot of the previous live file).
3. **Restore** — Picks a backup file and writes its `snapshotText` back to the original path on the **live** branch. Use if a publish went wrong.

**Note:** HTML pages are not generated by the editor here; the site reads `data/projects.json` (etc.). Publishing JSON updates what the live site loads after GitHub Pages rebuilds.

## Config

Edit the `window.__ADMIN_APP__` block at the top of `admin/index.html` if your production host or API base changes.

After GitHub OAuth, users land on `ADMIN_SUCCESS_REDIRECT` (default in `wrangler.toml`: `/admin/index.html`).

## Legacy

- `/dev/index.html` remains a lightweight JSON editor.
- Standalone `?admin_edit=1` on `homepage.html` still works **outside** the iframe; inside the admin preview iframe, the duplicate Phase A bar is suppressed so controls stay in the workspace.

## Deploying editor UI changes

1. Edit `assets/js/admin-app.js` and/or `admin/editor.html`.
2. **Bump the cache-buster** on the script tag in `admin/editor.html`:  
   `../assets/js/admin-app.js?v=YYYYMMDD-N`  
   so browsers load the new bundle (GitHub Pages caches aggressively).
3. Push to the branch GitHub Pages builds from; wait for the Pages deploy to finish.
4. Hard refresh the editor (`Ctrl+F5`) when testing.
5. After **Worker** API changes, run `wrangler deploy` from `cloudflare-worker/admin-api/`.

## Worker APIs (content)

- **`GET /api/admin/content/read`** — `target`, optional `slug`, `source` (`auto` | `draft` | `base`), optional **`ref`** (commit SHA) to load that revision of the JSON file.
- **`GET /api/admin/content/commits`** — `target` — lists recent commits touching the mapped file on the **draft** branch (for “Draft file history” in the editor).
