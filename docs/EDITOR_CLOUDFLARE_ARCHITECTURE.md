# Editor + Cloudflare Architecture (Phase Plan)

This document is the implementation baseline for a secure `/admin` editor on top of a static site.

## Why this architecture

- Keep portfolio delivery static and fast.
- Keep auth/write secrets off the client.
- Maintain auditability by writing content into Git (JSON + HTML content files).
- Preserve existing page rendering while adding richer editing UX.

## Core stack

- Frontend: `admin/index.html` + `admin/editor.html` + `assets/js/admin-app.js`
- Backend: `cloudflare-worker/admin-api` (OAuth/session/content write/upload)
- Content source of truth: `data/*.json` and `data/*/*.html`
- Deploy/build: GitHub Actions (validate + optional regenerate)

## Security model

- OAuth on server side (Cloudflare Worker), no GitHub secrets in browser.
- HttpOnly secure session cookie for admin session.
- Allowlist by GitHub username (`ALLOWED_GITHUB_USERS`).
- Restrict writable paths to:
  - `data/projects.json`
  - `data/case_studies.json`
  - `data/projects/*.html`
  - `data/case_studies/*.html`
  - `assets/images/projects/**`
- Save to `content/drafts` first (PR flow), then merge to your live GitHub Pages branch (e.g. `feature/cf-admin-editor-foundation`).

## Content model and style control

- Admin edits structured blocks (Editor.js JSON).
- Styling is controlled through theme tokens (`data/editor-theme-tokens.json`).
- No arbitrary CSS injection from editor payload.
- Server validates:
  - allowed block types
  - allowed token values
  - slug + path rules

## Image upload conventions

- Project media path:
  - `assets/images/projects/<slug>/`
- Naming:
  - `thumbnail-<slug>.webp`
  - `banner-<slug>.webp`
  - `hero-<slug>.webp`
  - `inline-<slug>.webp`
- Compression:
  - client: convert/resize before upload
  - worker: verify type/size/path and enforce final `.webp`

## Embed support plan

Supported by block type + sanitizer allowlist:

- GitHub Gist embed
- Streamlit embed
- Power BI embed
- Replit embed
- Notebook embed (nbviewer)
- Collapsible code section block

For security, iframe embeds use a domain allowlist and sandbox attributes.

## Short roadmap

1. Implement OAuth callback + session signing in worker.
2. Implement GitHub read/write integration for real JSON updates.
3. Add image upload pathing + webp conversion pipeline.
4. Map editor blocks to existing project/case-study HTML sections.
5. Add schema validation in CI and auto-check PR workflow.
