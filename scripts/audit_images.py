"""
Audit portfolio images:
- Finds image references in JSON + HTML + CSS
- Reports missing referenced files
- Reports "loose" images not referenced anywhere (candidates for cleanup)

Run (from Sumit-SC.github.io/):
  python scripts/audit_images.py

Notes:
- This is read-only. It does NOT delete or move files.
- We treat assets under assets/images/optimized as generated artifacts.
  The primary "source of truth" references should point to assets/images/... originals.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = ROOT / "assets"
IMAGES_DIR = ASSETS_DIR / "images"

# Where we expect people to place images
EXPECTED_TOP_DIRS = {
    "projects",
    "case_studies",
    "thumbs",
    "fulls",
    "icons",
    "ie",
    "project-snaps",
}

# Find references to images in common formats:
# - assets/images/... (HTML/JSON/MD)
# - ../images/... (CSS under assets/css)
IMG_REF_RE = re.compile(
    r"""(?P<path>assets/images/[A-Za-z0-9_\-./ ]+\.(?:png|jpg|jpeg|webp|svg))""",
    re.IGNORECASE,
)

CSS_IMAGES_REL_RE = re.compile(
    r"""(?P<path>\.\./images/[A-Za-z0-9_\-./ ]+\.(?:png|jpg|jpeg|webp|svg))""",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class Finding:
    source_file: Path
    ref_path: str


def iter_source_files() -> list[Path]:
    patterns = [
        "data/**/*.json",
        "data/**/*.html",
        "pages/**/*.html",
        "*.html",
        "assets/css/**/*.css",
        "archive/legacy/**/*.html",
    ]
    files: list[Path] = []
    for pat in patterns:
        files.extend(ROOT.glob(pat))
    # Deduplicate + keep only files
    uniq = []
    seen = set()
    for f in files:
        if not f.is_file():
            continue
        if f in seen:
            continue
        seen.add(f)
        uniq.append(f)
    return uniq


def read_text(path: Path) -> str:
    # Robust-ish read for mixed content
    return path.read_text(encoding="utf-8", errors="ignore")


def find_references() -> list[Finding]:
    findings: list[Finding] = []
    for f in iter_source_files():
        text = read_text(f)
        for m in IMG_REF_RE.finditer(text):
            p = m.group("path")
            # Normalize spaces in paths as-is (Windows-friendly); keep relative
            findings.append(Finding(source_file=f, ref_path=p))

        # CSS often references ../images/... from assets/css/*.css
        if f.suffix.lower() == ".css":
            for m in CSS_IMAGES_REL_RE.finditer(text):
                p = m.group("path").replace("\\", "/")
                # Canonicalize to assets/images/... under repo root
                if p.startswith("../images/"):
                    canon = "assets/images/" + p.removeprefix("../images/")
                    findings.append(Finding(source_file=f, ref_path=canon))
    return findings


def rel_to_root(p: Path) -> str:
    try:
        return str(p.relative_to(ROOT)).replace("\\", "/")
    except Exception:
        return str(p).replace("\\", "/")


def list_images_under_images_dir() -> set[str]:
    paths: set[str] = set()
    if not IMAGES_DIR.exists():
        return paths
    for p in IMAGES_DIR.rglob("*"):
        if not p.is_file():
            continue
        rel = rel_to_root(p)
        # Skip optimized artifacts for "what is referenced"
        paths.add(rel)
    return paths


def main() -> None:
    if not IMAGES_DIR.exists():
        print("ERROR: images dir not found:", IMAGES_DIR)
        raise SystemExit(1)

    findings = find_references()
    referenced = {f.ref_path.replace("\\", "/") for f in findings}

    # Expand referenced set by stripping URL query params if ever used
    referenced = {p.split("?", 1)[0] for p in referenced}

    all_files = list_images_under_images_dir()

    # Missing referenced originals
    missing = sorted(p for p in referenced if (ROOT / p).exists() is False)

    # Candidates: files not referenced anywhere (excluding optimized artifacts)
    # We consider only non-optimized files for cleanup candidates.
    non_optimized_files = {p for p in all_files if not p.startswith("assets/images/optimized/")}
    unreferenced = sorted(p for p in non_optimized_files if p not in referenced)

    # Loose images: top-level files under assets/images (not in expected subdirs)
    loose_top_level = []
    for p in sorted(non_optimized_files):
        rel = Path(p).as_posix()
        if not rel.startswith("assets/images/"):
            continue
        sub = rel.removeprefix("assets/images/")
        if "/" not in sub:
            # top-level file like assets/images/banner.jpg
            loose_top_level.append(rel)

    print("=== IMAGE AUDIT ===")
    print("Root:", ROOT)
    print("Images dir:", IMAGES_DIR)
    print("")
    print("Referenced image paths found:", len(referenced))
    print("Total image files under assets/images:", len(all_files))
    print("Non-optimized image files:", len(non_optimized_files))
    print("")

    if missing:
        print("!! Missing referenced files (fix paths or add files):", len(missing))
        for p in missing:
            print("  -", p)
    else:
        print("OK: No missing referenced image files.")

    print("")
    if loose_top_level:
        print("Note: Top-level images (used for global backgrounds/icons sometimes):", len(loose_top_level))
        for p in loose_top_level:
            print("  -", p)
    else:
        print("OK: No top-level loose images.")

    print("")
    if unreferenced:
        print("Candidates for cleanup (unreferenced originals):", len(unreferenced))
        for p in unreferenced[:80]:
            print("  -", p)
        if len(unreferenced) > 80:
            print(f"  ... and {len(unreferenced) - 80} more")
        print("")
        print("Tip: double-check before deleting; some may be used by legacy pages.")
    else:
        print("OK: No unreferenced originals detected.")


if __name__ == "__main__":
    main()

