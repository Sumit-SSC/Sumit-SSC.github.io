# GitHub Pages Dev Branch Fix

## Issue
Images not rendering and `index.html` showing as plain text on dev branch, but works locally.

## Root Causes

1. **GitHub Pages Branch Configuration**: GitHub Pages might not be configured to serve from `dev` branch
2. **Path Issues**: `index.html` references `_backup_old_portfolio/` which may not exist in dev branch
3. **MIME Type Issues**: GitHub Pages might serve HTML as plain text
4. **Relative Path Issues**: Paths might not resolve correctly on GitHub Pages

## Solutions

### 1. Configure GitHub Pages for Dev Branch

1. Go to your repository: `https://github.com/Sumit-SC/Sumit-SC.github.io`
2. Click **Settings** → **Pages**
3. Under **Source**, select:
   - **Branch**: `dev`
   - **Folder**: `/ (root)`
4. Click **Save**

**Note**: If you want to keep main branch for production, you can:
- Use `dev` branch for development/testing
- Use `main` branch for production
- Or use a `/docs` folder approach

### 2. Fix index.html Paths

The `index.html` file references `_backup_old_portfolio/` which may not exist. Update paths:

**Before:**
```html
<link rel="stylesheet" href="_backup_old_portfolio/assets/css/index.css" />
<script src="_backup_old_portfolio/assets/js/jquery.min.js"></script>
```

**After (if files exist in dev branch):**
```html
<link rel="stylesheet" href="assets/css/index.css" />
<script src="assets/js/jquery.min.js"></script>
```

**Or use absolute paths from main branch:**
```html
<link rel="stylesheet" href="https://sumit-sc.github.io/_backup_old_portfolio/assets/css/index.css" />
```

### 3. Verify File Structure in Dev Branch

Ensure all referenced files exist in the dev branch:

```bash
# Check if files exist
git checkout dev
ls -la _backup_old_portfolio/assets/css/index.css
ls -la assets/css/custom.css
ls -la assets/js/main.js
```

### 4. Fix Relative Paths for GitHub Pages

GitHub Pages serves from root, so ensure all paths are relative to root:

**Correct:**
- `assets/css/custom.css` ✅
- `data/projects.json` ✅
- `homepage.html` ✅

**Incorrect:**
- `/assets/css/custom.css` (leading slash may cause issues)
- `./assets/css/custom.css` (unnecessary)

### 5. Add Base URL for GitHub Pages (if using subdirectory)

If your site is served from a subdirectory (e.g., `username.github.io/repo-name`), add:

```html
<head>
  <base href="/Sumit-SC.github.io/">
  <!-- or -->
  <base href="/">
</head>
```

### 6. Check Browser Console for Errors

1. Open DevTools (F12)
2. Go to **Console** tab
3. Look for 404 errors on:
   - CSS files
   - JS files
   - Image files
4. Update paths based on actual file locations

### 7. Verify GitHub Pages Deployment

1. Go to repository **Actions** tab
2. Check if GitHub Pages deployment is running
3. Wait for deployment to complete (usually 1-2 minutes)
4. Access your site: `https://sumit-sc.github.io/` (or your custom domain)

### 8. Clear Browser Cache

After fixing paths:
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Or clear browser cache
3. Or use incognito/private mode

## Quick Fix Checklist

- [ ] GitHub Pages configured for `dev` branch
- [ ] All file paths updated in `index.html`
- [ ] All referenced files exist in dev branch
- [ ] Browser console checked for 404 errors
- [ ] GitHub Pages deployment completed
- [ ] Browser cache cleared
- [ ] Tested in incognito mode

## Testing

1. **Local Test**: `python -m http.server 8000` (should work)
2. **GitHub Pages Test**: Visit `https://sumit-sc.github.io/` (should match local)
3. **Dev Branch Test**: If using separate dev URL, test there

## Common Issues

### Issue: "404 Not Found" for CSS/JS
**Fix**: Update paths to match actual file locations in dev branch

### Issue: HTML shows as plain text
**Fix**: 
- Check GitHub Pages is enabled
- Verify branch is set correctly
- Wait for deployment to complete

### Issue: Images not loading
**Fix**:
- Check image paths in `data/projects.json`
- Use `assets_repo` for external assets
- Verify images exist in repository

### Issue: Styles not applying
**Fix**:
- Check CSS file paths
- Verify Tailwind CDN loads
- Check browser console for CSS errors
