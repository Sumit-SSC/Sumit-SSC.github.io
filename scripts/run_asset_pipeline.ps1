<# 
One-click asset pipeline (Windows PowerShell).

What it does:
 - Downloads skill icons (CDN → local)
 - Builds icon webp + icon manifest
 - Builds optimized-images webp for all local raster images under assets/images (excluding icons*)
 - Audits image references (read-only)

Run from repo root (Sumit-SC.github.io/):
  powershell -ExecutionPolicy Bypass -File scripts/run_asset_pipeline.ps1
#>

$ErrorActionPreference = "Stop"

Write-Host "== Asset pipeline =="
Write-Host "1) Download skill icons..."
powershell -ExecutionPolicy Bypass -File "scripts/download-skill-icons.ps1"

Write-Host ""
Write-Host "2) Build skill icon assets + manifest..."
python "scripts/build_skill_icon_assets.py"

Write-Host ""
Write-Host "3) Build optimized-images WebPs + report..."
python "scripts/optimize_images.py" "--report" "docs/ASSET_OPTIMIZATION_REPORT.md"

Write-Host ""
Write-Host "4) Audit image references..."
python "scripts/audit_images.py"

Write-Host ""
Write-Host "Done."

