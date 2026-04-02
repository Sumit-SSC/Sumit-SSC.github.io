# Editor Build TODO

## Phase 1 - Foundation (in progress)

- [x] Create feature branch for editor foundation.
- [x] Add `/dev` editor route scaffold.
- [x] Add Editor.js starter with load/save/session hooks.
- [x] Define theme token contract for safe styling.
- [x] Add Cloudflare Worker API skeleton with endpoint contracts.
- [x] Add architecture doc for security + content flow.

## Phase 2 - Secure auth/session

- [x] Implement GitHub OAuth callback endpoint in worker.
- [x] Sign and verify admin session cookies (HMAC with `SESSION_SIGNING_KEY`).
- [x] Add allowlist authorization by GitHub username.
- [x] Add logout endpoint and session expiration handling.

## Phase 3 - Real content read/write

- [x] Implement GitHub API read endpoint (`target` + `slug` mapping).
- [x] Implement save endpoint to write JSON/HTML paths on draft branch.
- [x] Add commit message conventions and actor metadata.
- [ ] Add PR auto-open option for review workflow.

## Phase 4 - Image pipeline

- [x] Client-side convert PNG/JPG to webp with size presets.
- [x] Upload endpoint with folder + naming normalization.
- [x] Enforce `assets/images/projects/<slug>/` path policy.
- [ ] Add duplicate/version strategy (`-v2` or hash suffix).

## Phase 5 - Robust blocks and embeds

- [ ] Add rich text controls with token-based style settings.
- [ ] Add columns/section layout blocks.
- [x] Add safe embed block with domain allowlist.
- [ ] Add collapsible notebook/code blocks.

## Phase A - Visual edit on real pages (in progress)

- [x] **`/admin/index.html` workspace:** sidebar navigation, iframe preview with `admin_embed=1`, ribbon + Editor.js inspector (projects / case studies / homepage tabs).
- [x] Homepage: `data/homepage-ui.json` + view title overrides (`featuredTitle`, `caseStudiesTitle`).
- [x] `?admin_edit=1` panel on `pages/homepage.html` + Worker `GET/POST /api/admin/homepage-ui` (optional; hidden in iframe when using `/admin/`).
- [x] `CONTENT_BASE_BRANCH` required via Worker env (no hardcoded branch fallback in code).
- [ ] About page + project list/detail visual bindings.
- [ ] Preview URL / publish merge button.

## Phase 6 - Validation and deployment

- [ ] Add JSON schema validation in GitHub Actions.
- [ ] Add lint/check for bad paths and missing media references.
- [ ] Add preview checks for changed pages.
- [ ] Publish contributor/admin usage guide.
