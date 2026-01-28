# Migration Example: Converting project.html

This shows how easy it is to convert an existing page to use the component system.

## Before (Current project.html)

**Lines 26-51: Navigation (26 lines)**
```html
<header class="bg-white shadow-sm sticky top-0 z-40">
	<nav class="container mx-auto px-6 py-4 flex justify-between items-center">
		<a href="index.html" class="text-2xl font-bold text-gray-800 hover:text-primary transition-colors">DS-Portfolio</a>
		<ul class="flex gap-6">
			<li><a href="homepage.html" class="text-gray-600 hover:text-primary transition-colors">Projects</a></li>
			<li><a href="about.html" class="text-gray-600 hover:text-primary transition-colors">About</a></li>
			<li><a href="resume.html" class="text-gray-600 hover:text-primary transition-colors">Resume</a></li>
			<li><a href="contact.html" class="text-gray-600 hover:text-primary transition-colors">Contact</a></li>
		</ul>
		<div class="flex gap-4">
			<a href="https://www.linkedin.com/in/sumitsc/" target="_blank" class="text-gray-600 hover:text-primary transition-colors" aria-label="LinkedIn">
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447..."/></svg>
			</a>
			<!-- ... 4 more social icons ... -->
		</div>
	</nav>
</header>
```

**Lines 87-106: Footer (20 lines)**
```html
<footer class="bg-gray-800 text-white py-8 mt-12">
	<div class="container mx-auto px-6">
		<div class="flex justify-center gap-6 mb-4">
			<a href="https://www.linkedin.com/in/sumitsc/" target="_blank" class="text-gray-400 hover:text-primary transition-colors" aria-label="LinkedIn">
				<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447..."/></svg>
			</a>
			<!-- ... 4 more social icons ... -->
		</div>
		<p class="text-center text-gray-400">&copy; 2026 · Sumit S. Chaure · Data & Analytics Portfolio</p>
	</div>
</footer>
```

**Total: 46 lines of duplicated code**

## After (Using Component System)

**Line 26: Navigation (1 line)**
```html
<div id="nav-container" data-style="default"></div>
```

**Line 87: Footer (1 line)**
```html
<div id="footer-container" data-style="default"></div>
```

**Line 108: Add component script**
```html
<script src="assets/js/components.js"></script>
```

**Total: 3 lines instead of 46 lines!**

## Benefits

1. **46 lines → 3 lines** (93% reduction)
2. **No duplication** - navigation/footer defined once
3. **Easy updates** - change `components.js`, all pages update
4. **Consistent** - all pages use same navigation automatically
5. **Active state** - current page automatically highlighted

## Time Savings

- **Before**: Add new page = edit 6+ HTML files (navigation + footer in each)
- **After**: Add new page = add 1 line to `components.js` links array

**Estimated time saved per new page: 15-20 minutes**

## Real-World Example

### Adding a "Blog" Page

**Before (Old Way):**
1. Create `blog.html`
2. Copy navigation from `homepage.html` (26 lines)
3. Copy footer from `homepage.html` (20 lines)
4. Update navigation in `index.html`
5. Update navigation in `homepage.html`
6. Update navigation in `about.html`
7. Update navigation in `resume.html`
8. Update navigation in `contact.html`
9. Update navigation in `project.html`
10. Update footer in all 6 files
11. Test all pages

**Total: ~30 minutes, 6 files edited**

**After (Component System):**
1. Create `blog.html` with `<div id="nav-container"></div>`
2. Add one line to `components.js`: `{ text: "Blog", href: "blog.html", key: "blog" }`

**Total: ~2 minutes, 1 file edited**

## Next Steps

1. **Test the component system** on one page first
2. **Migrate pages one by one** (start with `project.html`)
3. **Update `components.js`** with your navigation preferences
4. **Enjoy easier maintenance!**
