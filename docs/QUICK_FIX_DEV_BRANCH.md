# Quick Fix for Dev Branch Issues

## Problem
- Images not rendering on dev branch
- `index.html` showing as plain text
- Works locally but not on GitHub Pages

## Immediate Fixes

### 1. Configure GitHub Pages for Dev Branch ⚠️ **CRITICAL**

1. Go to: `https://github.com/Sumit-SC/Sumit-SC.github.io/settings/pages`
2. Under **Source**:
   - Select **Branch**: `dev`
   - Select **Folder**: `/ (root)`
3. Click **Save**
4. Wait 1-2 minutes for deployment

### 2. Verify Files Exist in Dev Branch

Run these commands to check:
```bash
git checkout dev
ls -la _backup_old_portfolio/assets/css/index.css
ls -la assets/css/custom.css
ls -la assets/js/main.js
```

If `_backup_old_portfolio` doesn't exist in dev branch:
- Either merge it from main
- Or update `index.html` to not use those paths

### 3. Check Browser Console

1. Open your dev branch site
2. Press F12 → Console tab
3. Look for 404 errors
4. Note which files are missing

### 4. Common Path Issues

**If files are in `_backup_old_portfolio` but not accessible:**
- Copy them to main `assets/` folder, OR
- Update paths in HTML files

**If GitHub Pages shows HTML as plain text:**
- GitHub Pages might not be enabled for dev branch
- Check repository Settings → Pages
- Ensure branch is set correctly

## Files Updated

✅ `index.html` - Added fallback paths for CSS/JS
✅ `homepage.html` - Fixed image path with fallback
✅ Created troubleshooting docs

## Next Steps

1. **Configure GitHub Pages** (most important!)
2. **Test locally**: `python -m http.server 8000`
3. **Check browser console** for errors
4. **Update paths** based on actual file locations
5. **Clear cache** and test again

## Still Not Working?

Check:
- [ ] GitHub Pages is enabled for dev branch
- [ ] All referenced files exist in dev branch
- [ ] Browser console shows no 404 errors
- [ ] Deployment completed (check Actions tab)
- [ ] Tried hard refresh (Ctrl+Shift+R)
