#!/usr/bin/env python3
"""Validate portfolio content files before deploy.

Checks:
- data/projects.json required keys
- duplicate project ids
- referenced local project assets/files exist
- data/case_studies.json required keys
- referenced local case study HTML files exist
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
PROJECTS_JSON = ROOT / "data" / "projects.json"
CASE_STUDIES_JSON = ROOT / "data" / "case_studies.json"

PROJECT_REQUIRED = {
    "id",
    "title",
    "short_description",
    "tools",
    "category",
    "date",
    "thumbnail",
    "featured",
}

CASE_STUDY_REQUIRED = {"id", "title", "short_description", "case_study_path"}


def load_json(path: Path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        raise RuntimeError(f"Failed to load {path}: {exc}") from exc


def as_list(value, path: Path):
    if not isinstance(value, list):
        raise RuntimeError(f"{path} must contain a JSON array.")
    return value


def is_local_ref(value: str) -> bool:
    if not value:
        return False
    lower = value.lower()
    return not (lower.startswith("http://") or lower.startswith("https://") or lower.startswith("mailto:"))


def path_exists(rel_path: str) -> bool:
    rel = rel_path.lstrip("/").replace("\\", "/")
    return (ROOT / rel).exists()


def check_required_fields(obj: dict, required: set[str], kind: str, idx: int) -> list[str]:
    missing = [k for k in required if k not in obj]
    if not missing:
        return []
    return [f"{kind}[{idx}] missing required fields: {', '.join(sorted(missing))}"]


def validate_projects(projects: Iterable[dict]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    seen_ids: set[str] = set()

    for i, p in enumerate(projects):
        if not isinstance(p, dict):
            errors.append(f"projects[{i}] is not an object.")
            continue

        errors.extend(check_required_fields(p, PROJECT_REQUIRED, "projects", i))
        pid = str(p.get("id", "")).strip()
        if not pid:
            errors.append(f"projects[{i}] has empty id.")
        elif pid in seen_ids:
            errors.append(f"Duplicate project id: {pid}")
        else:
            seen_ids.add(pid)

        for field in ("thumbnail", "content_path"):
            val = str(p.get(field, "")).strip()
            if val and is_local_ref(val) and not path_exists(val):
                errors.append(f"projects[{i}] ({pid}) field '{field}' points to missing path: {val}")

        for optional_artifact in ("slide_pdf_path", "pbix_download_path"):
            val = str(p.get(optional_artifact, "")).strip()
            if val and is_local_ref(val) and not path_exists(val):
                warnings.append(
                    f"projects[{i}] ({pid}) optional '{optional_artifact}' path not found: {val}"
                )

        images = p.get("images", [])
        if images is not None and not isinstance(images, list):
            errors.append(f"projects[{i}] ({pid}) field 'images' must be an array.")
        elif isinstance(images, list):
            for j, img in enumerate(images):
                img_s = str(img).strip()
                if img_s and is_local_ref(img_s) and not path_exists(img_s):
                    errors.append(
                        f"projects[{i}] ({pid}) images[{j}] points to missing path: {img_s}"
                    )

    return errors, warnings


def validate_case_studies(case_studies: Iterable[dict]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    seen_ids: set[str] = set()

    for i, cs in enumerate(case_studies):
        if not isinstance(cs, dict):
            errors.append(f"case_studies[{i}] is not an object.")
            continue

        errors.extend(check_required_fields(cs, CASE_STUDY_REQUIRED, "case_studies", i))
        cid = str(cs.get("id", "")).strip()
        if not cid:
            errors.append(f"case_studies[{i}] has empty id.")
        elif cid in seen_ids:
            errors.append(f"Duplicate case study id: {cid}")
        else:
            seen_ids.add(cid)

        case_path = str(cs.get("case_study_path", "")).strip()
        if case_path and is_local_ref(case_path) and not path_exists(case_path):
            errors.append(f"case_studies[{i}] ({cid}) missing case_study_path: {case_path}")

    return errors, warnings


def main() -> int:
    try:
        projects = as_list(load_json(PROJECTS_JSON), PROJECTS_JSON)
        case_studies = as_list(load_json(CASE_STUDIES_JSON), CASE_STUDIES_JSON)
    except RuntimeError as exc:
        print(f"[FAIL] {exc}")
        return 1

    errors: list[str] = []
    warnings: list[str] = []
    p_errors, p_warnings = validate_projects(projects)
    c_errors, c_warnings = validate_case_studies(case_studies)
    errors.extend(p_errors)
    errors.extend(c_errors)
    warnings.extend(p_warnings)
    warnings.extend(c_warnings)

    if errors:
        print(f"[FAIL] Content validation found {len(errors)} issue(s):")
        for e in errors:
            print(f" - {e}")
        return 1

    if warnings:
        print(f"[WARN] Content validation produced {len(warnings)} warning(s):")
        for w in warnings:
            print(f" - {w}")

    print("[OK] Content validation passed for projects and case studies.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

