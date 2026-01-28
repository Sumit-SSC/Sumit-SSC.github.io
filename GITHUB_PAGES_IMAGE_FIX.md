# GitHub Pages Image Fix Guide

## Issue
Images work locally but don't show up on GitHub Pages.

## Root Causes

1. **Case Sensitivity**: GitHub Pages is case-sensitive (Linux-based), while Windows is not
   - `assets/images/Intro.jpg` vs `assets/images/intro.jpg` - must match exactly
   
2. **Path Format**: Relative paths should work, but sometimes need explicit `./` prefix
   - Use: `./assets/images/intro.jpg` instead of `assets/images/intro.jpg`
   
3. **File Not Committed**: Images might not be committed to the repository
   - Check: `git status` to see if image files are tracked
   
4. **Caching**: Browser or GitHub Pages cache might show old version
   - Solution: Hard refresh (Ctrl+Shift+R) or clear cache

## Solutions Applied

### 1. Updated Image Paths in about.html
- Changed from: `url('assets/images/intro.jpg')`
- Changed to: `url('./assets/images/intro.jpg')`
- Applied to all background images in about.html

### 2. Verify File Names Match Exactly
All image files should match exactly (case-sensitive):
- ✅ `intro.jpg` (lowercase)
- ✅ `whatdoido.jpg` (lowercase)
- ✅ `whoami.jpg` (lowercase)
- ✅ `journey.jpg` (lowercase)
- ✅ `work.jpg` (lowercase)

### 3. Check Image Files Are Committed
```bash
# Check if images are tracked
git ls-files assets/images/

# If missing, add them
git add assets/images/*.jpg
git commit -m "Add missing image files"
git push
```

### 4. Verify GitHub Pages Configuration
1. Go to repository Settings → Pages
2. Ensure source branch is set correctly (usually `main` or `gh-pages`)
3. Wait 1-2 minutes for changes to deploy

## Testing Checklist

- [ ] All image files exist in `assets/images/` folder
- [ ] File names match exactly (case-sensitive)
- [ ] Images are committed to git repository
- [ ] Paths use `./assets/images/` format
- [ ] GitHub Pages is configured correctly
- [ ] Hard refresh browser (Ctrl+Shift+R)
- [ ] Check browser console for 404 errors

## Common Image Path Issues

### ❌ Wrong
```html
<!-- Case mismatch -->
<img src="assets/images/Intro.jpg">

<!-- Missing leading ./ -->
<img src="assets/images/intro.jpg">

<!-- Windows backslashes -->
<img src="assets\images\intro.jpg">
```

### ✅ Correct
```html
<!-- Correct case and path -->
<img src="./assets/images/intro.jpg">

<!-- Or relative from root -->
<img src="assets/images/intro.jpg">
```

## Debugging Steps

1. **Check Browser Console**
   - Open DevTools (F12) → Console
   - Look for 404 errors on image paths
   - Example: `Failed to load resource: 404 (Not Found)`

2. **Verify File Exists on GitHub**
   - Go to: `https://github.com/Sumit-SC/Sumit-SC.github.io/tree/main/assets/images`
   - Check if `intro.jpg`, `whatdoido.jpg`, etc. exist

3. **Test Direct URL**
   - Try: `https://sumit-sc.github.io/assets/images/intro.jpg`
   - If this works, the file exists but path in HTML is wrong
   - If this fails, the file is not committed or has wrong name

4. **Check Network Tab**
   - DevTools → Network → Images
   - See which images fail to load
   - Check the exact URL being requested

## Quick Fix Script

If images still don't work, try this PowerShell script to verify all paths:

```powershell
# Check all image references
Get-ChildItem -Recurse -Include *.html | Select-String -Pattern "assets/images/" | ForEach-Object {
    Write-Host "$($_.Filename): $($_.Line)"
}
```
