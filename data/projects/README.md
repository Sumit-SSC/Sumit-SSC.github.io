# Project content (HTML)

Optional HTML files for project detail content. If a project in **`projects.json`** has **`content_path`** set to a file here (e.g. `data/projects/my-project-slug.html`), the project page loads Overview, Problem, Approach, Insights, and Media from that file instead of from JSON.

**Convention:** Each HTML file must contain sections with these IDs:

- `id="overview"`
- `id="problem"`
- `id="approach"`
- `id="insights"`
- `id="media"` (optional)

See **`sample-project-content.html`** for the exact structure and **`../DATA_GUIDE.md`** for the full guide.

If you don’t use `content_path`, project content stays in **`projects.json`** (fields `full_description`, `problem_statement`, `approach`, `insights`, `media_notes`).
