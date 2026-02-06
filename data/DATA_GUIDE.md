# Data guide: Projects & Case Studies

This guide explains how to fill **`projects.json`** and **`case_studies.json`** so you can add, edit, or remove entries without breaking the site. Use the sample files as reference: **`sample_project.json`** and **`sample_case_study.json`**.

---

## Content strategy: HTML vs JSON

| | **Case studies** | **Projects (current)** |
|---|------------------|-------------------------|
| **Metadata** | `case_studies.json` (id, title, category, path, thumbnail, etc.) | `projects.json` (id, title, category, thumbnail, links, etc.) |
| **Long-form content** | **HTML files** in `data/case_studies/*.html` | **HTML strings inside JSON** (full_description, problem_statement, approach, insights, media_notes) |

**Why HTML files are better for content (and for the future):**

1. **Easier to edit** — Edit real HTML in an editor with syntax highlighting and preview, not escaped strings inside JSON.
2. **Smaller, cleaner JSON** — Metadata stays short; no giant HTML blobs. Easier to add/remove/reorder projects.
3. **Same pattern everywhere** — Case studies and projects both use: *metadata in JSON, content in HTML*.
4. **Version control** — Diffs are readable; fewer merge conflicts than one huge JSON file.
5. **Future-proof** — Easier to plug in Markdown, a CMS, or static generation later.

**Recommendation:** Prefer **HTML files for project content** when you can. The site supports both:
- **JSON-only (current):** Keep using `full_description`, `problem_statement`, `approach`, `insights`, `media_notes` inside `projects.json`.
- **HTML content (optional):** Add a `content_path` (e.g. `data/projects/my-project-slug.html`) and put the project’s Overview, Problem, Approach, Insights (and optional Media notes) in that file. If `content_path` is set, the project page loads that HTML and uses it instead of the JSON fields. You can migrate one project at a time.

See **“Project content as HTML (optional)”** below for the file layout and convention.

### Non-featured projects: JSON is enough (no HTML required)

For projects with **`featured: false`**, the same project detail page and **same section structure** (Overview, Problem Statement, Approach, Insights & Outcomes, Media) are used. Content can come entirely from JSON:

- **No HTML files needed** — Use `full_description`, `problem_statement`, `approach`, `insights`, and `media_notes` in `projects.json`. The page renders these as the same sections as featured projects.
- **Target length:** ~**1–1.5k words total** across those five fields. Same business-first style as featured, but shorter (featured use 3–5k in HTML).
- **HTML in JSON:** You can use simple HTML in those fields (`<p>`, `<ul>`, `<li>`, `<strong>`) for structure. Keep JSON valid (escape quotes inside strings).
- **Optional later:** If you want richer formatting or longer content for a non-featured project, add a `content_path` and an HTML file; the site will use it instead of the JSON fields.

---

## Quick rules

| Rule | Why |
|------|-----|
| **Valid JSON only** | No trailing commas, no comments. Use a JSON validator if unsure. |
| **Unique `id`** | Each project and each case study must have a unique `id` in its file. |
| **Slug-style `id`** | Use lowercase, hyphens, no spaces (e.g. `my-analytics-project`). |
| **Case study ↔ project link** | In `case_studies.json`, set `project_id` to the **exact** `id` of a project in `projects.json` if the case study has a project page. |
| **Case study HTML path** | `case_study_path` must point to a real file under `data/case_studies/` (e.g. `data/case_studies/my-project-slug.html`). |
| **Order = display order** | Order in each JSON array is the order shown on the site. Reorder by moving objects in the array. |

---

## 1. Projects (`projects.json`)

Projects drive the **Projects** grid, project detail page (`project.html?id=...`), and (when linked) the “Case Study (Long-form)” section on the project page.

### Required fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique slug (e.g. `churn-retention-analytics`). Used in URLs. |
| `title` | string | Display name of the project. |
| `short_description` | string | One-line summary for cards and hero. Plain text or very short HTML. |
| `tools` | array of strings | e.g. `["Python", "SQL", "Power BI"]`. Shown as tags. |
| `category` | string | e.g. `"Analytics"`, `"Machine Learning"`, `"Industry · BFSI"`. |
| `date` | string | e.g. `"2024"` or `"2025"`. |
| `thumbnail` | string | Path or URL for card/hero image (e.g. `assets/images/thumbs/01.jpg`). |
| `featured` | boolean | `true` = appears in featured section on homepage; `false` = only in grid. |

### Optional but common

| Field | Type | Description |
|-------|------|-------------|
| `full_description` | string | HTML for “Overview” on project page. |
| `problem_statement` | string | HTML for “Problem Statement” section. |
| `approach` | string | HTML for “Approach / Methodology” section. |
| `insights` | string | HTML for “Insights & Outcomes” section. |
| `media_notes` | string | HTML notes (e.g. placeholders for future links). *Omit if using `content_path`.* |
| `content_path` | string | *(Optional)* Path to HTML file (e.g. `data/projects/my-project-slug.html`). If set, Overview / Problem / Approach / Insights / Media are loaded from that file instead of from JSON. |
| `images` | array of strings | Extra image paths for gallery. |
| `show_apps_section` | boolean | `true` = use combined “Applications & Dashboards” block; `false` = show Streamlit/Power BI/Video as separate sections if URLs are set. |

### Link / asset fields (optional)

Use `""` when you don’t have a link. The site will hide empty ones.

| Field | Type | Example |
|-------|------|--------|
| `github_url` | string | `"https://github.com/me/repo"` |
| `demo_url` | string | Live app or demo link |
| `notebook_url` | string | e.g. nbviewer or GitHub raw `.ipynb` |
| `video_url` | string | YouTube, Loom, etc. |
| `streamlit_url` | string | Streamlit app URL |
| `powerbi_embed_url` | string | Power BI embed URL |
| `pbix_download_path` | string | Path to `.pbix` file (e.g. `assets/pbix/dash.pbix`) |
| `slide_pdf_path` | string | Path to PDF (e.g. `assets/slides/slides.pdf`) |
| `medium_url` | string | Medium article |
| `kaggle_url` | string | Kaggle notebook / dataset |

### HTML in project fields

- Allowed: `<p>`, `<ul>`, `<ol>`, `<li>`, `<strong>`, `<em>`, `<code>`, `<pre>`, `<a>`.
- Escape double quotes inside strings: `\"`.
- Newlines in code blocks: use `\n` inside the string.

### Project content as HTML (optional)

You can keep long-form content in **HTML files** instead of inside JSON:

1. Create a folder **`data/projects/`** and one HTML file per project, e.g. **`data/projects/my-project-slug.html`**.
2. In **`projects.json`**, add **`content_path`**: `"data/projects/my-project-slug.html"` (and you can omit or leave empty `full_description`, `problem_statement`, `approach`, `insights`, `media_notes` for that project).
3. The HTML file must contain **sections with these IDs** so the project page can build the TOC and content:
   - **`id="overview"`** — Overview (same as `full_description`).
   - **`id="problem"`** — Problem Statement.
   - **`id="approach"`** — Approach / Methodology.
   - **`id="insights"`** — Insights & Outcomes.
   - **`id="media"`** — (optional) Media & Assets notes.

Use real HTML inside each section (e.g. `<p>`, `<ul>`, `<ol>`, `<strong>`, `<code>`, `<pre>`). The site loads the file and injects each section’s content. If a section is missing, it is skipped. See **`data/projects/sample-project-content.html`** for the exact structure.

**Example `projects.json` entry when using HTML content:**

```json
{
  "id": "my-project-slug",
  "title": "My Project",
  "short_description": "One-line summary.",
  "content_path": "data/projects/my-project-slug.html",
  "tools": ["Python", "SQL"],
  "category": "Analytics",
  "date": "2025",
  "thumbnail": "assets/images/thumbs/01.jpg",
  "featured": false
}
```

You can migrate one project at a time: add `content_path` and the HTML file; the site will use the file. If `content_path` is missing, it uses the JSON fields as before.

### Do not

- **Do not** add `case_study_path` to projects. Case study content and paths live only in **`case_studies.json`** and in `data/case_studies/*.html`.
- **Do not** change an existing project’s `id` without updating any case study that links to it via `project_id`.

---

## 2. Case studies (`case_studies.json`)

Case studies are **industry/domain learning pieces**—based on real resources, data, and examples from the internet (e.g. Netflix Tech Blog, Spotify Research, logistics case studies, banking fraud reports, credit risk frameworks). They are **not** write-ups of your personal projects. Your projects live only in the **Projects** section.

Case studies drive the **Case Studies** grid on the homepage and the standalone case study page (`case-study.html?id=...`). They are standalone; they do not link to projects. Do not add `project_id` for these industry case studies.

### Required fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique slug (e.g. `churn-retention-analytics`). Used in URLs (`case-study.html?id=...`). |
| `title` | string | Display title of the case study. |
| `short_description` | string | One-line summary for card and hero. Plain text preferred. |
| `category` | string | e.g. `"Analytics"`, `"Industry · BFSI"`. |
| `case_study_path` | string | Path to the HTML file (e.g. `data/case_studies/churn-retention-analytics.html`). File must exist. |
| `thumbnail` | string | Image path or URL for the card. |
| `tools` | array of strings | e.g. `["Python", "SQL"]`. Shown as tags on the card. |
| `date` | string | e.g. `"2025"`. |

### Optional

| Field | Type | Description |
|-------|------|-------------|
| `case_study_read_mins` | number | Estimated read time in minutes (defaults to 5 if omitted). |
| `project_id` | string | **Do not use** for industry/domain case studies. Case studies are standalone learning pieces (Netflix, Spotify, logistics, banking fraud, credit risk, etc.), not linked to your projects. |

### Case studies vs projects

- **Case studies** = industry/domain learning pieces (e.g. Netflix recommendation, Spotify discovery, logistics, banking fraud, credit risk). Base them on real resources, data, and examples from the internet. Do **not** make case studies out of your projects.
- **Projects** = your own work (apps, dashboards, analyses). Keep them in the Projects section only. Do not add `project_id` in case studies; case studies are standalone.

### Case study HTML file

- Create a new file under **`data/case_studies/`** with the same slug as the case study `id` (e.g. `my-project-slug.html`).
- Put the **body content** only (no full HTML document): sections, headings, paragraphs, lists, images. The site injects this into the case study page.
- Reference images with relative paths (e.g. `assets/images/...`) or full URLs.
- **Length:** Aim for **3k–5k words** for long-form case studies. Use clear sections (Executive Summary, Problem, Data &amp; Metrics, How Decisions Get Made, Further Reading).
- **Images and embeds:** Use `<figure>` with a placeholder div or image path for charts/screenshots. Add embed placeholders (e.g. Medium article, company report link or iframe) where relevant. See `netflix-recommendation-analytics.html` for the long-form template with image/embed placeholders.

### Do not

- **Do not** put case study metadata (title, path, read time, etc.) in `projects.json`. Keep it only in `case_studies.json`.
- **Do not** make case studies out of your projects. Case studies are industry/domain pieces based on real resources and data; your projects stay in the Projects section only.
- **Do not** set `project_id` for industry case studies; they are standalone.

---

## 3. Add / Edit / Remove

### Add a new project

1. Copy **`sample_project.json`** (one object) into **`projects.json`**.
2. Put it in the array where you want it (order = display order).
3. Fill all required fields and any optional ones. Do **not** add `case_study_path`.
4. Save. Validate JSON (no trailing commas, balanced brackets).

### Add a new case study

1. Copy **`sample_case_study.json`** (one object) into **`case_studies.json`**.
2. Place it in the array in the order you want.
3. Set `id`, `title`, `short_description`, `category`, `case_study_path`, `thumbnail`, `tools`, `date`. Add `case_study_read_mins` and `project_id` if needed.
4. Create the HTML file at the path in `case_study_path` (e.g. `data/case_studies/my-project-slug.html`).
5. Save. Validate JSON.

### Edit an existing entry

- Change only the field values; keep the same `id` if the project/case study is already linked or linked to.
- If you rename a project `id`, update every case study that has `project_id` equal to the old `id`.
- If you rename a case study `id`, update any links that point to `case-study.html?id=old-id`. The file name under `data/case_studies/` can be renamed to match; then update `case_study_path` in `case_studies.json`.

### Remove a project

1. Delete that object from the **`projects.json`** array.
2. In **`case_studies.json`**, either remove the case study whose `project_id` was this project, or set its `project_id` to another project’s `id` / leave it unlinked (no `project_id`) if it’s standalone.

### Remove a case study

1. Delete that object from the **`case_studies.json`** array.
2. Optionally delete or keep the HTML file under `data/case_studies/`; the site only loads what’s referenced in JSON.

---

## 4. File layout reference

```
data/
├── README.md              # Short overview (this repo)
├── DATA_GUIDE.md          # This guide
├── sample_project.json    # One sample project (reference; shows content_path)
├── sample_case_study.json # One sample case study (reference only)
├── projects.json          # All projects (edit this)
├── case_studies.json      # All case studies (edit this)
├── case_studies/          # HTML body content per case study
│   ├── ai-governance-workbench.html
│   └── ...
└── projects/              # Optional: HTML content per project (when content_path is set)
    ├── README.md
    ├── sample-project-content.html
    └── my-project-slug.html   # one file per project that uses content_path
```

---

## 5. Validation tips

- **JSON**: Use [jsonlint.com](https://jsonlint.com) or `node -e "JSON.parse(require('fs').readFileSync('data/projects.json','utf8'))"` to ensure valid JSON.
- **Links**: After editing, open the homepage, click “Case Studies”, then open a case study and (if it has `project_id`) “View full project”, to confirm paths and links work.
- **IDs**: Search the repo for an `id` before changing it (e.g. `project_id` in case_studies.json, or URLs in docs).

Keeping **projects** in `projects.json` and **case studies** in `case_studies.json` with this guide and the sample files should keep future edits safe and consistent.
