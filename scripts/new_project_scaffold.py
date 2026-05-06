#!/usr/bin/env python3
"""Create a new project scaffold for quick content editing.

Usage:
  python scripts/new_project_scaffold.py --id my-project-slug --title "My Project"
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PROJECTS_DIR = ROOT / "data" / "projects"
IMAGES_DIR = ROOT / "assets" / "images" / "projects"


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "new-project"


def build_html_template(title: str) -> str:
    return f"""<div id="overview">
  <p>{title} overview goes here.</p>
</div>

<div id="problem">
  <p>Describe the core problem this project solves.</p>
</div>

<div id="approach">
  <p>Describe tools, pipeline, and implementation approach.</p>
</div>

<div id="insights">
  <ul>
    <li>Key insight 1</li>
    <li>Key insight 2</li>
    <li>Key outcome / metric</li>
  </ul>
</div>

<div id="media">
  <p>Add media notes, artifacts, or links.</p>
</div>
"""


def build_project_json(project_id: str, title: str) -> dict:
    return {
        "id": project_id,
        "title": title,
        "short_description": "One-line summary of the project outcome.",
        "full_description": f"{title} overview goes here.",
        "problem_statement": "What problem this project solves.",
        "approach": "Method, stack, and implementation approach.",
        "insights": "Key outcomes, impact, and measurable results.",
        "media_notes": "",
        "category": "Analytics",
        "tools": ["SQL", "Python"],
        "date": "2026",
        "featured": False,
        "thumbnail": "assets/images/thumbs/01.jpg",
        "images": [
            f"assets/images/projects/{project_id}/01.jpg",
            f"assets/images/projects/{project_id}/02.jpg",
        ],
        "content_path": f"data/projects/{project_id}.html",
        "github_url": "",
        "demo_url": "",
        "video_url": "",
        "streamlit_url": "",
        "powerbi_embed_url": "",
        "pbix_download_path": "",
        "slide_pdf_path": "",
        "notebook_url": "",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Create project scaffold files and JSON snippet.")
    parser.add_argument("--id", dest="project_id", help="Project id slug (e.g. churn-retention-analytics)")
    parser.add_argument("--title", required=True, help="Project title")
    args = parser.parse_args()

    project_id = args.project_id.strip() if args.project_id else slugify(args.title)
    html_path = PROJECTS_DIR / f"{project_id}.html"
    image_dir = IMAGES_DIR / project_id

    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
    image_dir.mkdir(parents=True, exist_ok=True)

    if not html_path.exists():
        html_path.write_text(build_html_template(args.title), encoding="utf-8")

    snippet = build_project_json(project_id, args.title)
    print("[OK] Scaffold ready")
    print(f" - HTML: {html_path.relative_to(ROOT)}")
    print(f" - Images dir: {image_dir.relative_to(ROOT)}")
    print("\nPaste this object into data/projects.json:\n")
    print(json.dumps(snippet, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

