# Cloudflare Admin API Setup

Use this folder as your copy-paste/deploy source for Cloudflare Worker admin API.

## Main code file

- Worker code: `cloudflare-worker/admin-api/src/index.js`
- Wrangler config: `cloudflare-worker/admin-api/wrangler.toml`

## 1) Create GitHub OAuth App

In GitHub -> Settings -> Developer settings -> OAuth Apps:

- Homepage URL: `https://sumit-sc.github.io`
- Authorization callback URL:
  - `https://<your-worker-subdomain>.workers.dev/api/admin/auth/github/callback`

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

- `ALLOWED_GITHUB_USERS`
- `ALLOWED_ORIGINS`
- `GITHUB_REPO_OWNER`
- `GITHUB_REPO_NAME`
- `CONTENT_BASE_BRANCH`
- `CONTENT_DRAFT_BRANCH`
- `ADMIN_SUCCESS_REDIRECT`

## 4) Deploy Worker

```bash
wrangler deploy
```

## 5) Update editor API base

In `dev/index.html` set:

```js
window.__ADMIN_CONFIG__ = {
  apiBase: "https://<your-worker-subdomain>.workers.dev"
};
```

## 6) Test flow

1. Open `/dev/index.html`
2. Click `Login (GitHub)`
3. Check session
4. Load target + slug (for projects/caseStudies use an existing `id`)
5. Save Draft
6. Confirm updates in `content/drafts` branch on GitHub
