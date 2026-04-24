"""
Download, optimize, and build local icon manifest for skills page.

Usage (from project root):
  python scripts/build_skill_icon_assets.py

What it does:
  1) Reads data/skill_icon_urls.json (CDN backup links)
  2) Converts local raster icons in assets/images/icons/ to WebP in assets/images/icons-webp/
  3) Writes data/skill_icon_asset_manifest.json with:
      - localPreferred
      - localFallback
      - cdn
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, UnidentifiedImageError

ROOT = Path(__file__).resolve().parents[1]
CDN_JSON = ROOT / "data" / "skill_icon_urls.json"
MANIFEST_JSON = ROOT / "data" / "skill_icon_asset_manifest.json"
ICONS_DIR = ROOT / "assets" / "images" / "icons"
ICONS_WEBP_DIR = ROOT / "assets" / "images" / "icons-webp"

RASTER_EXTS = (".png", ".jpg", ".jpeg", ".webp")
LOCAL_EXT_PRIORITY = (".svg", ".png", ".webp", ".jpg", ".jpeg")


def skill_icon_slug(key: str) -> str:
    return (
        key.lower()
        .replace("&", "and")
        .replace("(", "")
        .replace(")", "")
        .replace(" ", "-")
    )


def optimize_icon(icon_path: Path, out_path: Path) -> bool:
    try:
        with Image.open(icon_path) as img:
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGBA")
            out_path.parent.mkdir(parents=True, exist_ok=True)
            img.save(out_path, format="WEBP", quality=82, method=6)
        return True
    except (UnidentifiedImageError, OSError):
        return False


def optimize_icons() -> tuple[int, int]:
    converted = 0
    skipped = 0
    ICONS_WEBP_DIR.mkdir(parents=True, exist_ok=True)

    for icon in ICONS_DIR.iterdir():
        if not icon.is_file():
            continue
        if icon.suffix.lower() not in RASTER_EXTS:
            continue

        out = ICONS_WEBP_DIR / f"{icon.stem}.webp"
        if out.exists():
            skipped += 1
            continue

        if optimize_icon(icon, out):
            converted += 1
        else:
            skipped += 1
    return converted, skipped


def first_existing(slug: str, base: Path) -> Path | None:
    for ext in LOCAL_EXT_PRIORITY:
        candidate = base / f"{slug}{ext}"
        if candidate.exists():
            return candidate
    return None


def web_rel(path: Path) -> str:
    rel = path.relative_to(ROOT).as_posix()
    return f"../{rel}"


def build_manifest() -> dict[str, dict[str, str]]:
    cdn_map = json.loads(CDN_JSON.read_text(encoding="utf-8"))
    manifest: dict[str, dict[str, str]] = {}

    for key, cdn in cdn_map.items():
        slug = skill_icon_slug(key)
        webp_icon = ICONS_WEBP_DIR / f"{slug}.webp"
        raw_icon = first_existing(slug, ICONS_DIR)

        local_preferred = web_rel(webp_icon) if webp_icon.exists() else (web_rel(raw_icon) if raw_icon else "")
        local_fallback = web_rel(raw_icon) if raw_icon else ""

        manifest[key] = {
            "slug": slug,
            "localPreferred": local_preferred,
            "localFallback": local_fallback,
            "cdn": cdn,
        }

    return manifest


def main() -> None:
    if not CDN_JSON.exists():
        raise FileNotFoundError(f"Missing {CDN_JSON}")
    if not ICONS_DIR.exists():
        raise FileNotFoundError(f"Missing {ICONS_DIR}")

    converted, skipped = optimize_icons()
    manifest = build_manifest()
    MANIFEST_JSON.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"Optimized icon files: {converted} converted, {skipped} skipped.")
    print(f"Wrote manifest: {MANIFEST_JSON}")


if __name__ == "__main__":
    main()
