# Troubleshooting Guide

## Images Not Loading

### Issue
Images don't appear after switching branches or deploying.

### Solutions

1. **Check Image Paths**
   - Verify paths in `data/projects.json` are correct
   - Paths starting with `_backup_old_portfolio/` may not exist in new branch
   - Update paths to point to `assets/images/` or use `assets_repo` for external repos

2. **Update projects.json**
   ```json
   {
     "thumbnail": "assets/images/thumbnail.png",  // ✅ Correct
     "thumbnail": "_backup_old_portfolio/...",    // ❌ May not exist
   }
   ```

3. **Use Asset Mapping**
   - Add `assets_repo` to load from GitHub:
   ```json
   {
     "thumbnail": "assets/images/thumbnail.png",
     "assets_repo": "Sumit-SC/Project-Repo",
     "assets_branch": "main"
   }
   ```

4. **Check Browser Console**
   - Open DevTools (F12) → Console
   - Look for 404 errors on image paths
   - Update paths to match actual file locations

## Theme Colors Only in URL Bar

### Issue
Theme color button changes browser UI but not page colors.

### Solutions

1. **Clear Cache**
   - Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
   - Or clear browser cache

2. **Check Theme Application**
   - Open DevTools (F12) → Elements
   - Check if `<html>` has `data-color-theme` attribute
   - Should be: `<html data-color-theme="theme-purple">`

3. **Verify CSS Injection**
   - DevTools → Elements → `<head>`
   - Look for `<style id="dynamic-theme-colors">`
   - Should contain CSS rules for current theme

4. **Force Re-apply**
   - Click theme color button again
   - Or run in console: `applyColorTheme('theme-blue')`

5. **Check Tailwind Loading**
   - Ensure Tailwind CDN loads before `main.js`
   - Theme colors override Tailwind classes, so Tailwind must load first

## Slow Rendering

### Issue
Page loads slowly or feels sluggish.

### Solutions

1. **Image Optimization**
   - Images now have `loading="lazy"` attribute
   - Large images should be optimized/compressed
   - Use WebP format when possible

2. **Check for 404 Errors**
   - Broken image paths cause delays
   - Check Network tab in DevTools
   - Fix or remove broken asset references

3. **Script Loading**
   - Scripts load in order: Tailwind → components.js → main.js
   - Don't add blocking scripts in `<head>`
   - Use `defer` or load before `</body>`

4. **Reduce Project Data**
   - Large `projects.json` can slow initial load
   - Consider pagination (already implemented)
   - Lazy load project details

5. **Browser Cache**
   - First load is slower
   - Subsequent loads should be faster
   - Clear cache if issues persist

## Quick Fixes

### Reset Theme
```javascript
// In browser console
localStorage.removeItem('colorTheme');
localStorage.removeItem('theme');
location.reload();
```

### Check Image Paths
```javascript
// In browser console - check first project
fetch('data/projects.json')
  .then(r => r.json())
  .then(data => console.log(data[0].thumbnail));
```

### Force Theme Application
```javascript
// In browser console
applyColorTheme('theme-blue');
```

## Common Path Issues

### Wrong Path Format
```json
// ❌ Wrong
"thumbnail": "/assets/images/img.png"  // Leading slash
"thumbnail": "assets\\images\\img.png"  // Windows backslashes

// ✅ Correct
"thumbnail": "assets/images/img.png"    // Relative path
"thumbnail": "https://example.com/img.png"  // Full URL
```

### Missing Files
- Check files exist in repository
- Verify file names match exactly (case-sensitive)
- Check file extensions (.png vs .PNG)

## Performance Tips

1. **Optimize Images**
   - Compress images before uploading
   - Use appropriate formats (WebP, JPEG for photos, PNG for graphics)
   - Resize images to display size

2. **Use CDN for Assets**
   - Use `assets_repo` to load from GitHub
   - Or host images on CDN (Cloudinary, Imgix, etc.)

3. **Lazy Loading**
   - Images already have `loading="lazy"`
   - Project cards load on scroll
   - Pagination limits initial load

4. **Minimize Scripts**
   - Only load necessary scripts
   - Defer non-critical scripts
   - Use async where possible
