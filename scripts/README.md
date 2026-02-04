# Scripts

## download-skill-icons.ps1

Downloads all skill icons from CDN to `assets/images/icons/` so the site can load them **locally**. This gives you:

- **Faster loading**: Same-origin requests (no extra DNS or connections to external CDNs).
- **Reliability**: Icons keep working if external links are moved or taken down.
- **Backup**: All icons live in your repo.

**Run once** (from project root, using PowerShell):

```powershell
powershell -ExecutionPolicy Bypass -File scripts/download-skill-icons.ps1
```

Icon URLs are read from `data/skill_icon_urls.json`. After running, the skills page will load icons from `assets/images/icons/` first and fall back to the CDN URL if a local file is missing.
