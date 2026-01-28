# Component System Guide

This component system allows you to manage navigation, header, and footer from a **single configuration file** instead of editing every HTML file.

## How It Works

The component system (`assets/js/components.js`) automatically loads shared components (navigation, footer) into your pages. You configure everything in one place, and all pages update automatically.

## Quick Start

### 1. Add Component Containers to Your HTML

Replace your existing navigation and footer with simple containers:

**Before (duplicated in every file):**
```html
<header class="bg-white shadow-sm sticky top-0 z-40">
  <nav class="container mx-auto px-6 py-4 flex justify-between items-center">
    <!-- 50+ lines of navigation code -->
  </nav>
</header>
```

**After (one line):**
```html
<div id="nav-container" data-style="default"></div>
```

### 2. Include the Component Script

Add this to your HTML `<head>` or before `</body>`:

```html
<script src="assets/js/components.js"></script>
```

### 3. Update Configuration

Edit `assets/js/components.js` to change navigation links, social media, etc. All pages update automatically!

## Configuration

All configuration is in `assets/js/components.js`:

### Navigation Links

```javascript
const NAV_CONFIG = {
  brand: {
    text: "DS-Portfolio",
    link: "index.html"
  },
  links: [
    { text: "Projects", href: "homepage.html", key: "projects" },
    { text: "About", href: "about.html", key: "about" },
    { text: "Resume", href: "resume.html", key: "resume" },
    { text: "Contact", href: "contact.html", key: "contact" }
  ],
  // ...
};
```

**To add a new page:**
1. Add entry to `links` array
2. That's it! All pages will show the new link

### Social Media Links

```javascript
social: [
  { 
    name: "LinkedIn", 
    href: "https://www.linkedin.com/in/sumitsc/", 
    icon: `<svg>...</svg>`
  },
  // ...
]
```

## Usage Examples

### Example 1: Standard Page (Tailwind Style)

```html
<!DOCTYPE html>
<html>
<head>
  <title>About | Sumit S. Chaure</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="assets/css/custom.css" />
</head>
<body>
  <!-- Navigation (auto-loaded) -->
  <div id="nav-container" data-style="default"></div>
  
  <!-- Your page content -->
  <main>
    <h1>About Me</h1>
    <!-- ... -->
  </main>
  
  <!-- Footer (auto-loaded) -->
  <div id="footer-container" data-style="default"></div>
  
  <script src="assets/js/components.js"></script>
  <script src="assets/js/main.js"></script>
</body>
</html>
```

### Example 2: Spectral Landing Page

```html
<!DOCTYPE html>
<html>
<head>
  <title>Sumit Data Science Landing Page</title>
  <link rel="stylesheet" href="_backup_old_portfolio/assets/css/index.css" />
</head>
<body>
  <!-- Spectral-style navigation -->
  <div id="nav-container" data-style="spectral"></div>
  
  <!-- Your content -->
  <section id="banner">
    <!-- ... -->
  </section>
  
  <!-- Spectral-style footer -->
  <div id="footer-container" data-style="spectral"></div>
  
  <script src="assets/js/components.js"></script>
</body>
</html>
```

### Example 3: Custom Container ID

```html
<!-- Use custom IDs -->
<div id="my-nav" data-component="navigation" data-style="default"></div>
<div id="my-footer" data-component="footer" data-style="default"></div>
```

## Available Styles

- **`default`**: Tailwind CSS style (for most pages)
- **`spectral`**: HTML5 UP Spectral theme style (for landing page)
- **`minimal`**: Minimal style (future)

## Adding a New Page

### Step 1: Create HTML File

```html
<!DOCTYPE html>
<html>
<head>
  <title>New Page | Sumit S. Chaure</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="assets/css/custom.css" />
</head>
<body>
  <div id="nav-container"></div>
  
  <main>
    <h1>New Page Content</h1>
  </main>
  
  <div id="footer-container"></div>
  
  <script src="assets/js/components.js"></script>
</body>
</html>
```

### Step 2: Add to Navigation (Optional)

If you want it in the navigation menu, edit `assets/js/components.js`:

```javascript
links: [
  // ... existing links
  { text: "New Page", href: "new-page.html", key: "newpage" }
]
```

That's it! The new page will automatically have navigation and footer.

## Benefits

✅ **Single Source of Truth**: Update navigation once, all pages update  
✅ **No Duplication**: No more copying/pasting header/footer code  
✅ **Easy Maintenance**: Change links in one place  
✅ **Consistent**: All pages use the same navigation automatically  
✅ **Active State**: Current page is automatically highlighted  
✅ **Flexible**: Supports different styles per page

## Advanced Usage

### Manual Rendering

If you need to render components manually:

```javascript
// Render navigation
NavComponents.renderNavigation('my-nav-container', { style: 'default' });

// Render footer
NavComponents.renderFooter('my-footer-container', { style: 'default' });
```

### Access Configuration

```javascript
// Get navigation config
const config = NavComponents.config;

// Modify and re-render
config.links.push({ text: "New Link", href: "new.html", key: "new" });
NavComponents.renderNavigation('nav-container');
```

## Migration Guide

### Step 1: Backup Your Files

```bash
cp homepage.html homepage.html.backup
```

### Step 2: Replace Navigation

**Find:**
```html
<header class="bg-white shadow-sm sticky top-0 z-40">
  <nav class="container mx-auto px-6 py-4">
    <!-- ... 50+ lines ... -->
  </nav>
</header>
```

**Replace with:**
```html
<div id="nav-container" data-style="default"></div>
```

### Step 3: Replace Footer

**Find:**
```html
<footer class="bg-gray-800 text-white py-8">
  <!-- ... 30+ lines ... -->
</footer>
```

**Replace with:**
```html
<div id="footer-container" data-style="default"></div>
```

### Step 4: Add Script

Add before `</body>`:
```html
<script src="assets/js/components.js"></script>
```

### Step 5: Test

Open the page and verify navigation/footer appear correctly.

## Troubleshooting

### Components Not Appearing

1. **Check script is loaded**: Open browser console, type `NavComponents` - should show object
2. **Check container ID**: Ensure `id="nav-container"` or `id="footer-container"` exists
3. **Check script order**: Load `components.js` before other scripts that might need it

### Active Link Not Highlighted

- Ensure page file name matches the `key` in `NAV_CONFIG.links`
- Check `getCurrentPageKey()` function maps your page correctly

### Styling Issues

- Ensure Tailwind CSS is loaded for `default` style
- Ensure Spectral CSS is loaded for `spectral` style
- Check `data-style` attribute matches your page's CSS

## Future Enhancements

- [ ] More style options (minimal, dark, etc.)
- [ ] Breadcrumb component
- [ ] Sidebar component
- [ ] Mobile menu component
- [ ] Configuration via JSON file
