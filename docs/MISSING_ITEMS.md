# Missing Items & Pending Tasks

## 🔴 Critical (Required for Functionality)

### 1. Contact Form - Formspree ID
**Status**: ❌ Not configured  
**File**: `contact.html` (line 141)  
**Action Required**:
- Go to https://formspree.io/forms
- Create a new form
- Copy your form ID
- Replace `YOUR_FORM_ID` in `contact.html`:
  ```html
  <form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
  ```

---

## 🟡 Important (Enhancements Requested)

### 2. GitHub Mini Embed on Contact Page
**Status**: ❌ Not implemented  
**File**: `contact.html`  
**Request**: Add a scrollable GitHub iframe showing your GitHub profile/README on the contact page (right side, below social links)  
**Action**: Add iframe in the left column (social media section) of contact page

### 3. Kaggle Icon - Font Awesome
**Status**: ⚠️ Using SVG instead of Font Awesome  
**Files**: All pages with Kaggle links  
**Current**: Custom SVG icon  
**Request**: Use Font Awesome `fa-kaggle` class  
**Note**: Font Awesome is already included (`assets/css/fontawesome-all.min.css`)  
**Action**: Replace SVG with `<i class="fab fa-kaggle"></i>` in:
- `homepage.html`
- `about.html`
- `contact.html`
- `project.html`
- `resume.html`
- `socialhandles.html`
- `index.html` (if applicable)

### 4. Google Fonts Integration
**Status**: ❌ Not implemented  
**Request**: Add modern Google Fonts for typography  
**Action**: 
- Add Google Fonts link to `<head>` of all pages
- Set as Tailwind `font-sans` in config
- Suggested: Inter, Poppins, or Roboto

### 5. Material Icons/Symbols
**Status**: ❌ Not implemented  
**Request**: Add Material Symbols for modern icons  
**Action**: 
- Add Material Symbols CDN to `<head>`
- Replace some SVG icons with Material Symbols
- Optional enhancement

---

## 🟢 Nice to Have (Optional Improvements)

### 6. Giscus Configuration Verification
**Status**: ✅ IDs are set (lines 127-129 in `project.html`)  
**Action**: Verify that the repo-id and category-id are correct:
- Current repo-id: `R_kgDOLETHwQ`
- Current category-id: `DIC_kwDOLETHwc4C0QcF`
- Category: `Project-Comments`

**Note**: If these don't work, follow `docs/GISCUS_SETUP.md` to get new IDs

### 7. Project Structure Cleanup
**Status**: ✅ Mostly done (files moved to `legacy/` and `docs/`)  
**Remaining**: Check for any unused CSS/JS files in `assets/`

### 8. Color Theme Extensions
**Status**: ⚠️ Partially implemented  
**Current**: Theme colors change gradients  
**Request**: Extend color theme changes to:
- Nav underlines
- Accent text colors
- Border colors

---

## 📋 Summary Checklist

- [ ] **Contact Form**: Add Formspree form ID
- [ ] **GitHub Embed**: Add iframe to contact page
- [ ] **Kaggle Icon**: Switch to Font Awesome `fa-kaggle`
- [ ] **Google Fonts**: Add and configure
- [ ] **Material Icons**: Add (optional)
- [ ] **Verify Giscus**: Test comments work
- [ ] **Color Themes**: Extend to nav/accent colors

---

## 🚀 Quick Wins (Can be done in 5-10 mins each)

1. **Formspree ID** - Just copy/paste the form ID
2. **Kaggle Icon** - Replace SVG with Font Awesome class
3. **Google Fonts** - Add one `<link>` tag to all pages

---

## 📝 Notes

- **Giscus**: Already configured with IDs, just needs verification
- **Font Awesome**: Already included, just need to use `fa-kaggle` class
- **Contact Page Layout**: Form is on right, social on left (as requested)
- **GitHub Embed**: This was specifically requested but not yet implemented

---

## 🔍 Files to Update

1. `contact.html` - Formspree ID + GitHub embed
2. All HTML files - Kaggle icon (6 files)
3. All HTML files - Google Fonts link (6 files)
4. `assets/css/custom.css` - Color theme extensions (optional)
