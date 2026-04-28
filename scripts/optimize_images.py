r"""
Optimize portfolio images to WebP using Python.

Usage (from repo root):
  python -m venv .venv       # optional but recommended
  .venv\Scripts\activate     # on Windows
  pip install pillow
  python scripts/optimize_images.py

This will:
 - Scan assets/images (excluding /optimized and /icons* folders by default)
 - Convert .png/.jpg/.jpeg to .webp
 - Write to assets/optimized-images/<same-relative-path>.webp

Matches JS helper getOptimizedImagePath() already used in the site.

Note on icons:
- `skills.html` uses the dedicated icon pipeline:
  - `assets/images/icons/` (downloaded icons)
  - `assets/images/icons-webp/` (optimized icon webps, built by `build_skill_icon_assets.py`)
- So this script excludes `icons*` by default to avoid duplicate outputs.
- If you want to also generate `assets/optimized-images/icons/*.webp`, pass `--include-icons`.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path
from typing import Iterable

from PIL import Image, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "assets" / "images"
DEST_DIR = ROOT / "assets" / "optimized-images"

IMAGE_EXTS = {".png", ".jpg", ".jpeg"}


def should_skip_dir_name(dir_name: str, *, include_icons: bool) -> bool:
  name = dir_name.lower()
  if name == "optimized":
    return True
  if name.startswith("icons") and not include_icons:
    # icons have their own pipeline (icons + icons-webp); and "icons copy" is redundant noise
    return True
  return False


def is_thumbnail(rel_path: Path) -> bool:
  s = str(rel_path).lower()
  return "thumb" in s or "thumbnail" in s


def get_dest_path(src_path: Path) -> Path:
  rel = src_path.relative_to(SRC_DIR)  # e.g. projects/foo/01.jpg
  dest_rel = rel.with_suffix(".webp")
  return DEST_DIR / dest_rel


def convert_image(src_path: Path, *, force: bool) -> tuple[bool, str]:
  rel_from_src = src_path.relative_to(SRC_DIR)
  dest_path = get_dest_path(src_path)
  dest_path.parent.mkdir(parents=True, exist_ok=True)

  if dest_path.exists() and not force:
    return False, "exists"

  if src_path.stat().st_size == 0:
    return False, "zero-bytes"

  print("OPTIMIZE:", src_path.relative_to(ROOT), "->", dest_path.relative_to(ROOT))

  # Thumbnails: smaller + stronger compression
  thumb = is_thumbnail(rel_from_src)
  max_width = 600 if thumb else 1600
  quality = 70 if thumb else 80

  try:
    with Image.open(src_path) as im:
      im = im.convert("RGB")  # WebP doesn't support all modes
      w, h = im.size
      if w > max_width:
        new_h = int(h * (max_width / float(w)))
        im = im.resize((max_width, new_h), Image.LANCZOS)

      im.save(
        dest_path,
        format="WEBP",
        quality=quality,
        method=6,
      )
    return True, "converted"
  except (UnidentifiedImageError, OSError) as e:
    # If Pillow cannot read the file (corrupt or not a real image), skip it gracefully
    print(f"SKIP (unreadable): {src_path.relative_to(ROOT)} – {e}")
    return False, "unreadable"


def iter_source_images(*, include_icons: bool) -> Iterable[Path]:
  """
  Yield image files under assets/images/ while pruning excluded folders.
  os.walk lets us prune directory traversal (Path.rglob does not).
  """
  for root, dirs, files in os.walk(SRC_DIR):
    # Prune traversal in-place
    dirs[:] = [d for d in dirs if not should_skip_dir_name(d, include_icons=include_icons)]
    for name in files:
      p = Path(root) / name
      if p.suffix.lower() in IMAGE_EXTS:
        yield p


def write_report_md(
  *,
  report_path: Path,
  converted: list[tuple[str, str]],
  skipped: dict[str, int],
  unreadable: list[str],
  zero_bytes: list[str],
) -> None:
  report_path.parent.mkdir(parents=True, exist_ok=True)
  lines = []
  lines.append("# Asset optimization report\n")
  lines.append(f"- **Source**: `{SRC_DIR}`\n")
  lines.append(f"- **Destination**: `{DEST_DIR}`\n")
  lines.append("")
  lines.append("## Summary\n")
  lines.append(f"- **converted**: {len(converted)}\n")
  lines.append(f"- **skipped (exists)**: {skipped.get('exists', 0)}\n")
  lines.append(f"- **skipped (unreadable)**: {len(unreadable)}\n")
  lines.append(f"- **skipped (zero bytes)**: {len(zero_bytes)}\n")
  lines.append("")
  lines.append("## Replacement map (original → optimized WebP)\n")
  lines.append("")
  for src, dest in converted:
    lines.append(f"- `{src}` → `{dest}`\n")
  lines.append("")
  if unreadable:
    lines.append("## Unreadable images (Pillow could not decode)\n")
    lines.append("")
    for p in unreadable:
      lines.append(f"- `{p}`\n")
    lines.append("")
  if zero_bytes:
    lines.append("## Zero-byte images\n")
    lines.append("")
    for p in zero_bytes:
      lines.append(f"- `{p}`\n")
    lines.append("")
  report_path.write_text("".join(lines), encoding="utf-8")


def walk_and_convert(*, force: bool, include_icons: bool, report_path: Path | None) -> None:
  if not SRC_DIR.exists():
    print("Source directory not found:", SRC_DIR)
    sys.exit(1)

  converted: list[tuple[str, str]] = []
  skipped: dict[str, int] = {"exists": 0}
  unreadable: list[str] = []
  zero_bytes: list[str] = []

  for path in iter_source_images(include_icons=include_icons):
    ok, reason = convert_image(path, force=force)
    if ok:
      src_rel = str(path.relative_to(ROOT)).replace("\\", "/")
      dest_rel = str(get_dest_path(path).relative_to(ROOT)).replace("\\", "/")
      converted.append((src_rel, dest_rel))
    else:
      if reason == "exists":
        skipped["exists"] = skipped.get("exists", 0) + 1
      elif reason == "unreadable":
        unreadable.append(str(path.relative_to(ROOT)).replace("\\", "/"))
      elif reason == "zero-bytes":
        zero_bytes.append(str(path.relative_to(ROOT)).replace("\\", "/"))

  if report_path:
    write_report_md(
      report_path=report_path,
      converted=converted,
      skipped=skipped,
      unreadable=unreadable,
      zero_bytes=zero_bytes,
    )


def main() -> None:
  parser = argparse.ArgumentParser(description="Convert assets/images raster images to WebP under assets/optimized-images.")
  parser.add_argument("--force", action="store_true", help="Rebuild WebP even if destination already exists.")
  parser.add_argument("--include-icons", action="store_true", help="Also optimize assets/images/icons* into assets/optimized-images/icons*.")
  parser.add_argument(
    "--report",
    default="docs/ASSET_OPTIMIZATION_REPORT.md",
    help="Write a markdown replacement map/report (relative to repo root). Use empty string to disable.",
  )
  args = parser.parse_args()

  print("Root   :", ROOT)
  print("Source :", SRC_DIR)
  print("Dest   :", DEST_DIR)
  report_path = None if not args.report else (ROOT / args.report)
  walk_and_convert(force=args.force, include_icons=args.include_icons, report_path=report_path)
  print("Done.")


if __name__ == "__main__":
  main()

