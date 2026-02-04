# Data

Structured content for the site.

## Files

| File | Purpose |
|------|--------|
| **`projects.json`** | All projects: cards, detail page (`project.html`), featured section. |
| **`case_studies.json`** | All case studies: Case Studies grid, standalone page (`case-study.html`). Industry/domain learning pieces (Netflix, Spotify, logistics, banking fraud, credit risk)—**not** write-ups of your projects. |
| **`case_studies/*.html`** | Long-form article body for each case study (loaded by path in `case_studies.json`). Base content on real resources, data, and examples from the internet. |
| **`sample_project.json`** | One example project — copy into `projects.json` when adding. |
| **`sample_case_study.json`** | One example case study — copy into `case_studies.json` when adding. |

## How to edit

See **[DATA_GUIDE.md](DATA_GUIDE.md)** for:

- Field-by-field description for projects and case studies
- Rules (unique IDs, slugs, linking, paths)
- Add / edit / remove steps
- Do’s and don’ts so the site doesn’t break

After changing `projects.json` or `case_studies.json`, refresh the site to see updates.
