# Complete Setup: Cloudflare + GitHub OAuth + Secrets

This guide is the full end-to-end setup for your editor backend using:

- Site domain: `https://event.sumit.indevs.in`
- Admin API domain: `https://admin-api.sumit.indevs.in`
- Worker code: `cloudflare-worker/admin-api/src/index.js`

---

## 0) Prerequisites

You need:

- Cloudflare account with your `indevs.in` zone connected
- GitHub account with access to `Sumit-SC/Sumit-SC.github.io`
- The branch with editor code already pushed (`feature/cf-admin-editor-foundation`)

---

## 1) Deploy Worker in Cloudflare (Dashboard way)

1. Go to **Cloudflare Dashboard** -> **Workers & Pages**.
2. Click **Create application** -> **Create Worker**.
3. Name it (example): `portfolio-admin-api`.
4. Open the Worker editor.
5. Replace default code with content from:
   - `cloudflare-worker/admin-api/src/index.js`
6. Click **Deploy**.

You now have a workers.dev URL (temporary), but we will use custom domain next.

---

## 2) Attach custom domain to Worker

**Important:** **`admin-api.sumit.indevs.in`** must route to **this Worker**, not to GitHub Pages. Do **not** create a DNS record that points `admin-api` at `Sumit-SC.github.io`. (The optional **`admin`** subdomain is the one that points at GitHub — see §2b.)

1. Open your Worker -> **Settings** -> **Domains & Routes** (or **Triggers** → **Custom Domains**, depending on UI).
2. Add custom domain:
   - `admin-api.sumit.indevs.in`
3. Save and let Cloudflare create/verify DNS (it usually adds the correct proxy/route for you).

After this, your Worker must be reachable at:

- `https://admin-api.sumit.indevs.in/api/admin/health`

Expected response:

```json
{"ok":true,"service":"portfolio-admin-api"}
```

---

## 2b) DNS: `admin.sumit.indevs.in` → GitHub Pages (optional)

Use this if you want the admin workspace at **`https://admin.sumit.indevs.in/`** instead of only **`https://sumit.indevs.in/admin/`**.

1. In Cloudflare **DNS** for the zone that owns **`sumit.indevs.in`**, add:
   - **Type:** CNAME  
   - **Name:** `admin`  
   - **Target:** `Sumit-SC.github.io`  
2. Prefer **DNS only (grey cloud)** first so GitHub can issue HTTPS; or use **Proxied** with SSL mode **Full**.
3. After propagation, GitHub Pages will serve the same repo; root `index.html` redirects `admin.sumit.indevs.in` → `/admin/index.html`.

Full checklist: **`docs/ADMIN_WORKSPACE.md`** (Cloudflare + GitHub + Worker `ALLOWED_ORIGINS`).

---

## 3) Add Worker environment variables (non-secret)

Worker -> **Settings** -> **Variables** -> **Environment Variables**

Add:

- `ALLOWED_GITHUB_USERS` = `Sumit-SC`
- `ALLOWED_ORIGINS` = include at least: `https://event.sumit.indevs.in,https://sumit.indevs.in,https://www.sumit.indevs.in,https://admin.sumit.indevs.in` (plus localhost origins if you test locally — see `wrangler.toml`)
- `CONTENT_BASE_BRANCH` = **your GitHub Pages source branch** (example: `feature/cf-admin-editor-foundation`).  
  **Required:** the Worker code no longer guesses a default; if this is missing, read/save will error. Change only this variable when you switch Pages branch—no code change needed.
- `CONTENT_DRAFT_BRANCH` = `content/drafts`
- `GITHUB_REPO_OWNER` = `Sumit-SC`
- `GITHUB_REPO_NAME` = `Sumit-SC.github.io`
- `GITHUB_OAUTH_SCOPES` = `read:user`
- `ADMIN_SUCCESS_REDIRECT` = `https://event.sumit.indevs.in/admin/index.html` (where users return after GitHub OAuth)

Save changes.

---

## 4) Create GitHub OAuth app

GitHub -> **Settings** -> **Developer settings** -> **OAuth Apps** -> **New OAuth App**

Set:

- **Application name**: `Portfolio Admin Editor` (or any name)
- **Homepage URL**: `https://event.sumit.indevs.in`
- **Authorization callback URL**:
  - `https://admin-api.sumit.indevs.in/api/admin/auth/github/callback`

Create app.

Now copy:

- Client ID
- Client Secret (generate if needed)

---

## 5) Create GitHub token for content writes

GitHub -> **Settings** -> **Developer settings** -> **Personal access tokens** -> **Fine-grained tokens** -> **Generate new token**

Recommended:

- Token name: `portfolio-admin-content-write`
- Repository access: **Only selected repositories**
  - `Sumit-SC/Sumit-SC.github.io`
- Permissions:
  - **Contents: Read and write**

Generate and copy token value.

---

## 6) Generate session signing key

Use any long random value.

Example (Python):

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Copy output.

---

## 7) Add Worker secrets (private values)

Worker -> **Settings** -> **Variables** -> **Secrets**

Add:

- `GITHUB_CLIENT_ID` = `<from OAuth app>`
- `GITHUB_CLIENT_SECRET` = `<from OAuth app>`
- `GITHUB_TOKEN_FOR_CONTENT_WRITES` = `<fine-grained token>`
- `SESSION_SIGNING_KEY` = `<random string>`

Save changes and redeploy if prompted.

---

## 8) Point frontend `/dev` to your API domain

In:

- `dev/index.html`

Ensure config is:

```html
<script>
  window.__ADMIN_CONFIG__ = {
    apiBase: "https://admin-api.sumit.indevs.in"
  };
</script>
```

Push/deploy this frontend change to your site branch.

---

## 8b) Admin workspace (recommended)

After Worker is deployed and secrets/vars are set:

1. Add `https://admin.sumit.indevs.in` to **`ALLOWED_ORIGINS`** (see `wrangler.toml`) and redeploy the Worker if needed.
2. Open **`https://event.sumit.indevs.in/admin/index.html`** (or **`https://admin.sumit.indevs.in/`** if you keep that optional host).
3. Use **Login** in the ribbon, then pick pages from the sidebar and edit in the right-hand inspector (titles + Editor.js). The center panel is a live iframe; you do not type `?admin_edit=1` yourself.

See `docs/ADMIN_WORKSPACE.md` and `docs/PHASE_A_VISUAL_EDIT.md`.

### Optional: standalone homepage bar

1. Visit `https://sumit.indevs.in/pages/homepage.html?admin_edit=1` (adjust host if needed).
2. Log in via `/dev/index.html` first if needed.
3. Same draft branch and merge flow for `data/homepage-ui.json`.

## 9) End-to-end test checklist

1. Open `https://sumit.indevs.in/dev/index.html`
2. Click **Login (GitHub)**.
3. Authorize and return to `/dev`.
4. Click **Check Session** (should show active).
5. Choose target + slug and click **Load**.
6. Edit and click **Save Draft**.
7. Upload image via **Upload Image (WebP)**.
8. Verify commits in GitHub branch:
   - `content/drafts`

---

## 10) Troubleshooting quick map

- **OAuth callback mismatch**:
  - Callback URL in GitHub OAuth app must exactly match:
    - `https://admin-api.sumit.indevs.in/api/admin/auth/github/callback`
- **CORS/session issues**:
  - Check `ALLOWED_ORIGINS` includes exact frontend origin.
- **Unauthorized on save**:
  - Confirm `ALLOWED_GITHUB_USERS` includes your GitHub username exactly.
- **Write fails**:
  - Confirm fine-grained token has `Contents: Read and write` on the correct repo.
- **Custom domain not reaching Worker**:
  - Recheck Worker route/domain mapping and DNS status in Cloudflare.

---

## 11) Security notes

- Never expose `GITHUB_CLIENT_SECRET` or write token in frontend code.
- Keep all secrets only in Cloudflare Worker secrets.
- Use `content/drafts` branch for editorial workflow before merging to `feature/cf-admin-editor-foundation` (or your live GitHub Pages branch).
