/* ===================================================
   Portfolio JS - Vanilla JavaScript (No jQuery)
   - Handles dynamic project loading
   - Smooth animations
   - Form handling
   =================================================== */

// Initialize on DOM ready
(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

function init() {
  initTheme();             // Light/Dark theme (must be first for color theme)
  
  // Check URL for view mode parameter
  const urlParams = new URLSearchParams(window.location.search);
  const urlViewMode = urlParams.get('view');
  if (urlViewMode && (urlViewMode === 'card' || urlViewMode === 'list')) {
    currentViewMode = urlViewMode;
    localStorage.setItem('viewMode', urlViewMode);
  }
  
  routePage();
  initScrollAnimations();
  initScrollProgress();
  
  // Force theme color application after DOM is ready
  setTimeout(() => {
    const currentTheme = localStorage.getItem('colorTheme') || 'theme-purple';
    applyColorTheme(currentTheme);
  }, 50);
}

/* ---------- THEME (LIGHT / DARK) ---------- */
function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = saved || (prefersDark ? 'dark' : 'light');

  applyTheme(initial);
  // Apply color theme immediately with saved value
  const savedColorTheme = localStorage.getItem('colorTheme') || 'theme-purple';
  applyColorTheme(savedColorTheme);

  // Expose globally
  window.currentTheme = initial;
  window.toggleTheme = () => {
    const next = window.currentTheme === 'dark' ? 'light' : 'dark';
    window.currentTheme = next;
    localStorage.setItem('theme', next);
    applyTheme(next);
    // Re-apply color theme to update text colors for new mode
    const currentColorTheme = localStorage.getItem('colorTheme') || 'theme-purple';
    applyColorTheme(currentColorTheme);
  };

  // Theme + color controls (top-right overlay)
  const container = document.createElement('div');
  container.id = 'theme-controls';
  container.className = 'fixed top-16 right-3 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-white/90 shadow-lg text-xs font-semibold text-gray-800 hover:bg-white transition-colors';

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'px-2 py-1 rounded-full border border-gray-300 hover:bg-gray-100 transition-colors';
  toggleBtn.textContent = initial === 'dark' ? 'Light' : 'Dark';
  toggleBtn.addEventListener('click', () => {
    window.toggleTheme();
    toggleBtn.textContent = window.currentTheme === 'dark' ? 'Light' : 'Dark';
  });

  // Simple accent theme cycle
  const colorBtn = document.createElement('button');
  colorBtn.type = 'button';
  colorBtn.className = 'w-5 h-5 rounded-full border border-gray-300 overflow-hidden';
  const themes = ['theme-purple', 'theme-blue', 'theme-emerald', 'theme-rose', 'theme-orange', 'theme-indigo'];
  const storedTheme = localStorage.getItem('colorTheme') || document.documentElement.dataset.colorTheme || 'theme-purple';
  let colorIndex = themes.indexOf(storedTheme);
  if (colorIndex < 0) colorIndex = 0;
  applyColorTheme(themes[colorIndex]);
  updateColorSwatch(colorBtn, themes[colorIndex]);

  colorBtn.addEventListener('click', () => {
    colorIndex = (colorIndex + 1) % themes.length;
    const nextTheme = themes[colorIndex];
    applyColorTheme(nextTheme);
    updateColorSwatch(colorBtn, nextTheme);
    localStorage.setItem('colorTheme', nextTheme);
  });

  container.appendChild(toggleBtn);
  container.appendChild(colorBtn);
  document.body.appendChild(container);
}

function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark-theme');
  } else {
    root.classList.remove('dark-theme');
  }
}

// Accent color theme helper
function applyColorTheme(name) {
  const root = document.documentElement;
  const stored = localStorage.getItem('colorTheme');
  const theme = name || stored || 'theme-purple';
  root.dataset.colorTheme = theme;
  
  // Color mappings - Modern color palettes
  const colorMap = {
    'theme-purple': { primary: '#667eea', accent: '#764ba2' },      // Purple/Violet
    'theme-blue': { primary: '#3b82f6', accent: '#2563eb' },        // Blue
    'theme-emerald': { primary: '#10b981', accent: '#059669' },    // Green/Emerald
    'theme-rose': { primary: '#f43f5e', accent: '#e11d48' },        // Rose/Pink
    'theme-orange': { primary: '#f97316', accent: '#ea580c' },     // Orange/Amber
    'theme-indigo': { primary: '#6366f1', accent: '#4f46e5' }        // Indigo
  };
  
  const colors = colorMap[theme] || colorMap['theme-purple'];
  
  // Inject dynamic style to override Tailwind classes
  let styleEl = document.getElementById('dynamic-theme-colors');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'dynamic-theme-colors';
    document.head.appendChild(styleEl);
  }
  
  // Determine if dark mode is active
  const isDark = document.documentElement.classList.contains('dark-theme');
  
  // Theme-aware text colors (lighter in dark mode, darker in light mode)
  const textColors = {
    light: {
      heading: '#1f2937',      // Dark gray for headings
      body: '#374151',         // Medium gray for body
      muted: '#6b7280',        // Light gray for muted text
      link: colors.primary,     // Primary color for links
      linkHover: colors.accent // Accent color for link hover
    },
    dark: {
      heading: '#f9fafb',       // Almost white for headings
      body: '#e5e7eb',         // Light gray for body
      muted: '#9ca3af',        // Medium gray for muted text
      link: colors.primary,     // Primary color for links (lighter)
      linkHover: colors.accent // Accent color for link hover
    }
  };
  
  const text = isDark ? textColors.dark : textColors.light;
  
  // Create CSS that overrides all primary color usages with higher specificity
  // Apply to html element to ensure it cascades properly
  styleEl.textContent = `
    /* Primary color overrides */
    html[data-color-theme="${theme}"] .text-primary,
    html[data-color-theme="${theme}"] a.text-primary,
    html[data-color-theme="${theme}"] .hover\\:text-primary:hover,
    html[data-color-theme="${theme}"] a:hover.text-primary,
    html[data-color-theme="${theme}"] a.hover\\:text-primary:hover,
    html[data-color-theme="${theme}"] *[class*="text-primary"] {
      color: ${colors.primary} !important;
    }
    
    /* Theme-aware text colors */
    html[data-color-theme="${theme}"] h1,
    html[data-color-theme="${theme}"] h2,
    html[data-color-theme="${theme}"] h3,
    html[data-color-theme="${theme}"] h4,
    html[data-color-theme="${theme}"] h5,
    html[data-color-theme="${theme}"] h6,
    html[data-color-theme="${theme}"] .text-gray-800,
    html[data-color-theme="${theme}"] .text-gray-900 {
      color: ${text.heading} !important;
    }
    
    html[data-color-theme="${theme}"] p,
    html[data-color-theme="${theme}"] .text-gray-600,
    html[data-color-theme="${theme}"] .text-gray-700,
    html[data-color-theme="${theme}"] body {
      color: ${text.body} !important;
    }
    
    html[data-color-theme="${theme}"] .text-gray-400,
    html[data-color-theme="${theme}"] .text-gray-500 {
      color: ${text.muted} !important;
    }
    
    html[data-color-theme="${theme}"] a:not(.text-primary):not(.hover\\:text-primary) {
      color: ${text.link} !important;
    }
    
    html[data-color-theme="${theme}"] a:not(.text-primary):not(.hover\\:text-primary):hover {
      color: ${text.linkHover} !important;
    }
    html[data-color-theme="${theme}"] .border-primary,
    html[data-color-theme="${theme}"] .focus\\:border-primary:focus,
    html[data-color-theme="${theme}"] *[class*="border-primary"] {
      border-color: ${colors.primary} !important;
    }
    html[data-color-theme="${theme}"] .bg-primary,
    html[data-color-theme="${theme}"] *[class*="bg-primary"] {
      background-color: ${colors.primary} !important;
    }
    html[data-color-theme="${theme}"] .focus\\:ring-primary:focus,
    html[data-color-theme="${theme}"] *[class*="ring-primary"] {
      --tw-ring-color: ${colors.primary} !important;
    }
    html[data-color-theme="${theme}"] .from-primary,
    html[data-color-theme="${theme}"] *[class*="from-primary"] {
      --tw-gradient-from: ${colors.primary} !important;
    }
    html[data-color-theme="${theme}"] .via-accent,
    html[data-color-theme="${theme}"] *[class*="via-accent"] {
      --tw-gradient-to: ${colors.accent} !important;
      --tw-gradient-stops: var(--tw-gradient-from), ${colors.accent}, var(--tw-gradient-to) !important;
    }
    /* Button styles with proper contrast - ALWAYS white text on colored buttons */
    html[data-color-theme="${theme}"] .btn-primary,
    html[data-color-theme="${theme}"] button.bg-primary,
    html[data-color-theme="${theme}"] a.bg-primary,
    html[data-color-theme="${theme}"] .bg-primary.text-white,
    html[data-color-theme="${theme}"] button[class*="bg-primary"],
    html[data-color-theme="${theme}"] a[class*="bg-primary"] {
      background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%) !important;
      color: #ffffff !important;
      border-color: ${colors.primary} !important;
    }
    
    html[data-color-theme="${theme}"] .btn-primary:hover,
    html[data-color-theme="${theme}"] button.bg-primary:hover,
    html[data-color-theme="${theme}"] a.bg-primary:hover,
    html[data-color-theme="${theme}"] .bg-primary.text-white:hover,
    html[data-color-theme="${theme}"] button[class*="bg-primary"]:hover,
    html[data-color-theme="${theme}"] a[class*="bg-primary"]:hover {
      background: linear-gradient(135deg, ${colors.accent} 0%, ${colors.primary} 100%) !important;
      color: #ffffff !important;
      opacity: 0.95;
    }
    
    /* Regular buttons (not primary) - adapt to light/dark mode */
    html[data-color-theme="${theme}"] button:not(.bg-primary):not(.btn-primary):not(.text-white):not(.more),
    html[data-color-theme="${theme}"] a.button:not(.bg-primary):not(.btn-primary):not(.text-white):not(.more) {
      color: ${text.body} !important;
    }
    
    /* Ensure text-white stays white */
    html[data-color-theme="${theme}"] .text-white,
    html[data-color-theme="${theme}"] button.text-white,
    html[data-color-theme="${theme}"] a.text-white {
      color: #ffffff !important;
    }
    
    /* Text colors adapt to mode */
    html[data-color-theme="${theme}"] .text-gray-900,
    html[data-color-theme="${theme}"] button.text-gray-900:not(.bg-primary),
    html[data-color-theme="${theme}"] a.text-gray-900:not(.bg-primary) {
      color: ${text.heading} !important;
    }
    
    html[data-color-theme="${theme}"] .scroll-progress {
      background: linear-gradient(to right, ${colors.primary}, ${colors.accent}) !important;
    }
  `;
  
  // Also update theme-color meta tag for browser UI
  let themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeColorMeta) {
    themeColorMeta = document.createElement('meta');
    themeColorMeta.name = 'theme-color';
    document.head.appendChild(themeColorMeta);
  }
  themeColorMeta.content = colors.primary;
}

function updateColorSwatch(el, theme) {
  let color = '#667eea';
  if (theme === 'theme-blue') color = '#3b82f6';
  if (theme === 'theme-emerald') color = '#10b981';
  el.style.background = color;
}

/* ---------- VIEW MODE TOGGLE (CARD/LIST) ---------- */
let currentViewMode = localStorage.getItem('viewMode') || 'card';

function initViewModeToggle() {
  const cardBtn = document.getElementById('view-card');
  const listBtn = document.getElementById('view-list');
  const projectsGrid = document.getElementById('projects-grid');
  
  if (!cardBtn || !listBtn || !projectsGrid) return;
  
  // Apply saved view mode
  applyViewMode(currentViewMode);
  
  cardBtn.addEventListener('click', () => {
    currentViewMode = 'card';
    localStorage.setItem('viewMode', 'card');
    applyViewMode('card');
    updateViewButtons('card');
  });
  
  listBtn.addEventListener('click', () => {
    currentViewMode = 'list';
    localStorage.setItem('viewMode', 'list');
    applyViewMode('list');
    updateViewButtons('list');
  });
}

function applyViewMode(mode) {
  const container = document.getElementById('projects-grid');
  if (!container) return;
  
  if (mode === 'list') {
    container.classList.remove('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
    container.classList.add('flex', 'flex-col', 'gap-4');
    container.dataset.view = 'list';
  } else {
    container.classList.remove('flex', 'flex-col');
    container.classList.add('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-8');
    container.dataset.view = 'card';
  }
  
  // Re-render projects with new view mode
  const urlParams = new URLSearchParams(window.location.search);
  const page = parseInt(urlParams.get('page')) || 1;
  loadDashboardProjects("projects-grid", page, 9);
}

function updateViewButtons(activeMode) {
  const cardBtn = document.getElementById('view-card');
  const listBtn = document.getElementById('view-list');
  
  if (activeMode === 'card') {
    cardBtn?.classList.add('active', 'bg-primary', 'text-white');
    cardBtn?.classList.remove('text-gray-600', 'hover:bg-gray-200');
    listBtn?.classList.remove('active', 'bg-primary', 'text-white');
    listBtn?.classList.add('text-gray-600', 'hover:bg-gray-200');
  } else {
    listBtn?.classList.add('active', 'bg-primary', 'text-white');
    listBtn?.classList.remove('text-gray-600', 'hover:bg-gray-200');
    cardBtn?.classList.remove('active', 'bg-primary', 'text-white');
    cardBtn?.classList.add('text-gray-600', 'hover:bg-gray-200');
  }
}

/* ---------- ROUTING PER PAGE ---------- */
function routePage() {
  // Load projects for dashboard
  if (document.getElementById("projects-grid")) {
    // 9 per page for first page (3 columns x 3 rows), varied for next pages
    const urlParams = new URLSearchParams(window.location.search);
    const page = parseInt(urlParams.get('page')) || 1;
    const perPage = page === 1 ? 9 : 12; // First page: 9, others: 12
    
    loadDashboardProjects("projects-grid", page, perPage);
    loadPinnedProjects(); // Load pinned/featured projects
    initViewModeToggle(); // Initialize view mode toggle
  }

  // Load project detail page
  if (document.getElementById("project-hero")) {
    loadProjectDetail();
  }

  // Contact form
  if (document.getElementById("contact-form")) {
    initContactForm();
  }

  // Story timeline animations
  if (document.querySelectorAll('.story-item').length > 0) {
    initStoryTimeline();
  }
}

/* ---------- SCROLL ANIMATIONS ---------- */
function initScrollAnimations() {
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animated');
      }
    });
  }, observerOptions);

  document.querySelectorAll('.animate-on-scroll, .story-item').forEach(el => {
    observer.observe(el);
  });
}

/* ---------- SCROLL PROGRESS ---------- */
function initScrollProgress() {
  const progressBar = document.getElementById('scroll-progress');
  if (!progressBar) return;

  window.addEventListener('scroll', () => {
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    progressBar.style.width = scrolled + '%';
  });
}

/* ---------- STORY TIMELINE ---------- */
function initStoryTimeline() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('animated');
        }, index * 200);
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.story-item').forEach(item => {
    observer.observe(item);
  });
}

/* ---------- LOAD PROJECTS FROM JSON ---------- */
async function loadProjects() {
  try {
    const response = await fetch('data/projects.json');
    if (!response.ok) throw new Error('Failed to load projects');
    return await response.json();
  } catch (error) {
    console.error('Error loading projects:', error);
    return [];
  }
}

/* ---------- PINNED PROJECTS LOADING ---------- */
async function loadPinnedProjects() {
  const container = document.getElementById('pinned-grid');
  if (!container) return;

  const projects = await loadProjects();
  const pinned = projects.filter(p => p.featured && p.id !== 'used-car-price').slice(0, 2); // Exclude main featured, get 2 more for 2-column layout

  if (!pinned.length) {
    container.parentElement.style.display = 'none';
    return;
  }

  container.innerHTML = pinned.map(createPinnedProjectCard).join('');
}

function createPinnedProjectCard(project) {
  const tags = (project.tools || []).slice(0, 3).map(t => 
    `<span class="px-2 py-1 text-xs bg-primary/10 text-primary rounded">${t}</span>`
  ).join('');
  const thumbnailUrl = resolveAssetUrl(project, project.thumbnail || '');

  return `
    <article class="bg-white rounded-lg shadow-lg overflow-hidden project-card animate-on-scroll group relative">
      <div class="md:flex">
        <div class="md:w-1/2 relative overflow-hidden">
          <a href="project.html?id=${project.id}" class="block">
            <img src="${thumbnailUrl}" alt="${project.title}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" onerror="this.onerror=null; this.src='assets/images/placeholder.png'; this.alt='${project.title} - Image not available';" loading="lazy">
          </a>
          <!-- Hover Popup Overlay -->
          <div class="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <div class="text-center text-white p-4 max-w-xs">
              <h4 class="text-xl font-bold mb-2">${project.title}</h4>
              <p class="text-sm mb-4 opacity-90 line-clamp-3">${project.short_description || ''}</p>
              <div class="flex flex-wrap gap-3 justify-center text-sm">
                <a href="project.html?id=${project.id}" class="px-4 py-2 bg-primary text-white rounded hover:bg-accent transition-colors">
                  Read Story / Project
                </a>
                ${project.github_url ? `<a href="${project.github_url}" target="_blank" class="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 transition-colors">GitHub</a>` : ''}
                ${project.demo_url ? `<a href="${project.demo_url}" target="_blank" class="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 transition-colors">View Demo</a>` : ''}
              </div>
            </div>
          </div>
        </div>
        <div class="md:w-1/2 p-6">
          <div class="text-sm text-gray-500 mb-2">${project.date || ''}</div>
          <h3 class="text-2xl font-bold text-gray-800 mb-3">
            <a href="project.html?id=${project.id}" class="hover:text-primary transition-colors">${project.title}</a>
          </h3>
          <p class="text-gray-600 text-sm mb-4 line-clamp-3">${project.short_description || ''}</p>
          <div class="flex flex-wrap gap-2 mb-4">${tags}</div>
          <a href="project.html?id=${project.id}" class="inline-block px-4 py-2 bg-primary text-white rounded hover:bg-accent transition-colors text-sm font-semibold">
            Read Story →
          </a>
        </div>
      </div>
    </article>
  `;
}

/* ---------- DASHBOARD PROJECTS LOADING ---------- */
async function loadDashboardProjects(containerId, page = 1, perPage = 9) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const projects = await loadProjects();

  // Optional filter from URL (?filter=Python)
  const urlParams = new URLSearchParams(window.location.search);
  const activeFilter = urlParams.get('filter');

  let list = projects.filter(p => !p.featured);
  if (activeFilter) {
    list = list.filter(p => (p.tools || []).includes(activeFilter));
  }

  const start = (page - 1) * perPage;
  const slice = list.slice(start, start + perPage);
  
  // Get current view mode
  const viewMode = el.dataset.view || currentViewMode || 'card';

  // Show active filter info if present
  const filterInfo = document.getElementById('active-filter');
  if (filterInfo) {
    if (activeFilter) {
      filterInfo.innerHTML = `
        <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
          Tagged: <strong>${activeFilter}</strong>
          <a href="homepage.html" class="ml-2 text-xs text-gray-600 hover:text-primary underline">Clear</a>
        </span>
      `;
    } else {
      filterInfo.innerHTML = '';
    }
  }

  if (!slice.length) {
    el.innerHTML = '<p class="text-gray-500 text-center py-8">No projects found for this filter.</p>';
    renderPagination(list.length, page, perPage);
    return;
  }

  // Render based on view mode
  if (viewMode === 'list') {
    el.innerHTML = slice.map(createDashboardProjectList).join('');
  } else {
    // For page 1: 3 columns uniform grid (after featured section)
    if (page === 1) {
      el.innerHTML = slice.map(createDashboardProjectCard).join('');
    } else {
      // Varied Pinterest-style layouts for subsequent pages
      el.innerHTML = slice.map((project, index) => {
        // Create varied layouts: mix of 1, 2, and 3 column spans
        // Pattern creates visual interest like Pinterest
        const patterns = [
          '',           // 1 column (default)
          'md:col-span-2', // 2 columns
          '',           // 1 column
          'md:col-span-2', // 2 columns
          '',           // 1 column
          'md:col-span-2', // 2 columns
          '',           // 1 column
          'md:col-span-3', // 3 columns (wider)
          '',           // 1 column
        ];
        const layoutClass = patterns[index % patterns.length];
        return createDashboardProjectCard(project, layoutClass);
      }).join('');
    }
  }
  
  renderPagination(list.length, page, perPage);
}

function createDashboardProjectCard(project) {
  const tags = (project.tools || []).slice(0, 3).map(t => 
    `<span class="px-2 py-1 text-xs bg-primary/10 text-primary rounded">${t}</span>`
  ).join('');

  const githubLink = project.github_url ? `<a href="${project.github_url}" target="_blank" class="flex items-center gap-2 text-sm text-gray-200 hover:text-white transition-colors"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> GitHub</a>` : '';

  const thumbnailUrl = resolveAssetUrl(project, project.thumbnail || '');
  return `
    <article class="bg-white rounded-lg shadow-md overflow-hidden project-card animate-on-scroll group relative">
      <div class="relative overflow-hidden">
        <a href="project.html?id=${project.id}" class="block">
          <img src="${thumbnailUrl}" alt="${project.title}" class="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110" onerror="this.onerror=null; this.src='assets/images/placeholder.png'; this.alt='${project.title} - Image not available';" loading="lazy">
        </a>
        <!-- Hover Popup Overlay -->
        <div class="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div class="text-center text-white p-4 max-w-xs">
            <h4 class="text-xl font-bold mb-2">${project.title}</h4>
            <p class="text-sm mb-4 opacity-90 line-clamp-3">${project.short_description || ''}</p>
            <div class="flex flex-wrap gap-3 justify-center text-sm">
              <a href="project.html?id=${project.id}" class="px-4 py-2 bg-primary text-white rounded hover:bg-accent transition-colors">
                Read Story / Project
              </a>
              ${githubLink}
              ${project.demo_url ? `<a href="${project.demo_url}" target="_blank" class="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 transition-colors">View Demo</a>` : ''}
            </div>
          </div>
        </div>
      </div>
      <div class="p-6">
        <h3 class="text-xl font-bold text-gray-800 mb-2">
          <a href="project.html?id=${project.id}" class="hover:text-primary transition-colors">${project.title}</a>
        </h3>
        <p class="text-gray-600 text-sm mb-4 line-clamp-2">${project.short_description || ''}</p>
        <div class="flex flex-wrap gap-2 mb-4">${tags}</div>
        <a href="project.html?id=${project.id}" class="inline-block px-4 py-2 bg-primary text-white rounded hover:bg-accent transition-colors text-sm font-semibold">
          Read Story / Project →
        </a>
      </div>
    </article>
  `;
}

function renderPagination(total, currentPage, perPage) {
  const container = document.getElementById('pagination');
  if (!container) return;

  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  
  // Preserve view mode and filter in pagination URLs
  const viewMode = currentViewMode || 'card';
  const urlParams = new URLSearchParams(window.location.search);
  const activeFilter = urlParams.get('filter');
  
  // Build URL helper
  const buildUrl = (pageNum) => {
    const params = new URLSearchParams();
    if (pageNum > 1) params.set('page', pageNum);
    if (activeFilter) params.set('filter', activeFilter);
    if (viewMode === 'list') params.set('view', 'list');
    return params.toString() ? `homepage.html?${params.toString()}` : 'homepage.html';
  };

  let html = '';
  
  if (currentPage > 1) {
    html += `<a href="${buildUrl(currentPage - 1)}" class="px-4 py-2 bg-white rounded hover:bg-gray-100 transition-colors">Prev</a>`;
  }

  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      html += `<span class="px-4 py-2 bg-primary text-white rounded">${i}</span>`;
    } else {
      html += `<a href="${buildUrl(i)}" class="px-4 py-2 bg-white rounded hover:bg-gray-100 transition-colors">${i}</a>`;
    }
  }

  if (currentPage < totalPages) {
    html += `<a href="${buildUrl(currentPage + 1)}" class="px-4 py-2 bg-white rounded hover:bg-gray-100 transition-colors">Next</a>`;
  }

  container.innerHTML = html;

  // Handle pagination clicks
  container.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const url = new URL(link.href);
      const page = parseInt(url.searchParams.get('page') || '1');
      loadDashboardProjects('projects-grid', page, perPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
					});
				});
}

/* ---------- PROJECT DETAIL PAGE ---------- */
async function loadProjectDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  if (!projectId) return;

  const projects = await loadProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  renderProject(project);
}

function renderProject(project) {
  document.title = `${project.title} | Sumit S. Chaure`;

  const hero = document.getElementById("project-hero");
  if (hero) {
    hero.innerHTML = `
      <div class="container mx-auto px-6 py-16 text-center">
        <div class="text-sm text-gray-500 mb-4">
          <span>${project.category || "Analytics"}</span>
          ${project.date ? ` • <span>${project.date}</span>` : ""}
        </div>
        <h1 class="text-4xl md:text-6xl font-bold text-gray-800 mb-6">${project.title}</h1>
        <p class="text-xl text-gray-600 max-w-2xl mx-auto mb-8">${project.short_description || ""}</p>
        <div class="flex gap-4 justify-center">
          ${project.github_url ? `<a href="${project.github_url}" target="_blank" class="px-6 py-3 bg-primary text-white rounded-lg hover:bg-accent transition-colors font-semibold">GitHub</a>` : ""}
          ${project.demo_url ? `<a href="${project.demo_url}" target="_blank" class="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold">Live Demo</a>` : ""}
        </div>
      </div>
    `;
  }

  // Build sections with IDs for TOC
  const sections = [];
  if (project.full_description) sections.push({ id: 'overview', title: 'Overview', content: project.full_description });
  if (project.problem_statement) sections.push({ id: 'problem', title: 'Problem Statement', content: project.problem_statement });
  if (project.approach) sections.push({ id: 'approach', title: 'Approach / Methodology', content: project.approach });
  if (project.insights) sections.push({ id: 'insights', title: 'Insights & Outcomes', content: project.insights });
  if (project.streamlit_url) sections.push({ id: 'streamlit', title: 'Streamlit App', content: streamlitEmbed(project.streamlit_url), isMedia: true });
  if (project.powerbi_embed_url || project.pbix_download_path) sections.push({ id: 'powerbi', title: 'Power BI Dashboard', content: powerBiBlock(project.powerbi_embed_url, project.pbix_download_path, project), isMedia: true });
  if (project.video_url) sections.push({ id: 'video', title: 'Video Walkthrough', content: videoEmbed(project.video_url), isMedia: true });
  if (project.images && project.images.length > 0) sections.push({ id: 'gallery', title: 'Gallery', content: galleryBlock(project.images, project), isMedia: true });
  if (project.slide_pdf_path) sections.push({ id: 'slides', title: 'Slides / PDF', content: pdfEmbed(project.slide_pdf_path, project), isMedia: true });

  const main = document.getElementById("project-main");
  if (main) {
    main.innerHTML = sections.map(s => section(s.title, s.content, s.id, s.isMedia)).join('');
  }

  // Generate TOC
  const tocNav = document.getElementById("toc-nav");
  if (tocNav) {
    tocNav.innerHTML = sections.map(s => 
      `<a href="#${s.id}" class="block text-sm text-gray-600 hover:text-primary transition-colors py-1 toc-link" data-section="${s.id}">${s.title}</a>`
    ).join('');
    
    // Add scroll spy for TOC
    initTOCScrollSpy();
  }

  const side = document.getElementById("project-side");
  if (side) {
    side.innerHTML = `
      ${toolsBlock(project.tools, project.id)}
      ${linksBlock(project)}
    `;
    
    // Make tools clickable
    initClickableTools();
  }
}

function section(title, content, id = null, isMedia = false) {
  if (!content) return "";
  const sectionId = id || title.toLowerCase().replace(/\s+/g, '-');
  return `
    <section id="${sectionId}" class="mb-12 scroll-mt-24">
      <h2 class="text-3xl font-bold text-gray-800 mb-4">${title}</h2>
      ${isMedia ? `<div class="bg-gray-100 rounded-lg p-4">${content}</div>` : `<p class="text-gray-600 leading-relaxed">${content}</p>`}
    </section>
  `;
}

function mediaBlock(title, content) {
  if (!content) return "";
  const sectionId = title.toLowerCase().replace(/\s+/g, '-');
  return `
    <section id="${sectionId}" class="mb-12 scroll-mt-24">
      <h2 class="text-3xl font-bold text-gray-800 mb-4">${title}</h2>
      <div class="bg-gray-100 rounded-lg p-4">${content}</div>
    </section>
  `;
}

/* ---------- ASSET URL RESOLVER ---------- */
/**
 * Resolves asset URLs from project repositories or local paths
 * Supports:
 * - Full URLs (http/https)  → used as-is
 * - GitHub repo assets      → constructs raw.githubusercontent.com URL
 * - Local paths (assets/..) → used as-is
 */
function resolveAssetUrl(project, assetPath) {
  if (!assetPath) return '';
  
  // If already a full URL, use as-is
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://')) {
    return assetPath;
  }
  
  // If project has assets_repo, construct GitHub raw URL
  if (project.assets_repo) {
    const repo = project.assets_repo;
    const branch = project.assets_branch || 'main';
    
    // Remove leading slash if present
    const cleanPath = assetPath.startsWith('/') ? assetPath.slice(1) : assetPath;
    
    // Construct GitHub raw content URL
    return `https://raw.githubusercontent.com/${repo}/${branch}/${cleanPath}`;
  }
  
  // Local paths – we now assume everything is in the new structure.
  // Do not rewrite; just return as-is unless it's clearly a root path.
  // Don't modify paths that already start with ./, /, or are in assets/
  if (!assetPath.startsWith('./') && !assetPath.startsWith('/') && !assetPath.startsWith('assets/')) {
    return assetPath; // Use as-is
  }
  
  return assetPath;
}

function streamlitEmbed(url) {
  return `<iframe src="${url}?embed=true" width="100%" height="600" frameborder="0"></iframe>`;
}

function powerBiBlock(embedUrl, downloadPath, project = null) {
  if (embedUrl) {
    return `<iframe src="${embedUrl}" width="100%" height="600" frameborder="0"></iframe>`;
  } else if (downloadPath) {
    const resolvedUrl = project ? resolveAssetUrl(project, downloadPath) : downloadPath;
    return `<a href="${resolvedUrl}" download class="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-accent transition-colors font-semibold">Download PBIX File</a>`;
  }
  return "";
}

function videoEmbed(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    if (videoId) {
      return `<iframe width="100%" height="500" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
  }
  return `<video controls width="100%"><source src="${url}" type="video/mp4"></video>`;
}

function pdfEmbed(path, project = null) {
  const resolvedPath = project ? resolveAssetUrl(project, path) : path;
  return `<iframe src="${resolvedPath}" width="100%" height="600" frameborder="0"></iframe>`;
}

function galleryBlock(images, project = null) {
  if (!images || images.length === 0) return "";
  const resolvedImages = project 
    ? images.map(img => resolveAssetUrl(project, img))
    : images;
  return `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      ${resolvedImages.map(img => `<img src="${img}" alt="Project image" class="w-full rounded-lg shadow-md gallery-item" onerror="this.onerror=null; this.src='assets/images/placeholder.png'; this.alt='Image not available';">`).join('')}
    </div>
  `;
}

function toolsBlock(tools, projectId) {
  if (!tools || tools.length === 0) return "";
  return `
    <div class="bg-gray-50 rounded-lg p-6 mb-6">
      <h3 class="text-xl font-bold text-gray-800 mb-4">Tools & Stack</h3>
      <div class="flex flex-wrap gap-2">
        ${tools.map(t => `<button class="tool-badge px-3 py-1 bg-primary text-white rounded text-sm cursor-pointer hover:bg-accent transition-colors" data-tool="${t}" data-project-id="${projectId}">${t}</button>`).join('')}
      </div>
    </div>
  `;
}

// Initialize clickable tools
function initClickableTools() {
  document.querySelectorAll('.tool-badge').forEach(badge => {
    badge.addEventListener('click', async () => {
      const tool = badge.dataset.tool;
      // Redirect to homepage with filter parameter
      window.location.href = `homepage.html?filter=${encodeURIComponent(tool)}`;
    });
  });
}

// Initialize TOC scroll spy
function initTOCScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const tocLinks = document.querySelectorAll('.toc-link');
  
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (window.pageYOffset >= sectionTop - 200) {
        current = section.getAttribute('id');
      }
    });
    
    tocLinks.forEach(link => {
      link.classList.remove('text-primary', 'font-semibold');
      if (link.dataset.section === current) {
        link.classList.add('text-primary', 'font-semibold');
      }
    });
  });
  
  // Smooth scroll for TOC links
  tocLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

function linksBlock(project) {
  const links = [];
  if (project.github_url) links.push(`<a href="${project.github_url}" target="_blank" class="block px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors mb-2">GitHub</a>`);
  if (project.demo_url) links.push(`<a href="${project.demo_url}" target="_blank" class="block px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors mb-2">Live Demo</a>`);
  if (project.medium_url) links.push(`<a href="${project.medium_url}" target="_blank" class="block px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors mb-2">Medium</a>`);
  if (project.kaggle_url) links.push(`<a href="${project.kaggle_url}" target="_blank" class="block px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors mb-2">Kaggle</a>`);
  
  if (links.length === 0) return "";
  return `
    <div class="bg-gray-50 rounded-lg p-6">
      <h3 class="text-xl font-bold text-gray-800 mb-4">Links</h3>
      ${links.join('')}
    </div>
  `;
}

/* ---------- CONTACT FORM ---------- */
function initContactForm() {
  const form = document.getElementById("contact-form");
  if (!form) return;

  // Create status message element if it doesn't exist
  let statusDiv = form.querySelector('#form-status');
  if (!statusDiv) {
    statusDiv = document.createElement('div');
    statusDiv.id = 'form-status';
    statusDiv.className = 'mt-4 text-center text-sm';
    form.appendChild(statusDiv);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = form.querySelector('#email').value;
    const name = form.querySelector('#name').value || '';
    const subject = form.querySelector('#subject').value || 'Portfolio Contact';
    const message = form.querySelector('#message').value || '';
    
    if (!email) {
      statusDiv.className = 'mt-4 text-center text-sm text-red-600';
      statusDiv.textContent = 'Email is required';
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Sending...';
    statusDiv.textContent = '';
    statusDiv.className = 'mt-4 text-center text-sm';

    try {
      const formData = new FormData();
      formData.append('email', email);
      if (name) formData.append('name', name);
      if (subject) formData.append('subject', subject);
      if (message) formData.append('message', message);

      // Use Formspree endpoint (user needs to replace YOUR_FORM_ID)
      const formAction = form.action || 'https://formspree.io/f/YOUR_FORM_ID';
      const response = await fetch(formAction, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        statusDiv.className = 'mt-4 text-center text-sm text-green-600';
        statusDiv.textContent = 'Message sent successfully! I\'ll get back to you soon.';
        form.reset();
      } else {
        const data = await response.json();
        if (data.errors) {
          statusDiv.className = 'mt-4 text-center text-sm text-red-600';
          statusDiv.textContent = data.errors.map(error => error.message).join(', ');
        } else {
          throw new Error('Form submission failed');
        }
      }
    } catch (error) {
      statusDiv.className = 'mt-4 text-center text-sm text-red-600';
      statusDiv.textContent = 'Oops! There was a problem sending your message. Please try again or email me directly at sumitsc.work@gmail.com';
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}
