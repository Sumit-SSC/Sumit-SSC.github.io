# Content workflow (projects, case studies, images)

This is the **single “how to update the site” guide**: add/edit projects, case studies, images, and run optimization safely.

---

## Local preview (always do this first)

From `Sumit-SC.github.io/`:

```powershell
python -m http.server 8000
```

Open `http://localhost:8000`.

---

## Folder conventions (keep assets organized)

Use these paths so the site stays predictable and assets don’t become a pile:

### Project images

- **Thumbnails** (cards): `assets/images/thumbs/<some-id>.jpg` (or `.png`)
- **Project gallery / screenshots**: `assets/images/projects/<project-id>/<nn>.<ext>`

Example:

```
assets/images/projects/fraud-intelligence-and-risk-analytics/01.jpg
assets/images/projects/fraud-intelligence-and-risk-analytics/02.jpg
```

### Case study images

- **Case study visuals**: `assets/images/case_studies/<case-study-id>/<nn>.<ext>`

Example:

```
assets/images/case_studies/metric-gaming-goodharts-law/01.png
```

### What to reference in JSON/HTML

- In `data/projects.json` and case study HTML files, keep referencing the **original** images (PNG/JPG).
- The site is already wired to prefer optimized WebP copies under `assets/optimized-images/...` automatically.

So in JSON/HTML you keep:

- `assets/images/projects/<project-id>/01.jpg`

…and the frontend will use:

- `assets/optimized-images/projects/<project-id>/01.webp` (if it exists)

---

## Add / edit a project (the safe checklist)

1. **Update metadata** in `data/projects.json`
   - Required: `id`, `title`, `short_description`, `tools`, `category`, `date`, `thumbnail`, `featured`
   - Optional: `images[]`, links (`github_url`, `demo_url`, `streamlit_url`, `powerbi_embed_url`, etc.)

2. **Write the long-form content**
   - Recommended: use an HTML file and set `content_path`
     - Add `data/projects/<project-id>.html`
     - Set `"content_path": "data/projects/<project-id>.html"`
   - If you keep content inside JSON, use `full_description`, `problem_statement`, `approach`, `insights`, `media_notes`.

3. **Add images** under:
   - `assets/images/projects/<project-id>/...`
   - Update `thumbnail` and `images[]` paths in JSON.

4. **Preview locally**, click through:
   - `pages/homepage.html` → open the project card → check images + sections

---

## Fast project entry template (copy/paste)

Use `data/project-entry-template.json` as the baseline for new items in `data/projects.json`.

Editing flow for quickest updates:

1. Copy one object from `data/project-entry-template.json`.
2. Paste into `data/projects.json` array.
3. Update only these first:
   - `id`, `title`, `short_description`, `category`, `date`
   - `thumbnail`, `images[]`
   - one of `github_url` / `demo_url`
4. Keep heavy media links optional:
   - `video_url`, `powerbi_embed_url`, `streamlit_url`, `slide_pdf_path`

Note: project detail page now uses **tap-to-load** for PDF/video/Power BI/Streamlit embeds, so adding those links is safe for mobile performance.

---

## Add / edit a case study (the safe checklist)

1. **Update index metadata** in `data/case_studies.json`
   - Ensure `id` is unique and slug-style
   - Set `case_study_path` to `data/case_studies/<id>.html`

2. **Write the article body** in:
   - `data/case_studies/<id>.html`
   - Keep it as body content (no full HTML doc wrapper).

3. **Add images** under:
   - `assets/images/case_studies/<id>/...`
   - Reference them from the case study HTML as `assets/images/case_studies/<id>/01.png`

4. **Preview locally**:
   - `pages/case-study.html?id=<id>`

---

## Optimize images (WebP)

You have **two** supported optimizers. Pick one; both generate:

`assets/optimized-images/<same-relative-path>.webp`

### Option A (recommended): Python + Pillow

From `Sumit-SC.github.io/`:

```powershell
uv run --with pillow python scripts/optimize_images.py
```

- Skips `assets/images/optimized/` and `assets/images/icons*/`
- Re-running is safe; it skips existing `.webp`.

### Option B: Node + sharp

One-time setup:

```powershell
npm init -y
npm install sharp
```

Then run:

```powershell
node scripts/optimize-images.mjs
```

---

## Sanity checks before pushing

Run verification:

```powershell
./scripts/verify_portfolio.ps1
```

Then spot-check:

- `pages/homepage.html` (cards, filters, case studies toggle)
- `pages/project.html?id=...` (TOC, side panel, embeds)
- `pages/case-study.html?id=...` (article loads, images render)

---

## “Do / Don’t” quick rules

- **Do** keep IDs stable once shared (changing `id` breaks URLs).
- **Do** keep images in per-project/per-case-study folders.
- **Do** reference original PNG/JPG in content; let the optimizer produce WebP in `optimized/`.
- **Do** reference original PNG/JPG in content; let the optimizer produce WebP in `assets/optimized-images/`.
- **Don’t** use leading slashes in paths (use `assets/images/...`, not `/assets/images/...`).
- **Don’t** use Windows backslashes in JSON paths.

---

## Deeper reference docs

- Data schema/details: `data/DATA_GUIDE.md`
- Scripts: `scripts/README.md`
- Deploy/troubleshooting: `docs/DEPLOYMENT.md`, `docs/TROUBLESHOOTING.md`

