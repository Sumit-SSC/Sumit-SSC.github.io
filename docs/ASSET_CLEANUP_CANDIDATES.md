# Asset Cleanup Candidates

This file tracks safe cleanup work done in the current optimization pass and what remains.

## Completed in this pass

- Removed duplicate folder: `assets/images/icons copy/` (all files deleted).
- Removed duplicate generated folder: `assets/optimized-images/icons copy/` (all files deleted).
- Kept canonical icon pipeline:
  - source/fallback: `assets/images/icons/`
  - optimized: `assets/images/icons-webp/`
- Left runtime-safe fallback behavior intact (`<picture>` and CSS `image-set` fallback to original assets).

## Current audit snapshot

From `python scripts/audit_images.py`:

- Referenced image paths: `248`
- Total image files under `assets/images`: `426`
- Missing referenced files: `5`
- Unreferenced originals (candidates): `65`

### Missing referenced files (needs fix)

- `assets/images/Project 8 - ABC Call Volume Trend.png`
- `assets/images/Stocks.jpg`
- `assets/images/projects/customer-churn.png`
- `assets/images/projects/used-car-price.png`
- `assets/images/used_car_price.png`

These should either be restored or references should be updated to existing paths.

## Next safe cleanup steps

1. Resolve the 5 missing image references first.
2. Re-run:
   - `powershell -ExecutionPolicy Bypass -File scripts/run_asset_pipeline.ps1`
   - `python scripts/audit_images.py`
3. Review remaining unreferenced originals before deleting them.
4. Keep OG/Twitter JPG references for compatibility unless explicitly migrated.
