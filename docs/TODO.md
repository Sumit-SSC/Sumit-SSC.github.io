# Portfolio Website – TODO List

## ✅ STATUS: READY FOR DEPLOYMENT

Core site work is complete. The portfolio is ready to deploy. Contact form uses a `mailto:` flow (or Formspree if configured), so no external backend is required for basic use.

---

## ✅ COMPLETED ITEMS

### Site structure & UX
1. **Social buttons** – Top and bottom social icons standardized across pages.
2. **Project page – tools clickable** – Tool badges route to dashboard with filter (e.g. `../index.html?filter=...`).
3. **Resume in navigation** – Resume link present in nav on all pages.
4. **Project page – Medium-style layout** – Left TOC, sticky nav, scroll-to-section.
5. **About page – transitions** – Big Picture–style transitions, slide-in, parallax.
6. **Theme system** – Dark/light theme and color palette applied consistently.
7. **Root refactor** – Only `index.html` and `README.md` at root; other HTML under `pages/`; docs under `docs/`.

### Projects section
8. **4 icon buttons on every project card** – GitHub, Streamlit, Notebook, More show on every card; missing URLs render as greyed/disabled.
9. **Featured project pages (~3k–5k words)** – All 4 flagship HTML pages expanded to the full 13-section structure (Executive Summary, Business Context, Data Landscape, Metrics/KPIs, Analytical Approach, AI/Automation, Observations, Trade-offs, Business Impact, Recommendations, Limitations, Future Scope, Related Work, Conclusion).
10. **Same 4-button row everywhere** – Featured grid and “All projects” list both use the same button row.

---

## 📋 DEPLOYMENT CHECKLIST (USER VERIFICATION)

Run from repo root or after opening the site locally (e.g. `python -m http.server 8000`).

- [ ] Open **`index.html`** (main dashboard) and **`pages/homepage.html`** (alias); verify layout and links.
- [ ] Open **`pages/project.html?id=ai-governance-workbench`** (and other featured IDs); verify TOC, sections, and embeds.
- [ ] Verify **theme toggle** and palette on multiple pages.
- [ ] Test **contact flow** from **`pages/contact.html`** (mailto or Formspree).
- [ ] Confirm **images and embeds** load (thumbnails, Power BI, Streamlit links where set).
- [ ] Optional: run **`./scripts/verify_portfolio.ps1`** (PowerShell) for automated checks.

---

## 📌 REMAINING (OPTIONAL)

See **`docs/PROJECTS_TODO.md`** for full detail.
For active rehaul execution plan, see **`docs/REHAUL_MILESTONE_BACKLOG.md`**.

| Task | Priority | Status |
|------|----------|--------|
| **Fill URLs for non-featured projects** | Medium | **Done** – Added `notebook_url` and `media_notes` where missing; oil-spill has GitHub + notebook links; used-car has full links. You can add more real URLs in `data/projects.json` as they become available. |
| **Expand non-featured JSON content** | Low | **Done** – All 15 non-featured projects now have expanded `full_description`, `problem_statement`, `approach`, and `insights` (~1–1.5k words total each) in business-first style. |
| **Optional HTML long-form for non-featured** | Low | Optional – Add `data/projects/<id>.html` and `content_path` for any non-featured project you want as a long case study. |
| **Thumbnails and images** | Low | **Done** – All projects have `thumbnail` and `images[]` set. |

---

**Last updated:** 2026-05  
**Status:** ✅ Ready for deployment
