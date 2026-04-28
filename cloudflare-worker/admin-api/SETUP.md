# Cloudflare Admin API Setup

Use this folder as your copy-paste/deploy source for Cloudflare Worker admin API.

## Main code file

- Worker code: `cloudflare-worker/admin-api/src/index.js`
- Wrangler config: `cloudflare-worker/admin-api/wrangler.toml`

## 1) Create GitHub OAuth App

In GitHub -> Settings -> Developer settings -> OAuth Apps:

- Homepage URL: `https://event.sumit.indevs.in`
- Authorization callback URL:
  - `https://admin-api.sumit.indevs.in/api/admin/auth/github/callback`

## 2) Set Worker secrets

From `cloudflare-worker/admin-api/`:

```bash
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put GITHUB_TOKEN_FOR_CONTENT_WRITES
wrangler secret put SESSION_SIGNING_KEY
```

Notes:

- `GITHUB_TOKEN_FOR_CONTENT_WRITES` should be a fine-grained token with repo contents write for `Sumit-SC/Sumit-SC.github.io`.
- `SESSION_SIGNING_KEY` should be a long random string.

## 3) Verify `wrangler.toml` vars

Update if needed:

- `ALLOWED_GITHUB_USERS="Sumit-SC"`
- `ALLOWED_ORIGINS="https://event.sumit.indevs.in,https://sumit.indevs.in,https://www.sumit.indevs.in,http://127.0.0.1:5500,http://localhost:5500,http://localhost:8000"`
- `GITHUB_REPO_OWNER="Sumit-SC"`
- `GITHUB_REPO_NAME="Sumit-SC.github.io"`
- `CONTENT_BASE_BRANCH="feature/cf-admin-editor-foundation"`
- `CONTENT_DRAFT_BRANCH="content/drafts"`
- `ADMIN_SUCCESS_REDIRECT="https://event.sumit.indevs.in/admin/index.html"`

## 4) Deploy Worker

```bash
wrangler deploy
```

## 5) Update editor API base

In `admin/editor.html` set:

```js
window.__ADMIN_APP__ = {
  siteOrigin: window.location.origin,
  apiBase: "https://admin-api.sumit.indevs.in",
  pagesPrefix: "/pages/"
};
```

## 6) Test flow

1. Open `/admin/index.html` or `/admin/editor.html`
2. Click `Login (GitHub)`
3. Check session
4. Open a target from sidebar (or create from Create content form)
5. Save Draft
6. Upload image via `Upload Image (WebP)` button
7. Confirm updates in `content/drafts` branch on GitHub

## Notes on embeds and upload policy

- Embed blocks are validated server-side by allowlisted domains:
  - `gist.github.com`, `github.com`
  - `replit.com`
  - `streamlit.app`
  - `app.powerbi.com`
  - `nbviewer.org`
  - YouTube domains
- Image uploads are accepted only as `image/webp` Data URLs (client converts before upload).
- Uploaded path format is enforced:
  - `assets/images/projects/<slug>/<preset>-<slug>.webp`
