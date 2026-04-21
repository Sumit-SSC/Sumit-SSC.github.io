# Dark Mode & Embed System - Fixes & Guide

## ✅ **Dark Mode Text Readability - FIXED**

### **Issues Fixed:**

1. **Skills Page White Boxes** ✅
   - **Problem:** White background boxes (`.skills-icons-box`, `.skill-card`) kept white in dark mode for icon visibility, but text was inheriting light colors → **white text on white background = invisible**
   - **Fix:** Added explicit dark text (`#1f2937`) for all headings, paragraphs, spans, and labels inside these white containers when in dark mode
   - **Files:** `assets/css/custom.css` (lines ~3424-3454)

2. **Embed Modal (Notebook/Code Viewer)** ✅
   - **Problem:** Modal was hardcoded for dark mode only, not theme-aware
   - **Fix:** Made modal fully theme-aware:
     - **Light mode:** White background, dark text, light gray header
     - **Dark mode:** Dark background (`#1e293b`), light text, dark header
   - **Files:** `assets/css/custom.css` (lines ~824-885)

3. **Artifact Containers (Tools & Stack, Notebook buttons)** ✅
   - **Problem:** Headers and buttons used CSS variables that might not resolve properly
   - **Fix:** Added explicit fallback colors:
     - **Header:** `#475569` (light) / `#9ca3af` (dark)
     - **Buttons:** Proper contrast in both modes
     - **Disabled buttons:** Styled with reduced opacity
   - **Files:** `assets/css/custom.css` (lines ~903-980)

4. **Case Study Cards** ✅
   - **Problem:** Used CSS variables (`var(--text-primary)`) that might not resolve
   - **Fix:** Added explicit colors:
     - **Title:** `#0f172a` (light) / `#e5e7eb` (dark)
     - **Excerpt:** `#475569` (light) / `#9ca3af` (dark)
     - **Tags:** `#f3f4f6` bg with `#475569` text (light) / `#334155` bg with `#9ca3af` text (dark)
   - **Files:** `assets/css/custom.css` (lines ~4364-4475)

5. **Resume Page Filtered Projects** ✅
   - **Problem:** Cards with `bg-white` class could clash in dark mode
   - **Fix:** Explicit dark background (`#1e293b`) and light text (`#e5e7eb`) for filtered project cards
   - **Files:** `assets/css/custom.css` (lines ~1190-1201)

6. **Form Status Messages** ✅
   - **Problem:** `#form-status` could inherit invisible colors
   - **Fix:** Explicit colors: `#374151` (light) / `#e5e7eb` (dark)
   - **Files:** `assets/css/custom.css` (lines ~1178-1188)

---

## 📚 **Embed & Notebook Viewer System - How It Works**

### **Overview:**
The site uses a **modal overlay system** for viewing notebooks, code, and embeds. This keeps pages lightweight and loads heavy content on-demand.

### **Components:**

#### **1. Notebook Embed Function** (`notebookEmbed()` in `main.js`)
- **Location:** `assets/js/main.js` line ~1618
- **What it does:** Creates a button that opens the notebook in a modal
- **Auto-converts GitHub URLs:** If URL is `https://github.com/.../file.ipynb`, automatically converts to `https://nbviewer.org/github/.../file.ipynb` for better rendering
- **Usage:** Called from `linksBlock()` when a project has `notebook_url`

#### **2. Modal System** (`ensureEmbedModal()`, `openEmbedModal()`, `closeEmbedModal()`)
- **Location:** `assets/js/main.js` lines ~1953-2000
- **Features:**
  - Full-screen overlay with backdrop
  - Scrollable iframe container (16:9 aspect ratio)
  - "Open in new tab" link (fallback if iframe blocked)
  - ESC key closes modal
  - Click outside backdrop closes modal
  - Theme-aware styling (light/dark)

#### **3. Button Generation** (`linksBlock()` in `main.js`)
- **Location:** `assets/js/main.js` lines ~2068-2100
- **Logic:**
  - If `notebook_url` exists → Creates "View Notebook" button that opens modal
  - If `kaggle_url` exists → Creates "Kaggle Notebook" link (opens in new tab)
  - If no `notebook_url` but also no `kaggle_url` → Creates disabled "View Notebook" button (template for you to fill later)
  - GitHub code → "View Code" button opens modal
  - Other links → Regular anchor tags

---

## 🔧 **How to Add Notebook Links to Projects**

### **In `data/projects.json`:**

```json
{
  "id": "your-project-id",
  "title": "Your Project",
  "notebook_url": "https://github.com/Sumit-SC/repo/blob/main/notebook.ipynb",
  // OR
  "kaggle_url": "https://www.kaggle.com/mitsu00/your-notebook",
  // ... other fields
}
```

### **Notes:**
- **GitHub `.ipynb` files:** Automatically converted to nbviewer.org URLs (better rendering)
- **Other notebook URLs:** Used as-is (must be publicly accessible)
- **Kaggle:** If `kaggle_url` is present, `notebook_url` is ignored (Kaggle opens in new tab)
- **Missing URL:** Button appears disabled as a template - you can add the URL later

### **Button Location:**
- Appears in the **"Tools & Artifacts"** section on the right sidebar of project pages
- Also in the main content if `linksBlock()` is called in the project template

---

## 🎨 **Dark Mode Coverage**

### **Pages Checked & Fixed:**
- ✅ **Skills Page** - White icon boxes now have dark text in dark mode
- ✅ **Resume Page** - Filtered projects cards, resume panels
- ✅ **Contact Page** - Form inputs, labels, status messages
- ✅ **Project Pages** - Artifact containers, buttons, modal
- ✅ **Case Study Pages** - Cards, tags, excerpts
- ✅ **Homepage** - Project cards, filters
- ✅ **About Page** - Already had proper dark variants

### **Global Rules Applied:**
- All `.dark-theme` and `html.dark-theme` selectors added for consistency
- Fallback colors for CSS variables that might not resolve
- Explicit text colors for headings, paragraphs, buttons, links

---

## ⚠️ **Remaining Things to Watch:**

1. **Dynamic Content:** If you add new sections via JavaScript, ensure they use theme-aware classes (`dark:text-gray-100`, etc.) or check if they inherit properly

2. **Custom HTML:** If you manually add HTML in project/case study content, use Tailwind dark mode classes:
   - `text-gray-800 dark:text-gray-100` for headings
   - `text-gray-600 dark:text-gray-300` for body text
   - `bg-white dark:bg-gray-800` for cards

3. **Images:** All images should have proper `alt` text and use `loading="lazy"` (already implemented)

4. **Modal Testing:** Test the notebook viewer modal in both light and dark modes to ensure readability

---

## 🧪 **Testing Checklist:**

- [ ] Skills page: White boxes readable in dark mode
- [ ] Resume page: Filtered projects readable
- [ ] Contact form: All inputs/labels readable
- [ ] Project pages: "View Notebook" button works, modal is readable
- [ ] Case study cards: Text readable in both modes
- [ ] Artifact containers: Headers and buttons readable
- [ ] Modal: Opens/closes correctly, "Open in new tab" works, ESC closes

---

## 📝 **Quick Reference:**

**To add a notebook to a project:**
1. Edit `data/projects.json`
2. Find your project object
3. Add: `"notebook_url": "https://github.com/.../file.ipynb"`
4. Save - button appears automatically

**To check dark mode:**
- Toggle theme using the theme control in nav
- Check all white/light backgrounds have dark text
- Check all dark backgrounds have light text

**If text is invisible:**
- Check if element has explicit `dark:text-*` class
- Check if parent has white background in dark mode (might need override)
- Add explicit color rule in `custom.css` if needed
