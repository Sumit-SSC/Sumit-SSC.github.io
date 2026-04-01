# Editor Build TODO

## Phase 1 - Foundation (in progress)

- [x] Create feature branch for editor foundation.
- [x] Add `/dev` editor route scaffold.
- [x] Add Editor.js starter with load/save/session hooks.
- [x] Define theme token contract for safe styling.
- [x] Add Cloudflare Worker API skeleton with endpoint contracts.
- [x] Add architecture doc for security + content flow.

## Phase 2 - Secure auth/session

- [ ] Implement GitHub OAuth callback endpoint in worker.
- [ ] Sign and verify admin session cookies (HMAC with `SESSION_SIGNING_KEY`).
- [ ] Add allowlist authorization by GitHub username.
- [ ] Add logout endpoint and session expiration handling.

## Phase 3 - Real content read/write

- [ ] Implement GitHub API read endpoint (`target` + `slug` mapping).
- [ ] Implement save endpoint to write JSON/HTML paths on draft branch.
- [ ] Add commit message conventions and actor metadata.
- [ ] Add PR auto-open option for review workflow.

## Phase 4 - Image pipeline

- [ ] Client-side convert PNG/JPG to webp with size presets.
- [ ] Upload endpoint with folder + naming normalization.
- [ ] Enforce `assets/images/projects/<slug>/` path policy.
- [ ] Add duplicate/version strategy (`-v2` or hash suffix).

## Phase 5 - Robust blocks and embeds

- [ ] Add rich text controls with token-based style settings.
- [ ] Add columns/section layout blocks.
- [ ] Add safe embed block with domain allowlist.
- [ ] Add collapsible notebook/code blocks.

## Phase 6 - Validation and deployment

- [ ] Add JSON schema validation in GitHub Actions.
- [ ] Add lint/check for bad paths and missing media references.
- [ ] Add preview checks for changed pages.
- [ ] Publish contributor/admin usage guide.
