"""
Quick word count for project + case-study content.

Counts approximate word totals in:
- data/projects/*.html
- data/case_studies/*.html
- text-bearing fields in data/projects.json and data/case_studies.json

Run from repo root:
  python scripts/word_count.py
"""

from __future__ import annotations

from pathlib import Path
import json
import re


ROOT = Path(__file__).resolve().parents[1]

PROJECT_HTML_DIR = ROOT / "data" / "projects"
CASE_HTML_DIR = ROOT / "data" / "case_studies"

PROJECTS_JSON = ROOT / "data" / "projects.json"
CASE_JSON = ROOT / "data" / "case_studies.json"

WORD_RE = re.compile(r"[A-Za-z0-9_']+")


def count_words(text: str) -> int:
  return len(WORD_RE.findall(text))


def count_html_words():
  rows = []
  for path in sorted(PROJECT_HTML_DIR.glob("*.html")) + sorted(CASE_HTML_DIR.glob("*.html")):
    text = path.read_text(encoding="utf-8", errors="ignore")
    n = count_words(text)
    rows.append((path.relative_to(ROOT), n))
  total = sum(n for _, n in rows)
  return rows, total


def count_json_words():
  project_fields = ["short_description", "full_description", "problem_statement", "approach", "insights", "media_notes"]
  case_fields = ["short_description"]

  projects = json.loads(PROJECTS_JSON.read_text(encoding="utf-8"))
  cases = json.loads(CASE_JSON.read_text(encoding="utf-8"))

  proj_total = 0
  for proj in projects:
    for f in project_fields:
      val = proj.get(f) or ""
      proj_total += count_words(val)

  case_total = 0
  for cs in cases:
    for f in case_fields:
      val = cs.get(f) or ""
      case_total += count_words(val)

  return proj_total, case_total


def main():
  print("Root:", ROOT)
  print("--- HTML content ---")
  rows, total_html = count_html_words()
  print(f"HTML files: {len(rows)}")
  for rel, n in rows:
    print(f"{rel} :: {n} words")
  print("HTML_TOTAL_WORDS", total_html)

  print("\n--- JSON text fields ---")
  proj_total, case_total = count_json_words()
  print("JSON_projects_word_count", proj_total)
  print("JSON_case_studies_word_count", case_total)
  print("JSON_COMBINED", proj_total + case_total)


if __name__ == "__main__":
  main()

