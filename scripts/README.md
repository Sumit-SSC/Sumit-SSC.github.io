# Scripts

Run scripts from the **project root** (e.g. `powershell -ExecutionPolicy Bypass -File scripts/verify_portfolio.ps1`).

## verify_portfolio.ps1

Checks pages and assets for common issues: social buttons in header/footer, project page layout, tools clickability, Resume in nav, about-page transitions, Formspree on contact form. Paths are updated for the current layout (root `index.html`, other pages under `pages/`).

```powershell
./scripts/verify_portfolio.ps1
```

## download-skill-icons.ps1

Downloads all skill icons from CDN to `assets/images/icons/` so the site can load them **locally**. This gives you:

- **Faster loading**: Same-origin requests (no extra DNS or connections to external CDNs).
- **Reliability**: Icons keep working if external links are moved or taken down.
- **Backup**: All icons live in your repo.

**Run once** (from project root, using PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/download-skill-icons.ps1
```

Icon URLs are read from `data/skill_icon_urls.json`. After running, the skills page will load icons from `assets/images/icons/` first and fall back to the CDN URL if a local file is missing.

## build_skill_icon_assets.py

Builds optimized local icon assets + manifest for skills page local-first loading.

- Reads CDN backup links from `data/skill_icon_urls.json`
- Converts local raster icons into `assets/images/icons-webp/`
- Writes `data/skill_icon_asset_manifest.json` with `localPreferred`, `localFallback`, and `cdn`

Run:

```powershell
python scripts/build_skill_icon_assets.py
```

## optimize_images.py (image → WebP optimizer)

Converts all PNG/JPG images under `assets/images/` into optimized **WebP** copies under `assets/optimized-images/…`.  
The frontend is already wired to prefer these WebP versions (via `<picture>` + `getOptimizedImagePath()`), falling back to the original PNG/JPG if needed.

- **What it does**
  - Scans `assets/images` (skips `assets/images/optimized` and some unreadable placeholder/icon copies).
  - For each `.png/.jpg/.jpeg`:
    - Creates `/assets/optimized-images/<same-relative-path>.webp`
    - Thumbnails (paths containing `thumb`/`thumbnail`): smaller size, stronger compression.
    - Larger project/gallery images: higher quality, resized only if extremely wide.

- **Recommended way to run (using uv – no manual venv):**

```powershell
cd W:\CodeBase\Resume-Projects\Sumit-SC.github.io
uv run --with pillow python scripts/optimize_images.py
```

- **Notes**
  - Always keep linking to the **original** paths in JSON/HTML (e.g. `assets/images/thumbs/01.jpg`); the JS helper automatically derives the optimized WebP path.
  - You can re-run this script any time after adding new images; existing WebPs are skipped.

## audit_images.py (report missing / unused images)

Scans your JSON/HTML/CSS for `assets/images/...` references and reports:

- Missing referenced files (broken paths)
- Unreferenced originals (cleanup candidates)
- Top-level “loose” images under `assets/images/` (often used for site-wide backgrounds)

Run:

```powershell
python scripts/audit_images.py
```

## validate_content.py (pre-deploy content validator)

Checks project/case-study data integrity before push:

- required fields in `data/projects.json` and `data/case_studies.json`
- duplicate IDs
- missing local file references (`thumbnail`, `images[]`, `content_path`, `case_study_path`, etc.)

Run:

```powershell
python scripts/validate_content.py
```

Expected output:

- `[OK] Content validation passed for projects and case studies.`

## new_project_scaffold.py (fast project starter)

Creates:

- `data/projects/<id>.html` section template (`overview/problem/approach/insights/media`)
- `assets/images/projects/<id>/` folder
- prints a ready JSON object to paste into `data/projects.json`

Run:

```powershell
python scripts/new_project_scaffold.py --title "My New Project"
```

Optional explicit slug:

```powershell
python scripts/new_project_scaffold.py --id my-new-project --title "My New Project"
```
