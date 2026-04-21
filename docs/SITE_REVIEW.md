# Site Review – Sumit-SC.github.io

Summary of structure, linking, theme behavior, missing pieces, and suggested improvements.

---

## 1. Directory & File Structure

### Root HTML (main site)
| File | Purpose |
|------|--------|
| **index.html** | Spectral landing page – first impression, links to all main pages |
| **homepage.html** | Main projects grid (Tailwind, theme, search, filters) – primary “Projects” entry |
| **project.html** | Single project detail (reads `?id=` from `data/projects.json`) |
| **about.html** | About Me (Tailwind, theme) |
| **resume.html** | Resume + PDF embed (Tailwind, theme) |
| **skills.html** | Skills page (Tailwind, theme) |
| **contact.html** | Contact / Connect (Tailwind, theme, form, GitHub widget) |
| **socialhandles.html** | Social links (Tailwind) |
| **projects.html** | Older projects list (custom CSS `style.css`, no Tailwind/theme) – alternate projects view |

### Data & content
- **data/projects.json** – Single source for project metadata (ids, titles, thumbnails, case study paths, etc.).
- **data/case_studies/*.html** – One HTML fragment per project (e.g. `ai-governance-workbench.html`).

### Assets
- **assets/css/** – `custom.css` (theme variables, Tailwind overrides), `style.css` (projects.html), `index.css` (Spectral), others.
- **assets/js/** – `main.js` (theme, routing, project rendering, used by homepage/project and others), `homepage.js`, `indexMain.js`, etc.
- **assets/images/** – Thumbs, fulls, placeholders; paths in `projects.json` point here.

### Other
- **archive/legacy/** – Old demos (about-demo, material UI, navbar, page2).
- **docs/** – Setup/migration docs, Giscus, troubleshooting; **docs/projects-legacy/** – Old project HTML (reference only).
- **archive/_backup_old_portfolio/** – Full backup; not used by live site.

---

## 2. Linking Overview

### Entry points
- **index.html** – “Portfolio” brand; menu: Projects → homepage.html, Resume, Skills, About Me, Contact, Social Handles.
- **homepage.html** – Brand → index.html; nav: Home (index), Resume, About Me, Connect With Me (contact). **Missing in nav:** Skills.

### Nav consistency (Tailwind pages)
- **homepage.html**: Home, Resume, About Me, Connect With Me — **no Skills**.
- **project.html**: Projects (homepage), About, Resume, Contact — **no Skills**.
- **about.html**: Back to Homepage; in-page: Intro, What I Do, Who I Am, My Work, Journey, Resume — **no Skills**.
- **resume.html**, **skills.html**, **contact.html**: Projects, About, Resume, Skills (or Contact) — **full set**.

So: **Skills is missing from homepage, project, and about.**

### Project detail links
- **homepage.html** and **resume.html** (and main.js-driven views) link to `project.html?id=<id>`.
- **projects.json** `id` values (e.g. `ai-governance-workbench`) must match `project.html?id=` and case study filenames.

### Broken / legacy references (safe to ignore for main site)
- **docs/projects-legacy/** and **archive/_backup_old_portfolio/** reference `profile.html`, which does not exist at root. Those are legacy; no fix needed unless you restore a profile page.

### projects.html (old stack)
- Nav: Home (index), Projects (self), About, Contact (mailto only).
- **Missing:** Resume, Skills, Contact page (contact.html), and any link to the new projects experience (homepage.html). Project cards are rendered by **main.js** (if it runs on this page) and do link to `project.html?id=` where applicable.

---

## 3. Theme & Dark Mode

### Working (Tailwind + custom.css + main.js)
- **homepage.html**, **project.html**, **about.html**, **contact.html**, **resume.html**, **skills.html**, **socialhandles.html** use Tailwind, load `custom.css`, and (where applicable) `main.js` for:
  - Light/dark toggle and `data-color-theme` (e.g. theme-purple, theme-blue).
  - Scroll progress bar, primary/accent buttons, borders, text.

### Not using dynamic theme
- **index.html** – Spectral layout and `index.css`; no Tailwind theme or `data-color-theme`. Looks static.
- **projects.html** – Uses `style.css` only; no Tailwind, no theme script.

### Partial
- **contact.html** – Hero uses a **hard-coded gradient** (`#667eea`, `#764ba2`, `#f093fb`), so it does not follow the selected theme color. Fix: use a class that uses `var(--accent-primary)` (and optional accent) in `custom.css` so the hero gradient respects the theme.

---

## 4. Missing / Gaps

| Item | Where | Suggestion |
|------|--------|------------|
| **Skills in nav** | homepage, project, about | Add “Skills” link to `skills.html` in the nav of these pages. |
| **Contact hero gradient** | contact.html | Replace inline gradient with a theme-aware class (e.g. `contact-hero-bg` in custom.css using `var(--accent-primary)`). |
| **projects.html nav** | projects.html | Add links to resume.html, skills.html, contact.html; optionally “New projects” → homepage.html. |
| **profile.html** | Referenced in legacy/backup | Not in root; only fix if you reintroduce a profile page. |
| **index.html theme** | index.html | Optional: add a small script + CSS variables so Spectral respects a theme (e.g. accent color). |

---

## 5. Improvements Done in This Pass

1. **Skills link** added to nav on homepage.html, project.html, and about.html.
2. **contact.html hero** gradient replaced with theme-aware class; keyframes and `.contact-hero-bg` added to custom.css.
3. **projects.html** nav updated with Resume, Skills, and Contact page links; “Home” kept to index; optional link to homepage.html as main projects experience.

---

## 6. Optional Next Steps

- **Unify “Home”:** Some pages use “Home” → index.html, others “Homepage” → homepage.html. Decide one convention and align labels/links.
- **index.html:** Add theme script + `data-color-theme` and use CSS variables for Spectral accent so the landing page matches the rest of the site.
- **projects.html vs homepage.html:** Either redirect projects.html to homepage.html or add a clear “View all projects (new)” link so users don’t stay on the old layout only.
- **Mobile nav:** Ensure all new nav items (Skills, etc.) appear in any mobile menu on homepage, project, and about.
- **404 / CNAME:** If using a custom domain (CNAME), add a custom 404 that links back to index.html or homepage.html.

---

## 7. Quick Reference – Main User Paths

1. **Landing:** index.html → “Portfolio” or “Projects” → homepage.html.
2. **Projects:** homepage.html (search/filter) → card click → project.html?id=...
3. **About / Resume / Skills / Contact:** From index menu or from any Tailwind nav; ensure Skills is present everywhere for consistency.
4. **Old projects list:** projects.html (optional entry); should link to resume, skills, contact, and optionally homepage.html.

This document can be updated as you add pages or change navigation.
