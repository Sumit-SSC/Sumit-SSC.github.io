# Portfolio Rebuild - Original Intent & Plan

## 🎯 **Core Goal**
Rebuild your old portfolio website with **modern improvements** while **keeping the good parts** (page flows, transitions, animations) from your old HTML5 UP-based portfolio.

---

## 📋 **What You Wanted to Keep (From Old Portfolio)**

1. **Page Flows & Transitions**
   - Smooth scroll navigation between sections
   - HTML5 UP-style animations (fade-ins, slide-ins)
   - Full-screen section transitions

2. **Specific Elements**
   - Journey timeline/treemap (left-right horizontal layout)
   - Resume PDF embed with download button
   - Project gallery with popup effects
   - Social icons in navigation

3. **HTML5 UP Theme Structure**
   - **Dimension theme** for landing page (`index.html`)
   - **Massively theme** for dashboard (`homepage.html`)
   - **Big Picture theme** for about page (`about.html`)
   - **Story theme** for journey timeline section

---

## ✨ **What You Wanted to Improve/Add**

1. **Data-Driven Content**
   - All projects loaded from `data/projects.json`
   - Dynamic project cards
   - Single reusable `project.html` page (loads via `?id=project-name`)

2. **Modern Improvements**
   - Better text contrast (especially on about page sections)
   - Cleaner, more professional design
   - Better responsive behavior
   - Improved typography

3. **New Features**
   - Contact form (Formspree integration)
   - Dynamic project pagination
   - Support for embeds: Streamlit, Power BI, videos, PDFs

---

## 🏗️ **Intended Site Structure**

```
/
├── index.html          # Landing (Dimension theme) → Links to homepage.html
├── homepage.html       # Dashboard (Massively theme) → Shows all projects
├── about.html          # About (Big Picture theme) → Full-screen sections + Story timeline
├── contact.html        # Contact form page
├── project.html        # Single project detail (dynamic, loads from JSON)
├── assets/
│   ├── css/
│   │   ├── style.css          # Custom styles (if needed)
│   │   ├── index.css          # Dimension/Spectral theme CSS
│   │   ├── homepage.css       # Massively theme CSS
│   │   └── aboutme.css         # Big Picture theme CSS
│   ├── js/
│   │   ├── main.js            # Your custom JS (project loading, etc.)
│   │   ├── jquery.min.js       # HTML5 UP dependencies
│   │   ├── jquery.scrolly.min.js
│   │   └── [other HTML5 UP JS]
│   └── images/
└── data/
    └── projects.json   # All project data
```

---

## 🎨 **Design Philosophy**

- **Keep HTML5 UP animations/transitions** - Don't recreate them, use the original
- **Use HTML5 UP CSS files directly** - Don't rewrite the styles
- **Add custom JS only for** - Dynamic project loading, form handling
- **Improve contrast/readability** - Fix text visibility issues
- **Maintain page flows** - Keep the smooth navigation experience

---

## ⚠️ **What Went Wrong**

1. **Mixed Approaches**: Combined old HTML5 UP files with new custom code in a confusing way
2. **Lost Custom Improvements**: Some of the modern improvements we made got overwritten
3. **Incomplete Integration**: Data-driven project loading may not work properly with HTML5 UP structure
4. **File Confusion**: Multiple CSS/JS files that may conflict

---

## ✅ **What Should Happen**

1. **Use HTML5 UP themes as-is** for structure and animations
2. **Add your custom JS** (`main.js`) only for:
   - Loading projects from `projects.json`
   - Rendering project cards dynamically
   - Form handling
3. **Keep HTML5 UP CSS** but add small overrides in `style.css` for:
   - Text contrast improvements
   - Custom project card styles
   - Any specific tweaks needed
4. **Maintain separation**: HTML5 UP handles animations, your JS handles data

---

## 🔧 **Next Steps to Fix**

1. **Clarify the approach**: Pure HTML5 UP themes + minimal custom JS for data loading
2. **Test integration**: Make sure `projects.json` loading works with HTML5 UP structure
3. **Fix conflicts**: Ensure custom JS doesn't break HTML5 UP animations
4. **Verify all pages**: Landing → Dashboard → About → Contact → Project Detail

---

## 📝 **Key Questions to Answer**

1. Do you want to use HTML5 UP CSS/JS files directly (as I just did)?
2. Or do you want a hybrid: HTML5 UP structure but with custom CSS that mimics the themes?
3. How important is the data-driven approach vs. hardcoded HTML?

**The confusion likely came from mixing both approaches. We need to pick one path and stick to it.**
