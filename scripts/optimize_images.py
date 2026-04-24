"""
Optimize portfolio images to WebP using Python.

Usage (from repo root):
  python -m venv .venv       # optional but recommended
  .venv\Scripts\activate     # on Windows
  pip install pillow
  python scripts/optimize_images.py

This will:
 - Scan assets/images (excluding /optimized and /icons* folders)
 - Convert .png/.jpg/.jpeg to .webp
 - Write to assets/optimized-images/<same-relative-path>.webp

Matches JS helper getOptimizedImagePath() already used in the site.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "assets" / "images"
DEST_DIR = ROOT / "assets" / "optimized-images"

IMAGE_EXTS = {".png", ".jpg", ".jpeg"}


def should_skip_dir(path: Path) -> bool:
  name = path.name.lower()
  if name == "optimized":
    return True
  if name.startswith("icons"):
    # icons are tiny and often SVG-backed; skip for now
    return True
  return False


def is_thumbnail(rel_path: Path) -> bool:
  s = str(rel_path).lower()
  return "thumb" in s or "thumbnail" in s


def get_dest_path(src_path: Path) -> Path:
  rel = src_path.relative_to(SRC_DIR)  # e.g. projects/foo/01.jpg
  dest_rel = rel.with_suffix(".webp")
  return DEST_DIR / dest_rel


def convert_image(src_path: Path) -> None:
  rel_from_src = src_path.relative_to(SRC_DIR)
  dest_path = get_dest_path(src_path)
  dest_path.parent.mkdir(parents=True, exist_ok=True)

  if dest_path.exists():
    print("SKIP (exists):", dest_path.relative_to(ROOT))
    return

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
  except (UnidentifiedImageError, OSError) as e:
    # If Pillow cannot read the file (corrupt or not a real image), skip it gracefully
    print(f"SKIP (unreadable): {src_path.relative_to(ROOT)} – {e}")


def walk_and_convert() -> None:
  if not SRC_DIR.exists():
    print("Source directory not found:", SRC_DIR)
    sys.exit(1)

  for path in SRC_DIR.rglob("*"):
    if path.is_dir():
      if should_skip_dir(path):
        # Skip entire subtree
        for _ in path.rglob("*"):
          pass
        continue
      continue

    if not path.is_file():
      continue

    ext = path.suffix.lower()
    if ext not in IMAGE_EXTS:
      continue

    convert_image(path)


def main() -> None:
  print("Root   :", ROOT)
  print("Source :", SRC_DIR)
  print("Dest   :", DEST_DIR)
  walk_and_convert()
  print("Done.")


if __name__ == "__main__":
  main()

