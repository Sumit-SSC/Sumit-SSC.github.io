# Data & Analytics Portfolio

**What this project is:** Static portfolio site (HTML/CSS/JS) for **Senior Data Analyst / Decision Scientist / Product Analyst** roles. Content from JSON + HTML under `data/`. Designed for GitHub Pages.

---

Minimal, fast portfolio aimed at **Senior Data Analyst / Decision Scientist / Product Analyst** roles.

- **Stack:** Pure HTML, CSS, vanilla JavaScript (no frameworks / build tools)
- **Content:** All projects and case studies come from JSON + small HTML fragments under `data/`
- **Hosting:** Designed for GitHub Pages (or any static host)

For detailed technical docs (data model, deployment, migration notes), see `docs/README.md`.

Visit [Mintify](https://github-22.mintlify.app/) Page for Setup guide & docs of the Portfolio Page Setup 


---

## Quick tour

- **Landing page:** `index.html` (Spectral-style hero, auto-redirects into the main portfolio)
- **Main portfolio dashboard:** `pages/homepage.html`
  - Featured projects
  - Projects grid + filters
  - Case-studies toggle
- **Other key pages (all under `pages/`):**
  - `about.html` — story, what you do, journey timeline
  - `skills.html` — skills & tools with icon grid
  - `resume.html` — resume + portfolio PDF toggles
  - `case-studies-archive.html` — index of long-form case studies
  - `project.html` / `case-study.html` — single project / case study views

---

## How to run locally

From the repo root:

```bash
python -m http.server 8000
# Then visit http://localhost:8000
```

Or use any static server / VS Code “Live Server” equivalent.

---

## Adding or editing projects

- **Project metadata & links:** `data/projects.json`
- **Long-form project writeups:** `data/projects/<project-id>.html`
- **Case studies:** `data/case_studies.json` + `data/case_studies/<id>.html`

The UI (dashboard + detail pages) is rendered dynamically from these files.  
For full field definitions and examples, see `data/README.md`.

For the full end-to-end editing flow (where to put images, how to optimize them, and the safest update checklist), see:

- `docs/CONTENT_WORKFLOW.md`

---

## Helpful scripts

See `scripts/README.md` for full details. The most important ones:

- **Verify portfolio content & links**

  ```powershell
  ./scripts/verify_portfolio.ps1
  ```

  Runs a set of checks against your pages (nav, social links, contact form setup, etc.).

- **Optimize images to WebP (using uv + Pillow)**

  ```powershell
  uv run --with pillow python scripts/optimize_images.py
  ```

  This:
  - Scans `assets/images/`
  - Writes optimized WebP copies to `assets/images/optimized/...`
  - The frontend prefers these WebP versions automatically with PNG/JPG fallback

---

## Where to find deeper docs

- **Docs index:** `docs/README.md`
- **Deployment (GitHub Pages):** `docs/DEPLOYMENT.md`
- **Current status & remaining work:** `docs/TODO.md`, `docs/PENDING_WORK_SUMMARY.md`
- **Design / component notes:** `docs/COMPONENT_SYSTEM.md`, `docs/MODERN_REBUILD_PLAN.md`
- **Editor architecture + TODO:** `docs/EDITOR_CLOUDFLARE_ARCHITECTURE.md`, `docs/EDITOR_TODO.md`

These files collect all the technical detail so this top-level README stays focused on “how to use and run the site”.

---

## Design & UX highlights

- Clean, professional aesthetic tuned for analytics/ML roles
- Light/dark mode with accent theming
- Responsive layouts for desktop and mobile
- Rich media support: image galleries, notebooks (via nbviewer), Streamlit, Power BI, PDFs, downloads

Test in any modern browser (Chrome, Edge, Firefox, Safari); everything is plain HTML/CSS/JS, no special tooling required to view the site.

---

## Admin editor workspace

- Primary editor routes are `admin/index.html` and `admin/editor.html`.
- The workspace is backed by Cloudflare Worker admin API (`admin-api.sumit.indevs.in`) for OAuth/session/save/publish.
- Keep `docs/ADMIN_WORKSPACE.md` and `cloudflare-worker/admin-api/SETUP.md` as the canonical setup references.
