# Data & Analytics Portfolio

**What this project is:** Static portfolio site (HTML/CSS/JS) for **Senior Data Analyst / Decision Scientist / Product Analyst** roles. Content from JSON + HTML under `data/`. Designed for GitHub Pages.

---

Minimal, fast portfolio aimed at **Senior Data Analyst / Decision Scientist / Product Analyst** roles.

- **Stack:** Pure HTML, CSS, vanilla JavaScript (no frameworks / build tools)
- **Content:** All projects and case studies come from JSON + small HTML fragments under `data/`
- **Hosting:** Designed for GitHub Pages (or any static host)

For detailed technical docs (data model, deployment, migration notes), see `docs/README.md`.

---

## 🚀 Quick Start

For detailed step-by-step customization, hosting, and layout configurations, please view our full guide.

<br>

<table>
  <tr>
    <td bgcolor="#000000" align="center" style="border-radius: 4px; padding: 8px 16px; border: 1px solid #1c1c1e;">
      <a href="https://github-22.mintlify.app/" target="_blank" style="text-decoration: none; color: #FFFFFF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCAxOSAxOSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTguMzY3IDcuMjg4ODhWMS41OTc1NUMxOC4zNjcgMC45ODY4MTkgMTcuODcxNSAwLjUgMTcuMjY5OSAwLjVIMTEuNTgxMkMxMC42ODc3IDAuNSA5LjgwMjk1IDAuNjc3MDE4IDguOTgwMTcgMS4wMTMzNkM4LjE1NzM4IDEuMzU4NTYgNy40MDUzOSAxLjg1NDI0IDYuNzc3MjQgMi40OTE1Mkw2LjczMyAyLjUzNTc4QzUuOTAxMzcgMy4zNzY2NCA1LjMwODYyIDQuNDIxMDggNS4wMDc4MSA1LjU3MTc0QzUuNTQ3NDkgNS40MzAxMiA2LjEwNDgzIDUuMzU5MzEgNi42NjIyIDUuMzUwNDZDOC4xNDg1MiA1LjMzMjc2IDkuNjA4MzEgNS44MTA3MyAxMC43OTM4IDYuNzA0N0MxMS44NjQzIDcuNTAxMzEgMTIuNjc4MyA4LjU5ODg1IDEzLjEyMDYgOS44NjQ1OEMxMy41ODA3IDExLjE0OCAxMy42MzM3IDEyLjU0NjUgMTMuMjg4NyAxMy44NjUzQzE0LjQzIDEzLjU2NDQgMTUuNDgyOCAxMi45NzE0IDE2LjMyMzMgMTIuMTM5M0wxNi4zNjc1IDEyLjA5NTFDMTYuOTk1NyAxMS40NjY3IDE3LjQ5OTkgMTAuNzE0MyAxNy44NDUgOS44OTExNEMxOC4xOSA5LjA2Nzk3IDE4LjM1ODEgOC4xODI4NSAxOC4zNTgxIDcuMjg4ODhIMTemplate7IiBmaWxsPSIjMThFMjk5Ii8+PHBhdGggZD0iTTQuODM3OTMgNy4xOTNDNC44NDY3NCA1LjQ0NzA2IDUuNTQzMDMgMy43NzE2NyA2Ljc2ODE0IDIuNTE5NTNMMi4wMzUxMSA3LjI1NDcyQzIuMDE3NDkgNy4yNzIzNiAxLjk5OTg1IDcuMjgxMTcgMS45ODIyMiA3LjI5ODgxQzAuODI3NjE1IDguNDQ1MTMgMC4xMzEzNDIgOS45Nzk0NSAwLjAxNjc2MjMgMTEuNjAxOUMtMC4wODkwMDMzIDEzLjExODYgMC4zMDc2MDkgMTQuNjE3NiAxLjE1MzczIDE1Ljg2OThDMS4yMzQ0NCAxNS45ODkyIDEuNDUzNDMgMTYuMDI4NSAxLjU3NjgyIDE1LjkxMzlMNC40NzY1NiAxMy4wMjE2QzUuMzg0MzggMTIuMTEzNCA1LjY2NjQzIDEwLjc2NDIgNS4yMzQ1NSA5LjU1NjE4QzQuOTYxMzIgOC44MDY2NiA0LjgyOTEyIDguMDA0MjQgNC44Mzc5MyA3LjE5M1oiIGZpbGw9IiMwQzhDNUUiLz48cGF0aCBkPSJNMTYuMzQxIDEyLjA5MzhDMTUuNDMzMiAxMi45ODQ0IDE0LjI5NjIgMTMuNjAxNiAxMy4wNjIzIDEzLjg3NTBDMTEuODE5NSAxNC4xNDgzIDEwLjUzMjcgMTQuMDY4OSA5LjMzNDA1IDEzLjY0NTdDOS4zMzQwNSAxMy42NDU3IDkuMzI1MjIgMTMuNjQ1NyA5LjMxNjQxIDEzLjY0NTdDOC4xMDg5MiAxMy4yMTM2IDYuNzYwNDIgMTMuNDk1OCA1Ljg1MjYgMTQuMzk1MkwyLjk1MjgyIDE3LjI4NzVDMi44Mjk0MyAxNy40MTA5IDIuODQ3MDYgMTcuNjEzNyAyLjk5Njg5IDE3LjcxMDdDNC4yNDg0NSAxOC41NDg0IDUuNzQ2ODMgMTguOTU0IDcuMjYyODEgMTguODQ4MkM4Ljg4NDU1IDE4LjczMzYgMTAuNDA5MyAxOC4wMzcgMTEuNTYzOSAxNi44ODE4TDExLjYwOCAxNi44Mzc4TDE2LjM0MSAxMi4xMDI2VjEyLjA5MzhaIiBmaWxsPSIjMEM4QzVFIi8+PC9zdmc+" width="24" height="24" alt="Mintlify Logo" style="vertical-align: middle;" />
  <b style="color: #18E299; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 16px; margin-left: 4px; vertical-align: middle;">Visit Mintlify Page for Setup Guide & Docs</b>
        <span>SETUP GUIDE & DOCS</span>
        <span style="color: #15F4EE; font-weight: 800;">➔</span>
      </a>
    </td>
  </tr>
</table>

## 🚀 Quick Start

For detailed step-by-step customization, hosting, and layout configurations, please view our full guide.

<a href="https://github-22.mintlify.app" target="_blank" style="text-decoration: none;">
  <img src="https://simpleicons.org/icons/mintlify.svg" width="20" height="20" style="vertical-align: middle; filter: invert(79%) sepia(82%) saturate(985%) hue-rotate(124deg) brightness(101%) contrast(101%);" alt="Mintlify Logo" /> 
  <b style="color: #15F4EE; vertical-align: middle; margin-left: 6px;">Visit Mintlify Page for Setup Guide & Docs</b>
</a>



---
# Visit [Mintify](https://github-22.mintlify.app/) Page for Setup guide & docs of the Portfolio Page Setup 


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
