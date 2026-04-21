/* ===================================================
   Portfolio JS - Vanilla JavaScript (No jQuery)
   - Handles dynamic project loading
   - Smooth animations
   - Form handling
   =================================================== */

// Base path: root has only index.html; other pages live in pages/
function getBasePath() {
  return window.location.pathname.includes('/pages/') ? '' : 'pages/';
}
function getHomeUrl() {
  // When in pages/, return homepage.html (projects page)
  // When in root, return index.html (main landing page)
  return getBasePath() === 'pages/' ? 'index.html' : 'homepage.html';
}
// Data path: same for fetch so it works from root and from pages/
function getDataBase() {
  return window.location.pathname.includes('/pages/') ? '../data/' : 'data/';
}

const FEATURED_ORDER = [
  "fraud-intelligence-and-risk-analytics",
  "e-commerce-product-analytics",
  "churn-retention-analytics",
  "ai-governance-workbench"
];
const FIRST_PAGE_COUNT = 6;
const REST_PAGE_COUNT = 6;

// Grouped project filters: one URL param matches any of these tools
const FILTER_GROUPS = {
  'Python': ['Python'],
  'SQL': ['SQL', 'MySQL', 'PostgreSQL', 'DuckDB', 'SQL Server', 'Oracle', 'MongoDB'],
  'Data viz': ['Matplotlib', 'Seaborn', 'Plotly'],
  'Data cleaning': ['NumPy', 'pandas'],
  'A/B Testing': ['A/B Testing', 'A/B Test', 'AB Testing', 'Hypothesis Testing'],
  'Statistical Analysis': ['Statistical Analysis', 'Statistics', 'Hypothesis Testing', 'A/B Testing'],
  'Web scraping': ['Beautiful Soup', 'Scrapy', 'Selenium', 'requests', 'pandas'],
  'Git': ['Git', 'GitHub'],
  'Excel': ['Excel'],
  'BI tools': ['Power BI', 'Tableau', 'Excel', 'Apache Superset', 'DAX'],
  'Web-dev': ['HTML', 'CSS', 'JavaScript'],
  'Notebook': ['Jupyter', 'VS Code', 'Google Colab', 'Anaconda', 'R (learning)']
};

function stripHtmlToText(html) {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function editorBlocksToHtml(editorContent) {
  const blocks = Array.isArray(editorContent?.blocks) ? editorContent.blocks : [];
  if (!blocks.length) return "";
  const out = [];
  for (const b of blocks) {
    if (!b || !b.type) continue;
    const d = b.data || {};
    if (b.type === "header") {
      const level = Math.min(4, Math.max(2, Number(d.level || 2)));
      out.push(`<h${level} class="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-8 mb-3">${escapeHtml(d.text || "")}</h${level}>`);
      continue;
    }
    if (b.type === "paragraph") {
      // Editor.js paragraph text may contain safe inline HTML from the editor itself; we keep it minimal.
      out.push(`<p class="text-gray-600 dark:text-gray-300 leading-relaxed">${d.text || ""}</p>`);
      continue;
    }
    if (b.type === "list") {
      const style = String(d.style || "unordered");
      const items = Array.isArray(d.items) ? d.items : [];
      const tag = style === "ordered" ? "ol" : "ul";
      const li = items.map((it) => `<li>${typeof it === "string" ? it : escapeHtml(String(it ?? ""))}</li>`).join("");
      out.push(`<${tag} class="list-disc pl-6 space-y-1 text-gray-600 dark:text-gray-300">${li}</${tag}>`);
      continue;
    }
    if (b.type === "image") {
      const raw = String(d.url || d.file?.url || "").trim();
      if (!raw) continue;
      const src = escapeHtml(raw);
      const capHtml = String(d.caption || "");
      const altText = stripHtmlToText(capHtml).slice(0, 160);
      out.push(
        `<figure class="my-6"><img src="${src}" alt="${escapeHtml(altText)}" class="w-full rounded-lg border border-gray-200 dark:border-gray-700"/><figcaption class="text-sm text-gray-500 dark:text-gray-400 mt-2">${capHtml}</figcaption></figure>`
      );
      continue;
    }
    if (b.type === "code") {
      out.push(`<pre class="rounded-lg bg-slate-900 text-slate-100 p-4 overflow-auto text-sm"><code>${escapeHtml(d.code || "")}</code></pre>`);
      continue;
    }
    if (b.type === "embed") {
      const url = String(d.source || d.embed || "").trim();
      if (!url) continue;
      out.push(`<p class="text-sm"><a class="text-primary hover:underline" href="${escapeHtml(url)}" target="_blank" rel="noopener">Open embed</a></p>`);
      continue;
    }
  }
  return out.join("\n");
}

function truncateText(text, maxLen = 120) {
  if (!text) return '';
  const t = String(text);
  return t.length > maxLen ? t.substring(0, maxLen - 3) + '...' : t;
}

function extractFirstListItemText(html) {
  const match = (html || '').match(/<li[^>]*>([\s\S]*?)<\/li>/i);
  if (!match) return '';
  return stripHtmlToText(match[1]);
}

function extractFirstListItemsText(html, maxItems = 3) {
  const list = [];
  if (!html) return list;
  const re = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let m = null;
  while ((m = re.exec(html)) !== null) {
    if (!m[1]) continue;
    const item = stripHtmlToText(m[1]);
    if (item) list.push(item);
    if (list.length >= maxItems) break;
  }
  return list;
}

function slugifyHeading(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function getImpactPreview(project) {
  const impact = extractFirstListItemText(project?.insights || '');
  return impact ? truncateText(impact, 110) : '';
}

function setMetaContent(selector, content) {
  if (!content) return;
  const el = document.querySelector(selector);
  if (el) el.setAttribute('content', content);
}

function renderCaseStudyQuickSummary(caseStudy, rootEl) {
  const wrap = document.getElementById('case-study-quick-summary');
  if (!wrap) return;
  // Disable auto-generated key takeaways for now; keep section hidden.
  wrap.classList.add('hidden');
  wrap.innerHTML = '';
}

function renderCaseStudyTOC(rootEl) {
  const tocWrap = document.getElementById('case-study-toc-wrap');
  const toc = document.getElementById('case-study-toc');
  const tocSelect = document.getElementById('case-study-toc-select');
  if (!tocWrap || !toc || !rootEl) return;

  const headings = Array.from(rootEl.querySelectorAll('h2, h3'));
  if (!headings.length) {
    tocWrap.classList.add('hidden');
    toc.innerHTML = '';
    if (tocSelect) {
      tocSelect.innerHTML = '<option value="">Select a section…</option>';
      tocSelect.classList.add('hidden');
    }
    return;
  }

  const usedIds = new Set();
  const items = headings.map((heading) => {
    const label = heading.textContent?.trim();
    if (!label) return null;
    let id = heading.id || slugifyHeading(label);
    if (!id) return null;
    let uniqueId = id;
    let i = 2;
    while (usedIds.has(uniqueId)) {
      uniqueId = `${id}-${i}`;
      i += 1;
    }
    usedIds.add(uniqueId);
    heading.id = uniqueId;
    const isSub = heading.tagName.toLowerCase() === 'h3';
    return `
      <a href="#${uniqueId}" class="text-sm ${isSub ? 'pl-4 text-gray-600 dark:text-gray-300' : 'font-medium text-gray-800 dark:text-gray-100'} hover:text-primary transition-colors">
        ${escapeHtml(label)}
      </a>
    `;
  }).filter(Boolean);

  if (!items.length) {
    tocWrap.classList.add('hidden');
    toc.innerHTML = '';
    if (tocSelect) {
      tocSelect.innerHTML = '<option value="">Select a section…</option>';
      tocSelect.classList.add('hidden');
    }
    return;
  }

  tocWrap.classList.remove('hidden');
  toc.innerHTML = items.join('');
  if (tocSelect) {
    tocSelect.classList.remove('hidden');
    tocSelect.innerHTML = '<option value="">Select a section…</option>';
    headings.forEach((heading) => {
      if (!heading.id || !heading.textContent) return;
      const opt = document.createElement('option');
      opt.value = heading.id;
      opt.textContent = heading.textContent.trim();
      tocSelect.appendChild(opt);
    });
    tocSelect.onchange = () => {
      const id = tocSelect.value;
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      const headerOffset = 100;
      const top = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
      window.scrollTo({ top, behavior: 'smooth' });
    };
  }
}

// Initialize on DOM ready
(function() {
  function boot() {
    init();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

async function init() {
  if (window.__HOMEPAGE_UI_READY__) {
    try {
      await window.__HOMEPAGE_UI_READY__;
    } catch (e) {
      window.__HOMEPAGE_UI__ = window.__HOMEPAGE_UI__ || {};
    }
  }
  if (window.__HOMEPAGE_CONTENT_READY__) {
    try {
      await window.__HOMEPAGE_CONTENT_READY__;
    } catch (e) {
      window.__HOMEPAGE_CONTENT__ = window.__HOMEPAGE_CONTENT__ || {};
    }
  }
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
  initTapRipple();
  initHomepageSectionTabs();
  
  // Force theme color application after DOM is ready
  setTimeout(() => {
    const currentTheme = localStorage.getItem('colorTheme') || 'theme-indigo';
    applyColorTheme(currentTheme);
  }, 50);
}

/* ---------- THEME (LIGHT / DARK) ---------- */
function initTheme() {
  const defaults = window.__SITE_THEME_DEFAULTS__ || {};
  const defaultMode = defaults.defaultMode || 'system';
  const defaultColorTheme = defaults.defaultColorTheme || 'theme-custom';
  const saved = localStorage.getItem('theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const resolvedDefaultMode = defaultMode === 'system' ? (prefersDark ? 'dark' : 'light') : defaultMode;
  const initial = saved && saved !== 'system' ? saved : resolvedDefaultMode;

  applyTheme(initial);
  // Apply color theme immediately with saved value
  const savedColorTheme = localStorage.getItem('colorTheme') || defaultColorTheme;
  applyColorTheme(savedColorTheme);

  // Expose globally
  window.currentTheme = initial;
  window.toggleTheme = () => {
    const next = window.currentTheme === 'dark' ? 'light' : 'dark';
    window.currentTheme = next;
    localStorage.setItem('theme', next);
    applyTheme(next);
    // Re-apply color theme to update text colors for new mode
    const currentColorTheme = localStorage.getItem('colorTheme') || defaultColorTheme;
    applyColorTheme(currentColorTheme);
  };

  // Theme + color controls - Add to navigation if it exists, otherwise create floating controls
  const nav = document.getElementById('nav');
  // Palette used by the color picker (distinct looks)
  const themes = ['theme-custom', 'theme-indigo', 'theme-orange', 'theme-emerald', 'theme-purple'];
  const storedTheme = localStorage.getItem('colorTheme') || document.documentElement.dataset.colorTheme || defaultColorTheme;
  let colorIndex = themes.indexOf(storedTheme);
  if (colorIndex < 0) colorIndex = 0;
  const resolvedTheme = themes[colorIndex];
  applyColorTheme(resolvedTheme);
  // Migrate any legacy stored theme names to the new set
  if (storedTheme !== resolvedTheme) localStorage.setItem('colorTheme', resolvedTheme);

  // Avoid duplicating controls if initTheme() runs more than once
  const existingControls = document.getElementById('theme-controls');
  if (existingControls) {
    const existingToggleBtn = existingControls.querySelector('button');
    if (existingToggleBtn) {
      existingToggleBtn.innerHTML =
        window.currentTheme === 'dark'
          ? '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg> Light'
          : '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg> Dark';
    }

    const existingColorBtn = existingControls.querySelector('.theme-color-swatch');
    if (existingColorBtn) updateColorSwatch(existingColorBtn, themes[colorIndex]);
    return;
  }

  if (nav) {
    // Add controls to navigation bar
    const controlsContainer = document.createElement('div');
    controlsContainer.id = 'theme-controls';
    controlsContainer.className = 'flex items-center gap-2 ml-4';

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'px-3 py-1.5 rounded-md border border-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors';
    toggleBtn.innerHTML = initial === 'dark' ? '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg> Light' : '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg> Dark';
    toggleBtn.title = 'Toggle Dark/Light Mode';
    toggleBtn.addEventListener('click', () => {
      window.toggleTheme();
      toggleBtn.innerHTML = window.currentTheme === 'dark' ? '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg> Light' : '<svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg> Dark';
    });

    const colorBtn = document.createElement('button');
    colorBtn.type = 'button';
    colorBtn.className = 'w-8 h-8 rounded-full border-2 border-gray-300 dark:border-gray-600 overflow-hidden shadow-sm hover:shadow-md transition-all theme-color-swatch';
    colorBtn.title = 'Change Theme Color (Click to cycle)';
    updateColorSwatch(colorBtn, themes[colorIndex]);

    colorBtn.addEventListener('click', () => {
      colorIndex = (colorIndex + 1) % themes.length;
      const nextTheme = themes[colorIndex];
      applyColorTheme(nextTheme);
      updateColorSwatch(colorBtn, nextTheme);
      localStorage.setItem('colorTheme', nextTheme);
    });

    controlsContainer.appendChild(toggleBtn);
    controlsContainer.appendChild(colorBtn);
    
    // Insert before social icons list - try multiple selectors for different page structures
    const socialList =
      nav.querySelector('ul.flex.gap-4') ||
      nav.querySelector('div.flex.gap-4') ||
      nav.querySelector('div.flex.gap-3');
    if (socialList && socialList.parentElement) {
      socialList.parentElement.insertBefore(controlsContainer, socialList);
    } else {
      // Fallback: find the flex container with items-center gap-4 or any flex gap-4
      const flexContainer =
        nav.querySelector('.flex.items-center.gap-4') ||
        nav.querySelector('.flex.items-center.gap-3') ||
        nav.querySelector('.flex.gap-4') ||
        nav.querySelector('.flex.gap-3');
      if (flexContainer && flexContainer.parentElement) {
        flexContainer.parentElement.insertBefore(controlsContainer, flexContainer);
      } else {
        // Last resort: append to nav or find last child div
        const lastDiv = nav.querySelector('div:last-child');
        if (lastDiv && lastDiv.classList.contains('flex')) {
          lastDiv.insertBefore(controlsContainer, lastDiv.firstChild);
        } else {
          nav.appendChild(controlsContainer);
        }
      }
    }
  } else {
    // Fallback: Create floating controls if nav doesn't exist
    const container = document.createElement('div');
    container.id = 'theme-controls';
    container.className = 'fixed top-20 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700';

    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'px-2 py-1 rounded-md border border-gray-300 hover:bg-gray-100 text-xs font-medium transition-colors';
    toggleBtn.textContent = initial === 'dark' ? 'Light' : 'Dark';
    toggleBtn.addEventListener('click', () => {
      window.toggleTheme();
      toggleBtn.textContent = window.currentTheme === 'dark' ? 'Light' : 'Dark';
    });

    const colorBtn = document.createElement('button');
    colorBtn.type = 'button';
    colorBtn.className = 'w-6 h-6 rounded-full border border-gray-300 overflow-hidden';
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
}

function applyTheme(theme) {
  const root = document.documentElement;
  const body = document.body;
  if (theme === 'dark') {
    root.classList.add('dark-theme');
    root.classList.add('dark');
    if (body) {
      body.classList.add('dark-theme');
      body.classList.remove('light');
      body.classList.add('dark');
    }
  } else {
    root.classList.remove('dark-theme');
    root.classList.remove('dark');
    if (body) {
      body.classList.remove('dark-theme');
      body.classList.remove('dark');
      body.classList.add('light');
    }
  }
  window.dispatchEvent(new Event('theme-changed'));
}

// Accent color theme helper
function applyColorTheme(name) {
  const root = document.documentElement;
  const stored = localStorage.getItem('colorTheme');
  const theme = name || stored || (window.__SITE_THEME_DEFAULTS__ && window.__SITE_THEME_DEFAULTS__.defaultColorTheme) || 'theme-custom';
  root.dataset.colorTheme = theme;

  const colorMap = {
    // neutral-professional (default) – analytics / decision-science
    'theme-custom': {
      primary: (window.__SITE_THEME_DEFAULTS__ && window.__SITE_THEME_DEFAULTS__.customPrimary) || '#3B4CCA',
      accent: (window.__SITE_THEME_DEFAULTS__ && window.__SITE_THEME_DEFAULTS__.customAccent) || '#2CB1A6'
    },
    'theme-indigo': { primary: '#3B4CCA', accent: '#2CB1A6' },
    // warm product-analytics
    'theme-orange': { primary: '#F97316', accent: '#EA580C' },
    // cool green analytics
    'theme-emerald': { primary: '#10B981', accent: '#059669' },
    // purple / conference look
    'theme-purple': { primary: '#667EEA', accent: '#764BA2' },
    // legacy / fallback keys (still supported if stored in localStorage)
    'theme-slate': { primary: '#2563EB', accent: '#0EA5E9' },
    'theme-teal': { primary: '#14B8A6', accent: '#0D9488' },
    'theme-rose': { primary: '#F43F5E', accent: '#E11D48' },
    'theme-amber': { primary: '#F59E0B', accent: '#D97706' }
  };

  const colors = colorMap[theme] || colorMap['theme-custom'];

  // Accent themes override only primary/accent brand tokens
  root.style.setProperty('--primary', colors.primary);
  root.style.setProperty('--accent', colors.accent || colors.primary);
  // Derive backwards-compat helpers
  root.style.setProperty('--accent-primary', colors.primary);
  root.style.setProperty('--accent-contrast', '#ffffff');
  root.style.setProperty('--button-bg', colors.primary);
  root.style.setProperty('--button-text', '#ffffff');

  let themeColorMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeColorMeta) {
    themeColorMeta = document.createElement('meta');
    themeColorMeta.name = 'theme-color';
    document.head.appendChild(themeColorMeta);
  }
  themeColorMeta.content = colors.primary;
}

function updateColorSwatch(el, theme) {
  const colorMap = {
    'theme-custom': (window.__SITE_THEME_DEFAULTS__ && window.__SITE_THEME_DEFAULTS__.customPrimary) || '#3B4CCA',
    'theme-indigo': '#3B4CCA',
    'theme-orange': '#F97316',
    'theme-emerald': '#10B981',
    'theme-purple': '#667EEA',
    // legacy/fallback
    'theme-slate': '#2563EB',
    'theme-teal': '#14B8A6',
    'theme-rose': '#F43F5E',
    'theme-amber': '#F59E0B'
  };
  el.style.background = colorMap[theme] || colorMap['theme-indigo'];
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
    container.classList.remove('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-8');
    container.classList.add('flex', 'flex-col');
    container.dataset.view = 'list';
  } else {
    container.classList.remove('flex', 'flex-col');
    container.classList.add('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-8');
    container.dataset.view = 'card';
  }
  
  // Re-render projects with new view mode
  const urlParams = new URLSearchParams(window.location.search);
  const page = parseInt(urlParams.get('page')) || 1;
  loadDashboardProjects("projects-grid", page, FIRST_PAGE_COUNT, REST_PAGE_COUNT);
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

/* ---------- FILTER MODE CONTROLS (projects / case studies / both + sort) ---------- */
function initFilterModeControls() {
  const container = document.getElementById('filter-mode-controls');
  if (!container) return;

  const url = new URL(window.location.href);
  const params = url.searchParams;
  const activeFilter = params.get('filter');

  // Only show when a filter is active (e.g. clicked from Skills page or tags)
  if (!activeFilter) {
    container.classList.add('hidden');
    return;
  }

  const activeType = params.get('type') || 'both';
  const sortMode = params.get('sort') || 'default';

  // Type buttons (projects / case-studies / both)
  document.querySelectorAll('[data-filter-type]').forEach(btn => {
    const type = btn.dataset.filterType;
    if (type === activeType) {
      btn.classList.add('bg-primary', 'text-white');
    } else {
      btn.classList.remove('bg-primary', 'text-white');
    }

    btn.addEventListener('click', () => {
      if (type === 'both') {
        params.delete('type');
      } else {
        params.set('type', type);
      }
      url.search = params.toString();
      window.location.href = url.toString();
    });
  });

  // Sort buttons (default / newest)
  document.querySelectorAll('[data-filter-sort]').forEach(btn => {
    const mode = btn.dataset.filterSort;
    if (mode === sortMode || (!sortMode && mode === 'default')) {
      btn.classList.add('bg-primary', 'text-white');
    } else {
      btn.classList.remove('bg-primary', 'text-white');
    }

    btn.addEventListener('click', () => {
      if (mode === 'default') {
        params.delete('sort');
      } else {
        params.set('sort', mode);
      }
      url.search = params.toString();
      window.location.href = url.toString();
    });
  });
}

/* ---------- ROUTING PER PAGE ---------- */
function routePage() {
  // Load projects for dashboard
  if (document.getElementById("projects-grid")) {
    const urlParams = new URLSearchParams(window.location.search);
    const page = parseInt(urlParams.get('page')) || 1;
    const activeFilter = urlParams.get('filter');
    const featuredSection = document.getElementById('featured-projects-section');
    if (featuredSection) {
      featuredSection.style.display = (page > 1 || activeFilter) ? 'none' : '';
    }
    
    loadDashboardProjects("projects-grid", page, FIRST_PAGE_COUNT, REST_PAGE_COUNT);
    renderFeaturedSection(); // Featured layout (hero + halves)
    initViewModeToggle(); // Initialize view mode toggle
    initViewSwitcher(); // Toggle between Projects content and Case Studies content (same page)
    initFilterModeControls(); // Type (projects / case studies / both) + sort controls when filter is active
    renderHomepageContentSection();
  }

  // Case studies grid (homepage + archive page)
  if (document.getElementById('case-studies-grid')) {
    renderCaseStudiesSection();
  }

  // Load case study page (standalone long-form article)
  if (document.getElementById("case-study-hero")) {
    loadCaseStudyPage();
  } else if (document.getElementById("project-hero")) {
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

function renderHomepageContentSection() {
  const section = document.getElementById("homepage-content-section");
  const mount = document.getElementById("homepage-content-render");
  if (!section || !mount) return;

  // Only show this intro section inside the admin/embed view, not on the public projects page.
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('admin_embed') !== '1') {
    section.classList.add("hidden");
    mount.innerHTML = "";
    return;
  }

  const raw = window.__HOMEPAGE_CONTENT__ || {};
  const editorData =
    raw && raw.editor_content && Array.isArray(raw.editor_content.blocks)
      ? raw.editor_content
      : (raw && Array.isArray(raw.blocks) ? raw : null);

  if (!editorData || !Array.isArray(editorData.blocks) || !editorData.blocks.length) {
    section.classList.add("hidden");
    mount.innerHTML = "";
    return;
  }

  const html = editorBlocksToHtml(editorData);
  if (!html || !String(html).trim()) {
    section.classList.add("hidden");
    mount.innerHTML = "";
    return;
  }
  mount.innerHTML = html;
  section.classList.remove("hidden");
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

/* ---------- TAP / CLICK RIPPLE ANIMATION ---------- */
function initTapRipple() {
  document.addEventListener('click', function (e) {
    var target = e.target;
    while (target && target !== document.body) {
      if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.getAttribute('role') === 'button' || target.classList.contains('tap-ripple-target')) {
        break;
      }
      target = target.parentElement;
    }
    if (!target || target === document.body) return;

    var x = e.clientX;
    var y = e.clientY;
    var ripple = document.createElement('span');
    ripple.className = 'tap-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    document.body.appendChild(ripple);

    requestAnimationFrame(function () {
      ripple.classList.add('tap-ripple--active');
    });

    var duration = 600;
    setTimeout(function () {
      ripple.remove();
    }, duration);
  }, true);
}

/* ---------- HOMEPAGE SECTION TABS (SCROLL SPY) ---------- */
function initHomepageSectionTabs() {
  const tabs = Array.from(document.querySelectorAll('#section-tabs .section-tab'));
  if (!tabs.length) return;

  const sections = tabs
    .map(t => ({ tab: t, id: t.getAttribute('data-section') }))
    .filter(x => x.id && document.getElementById(x.id))
    .map(x => ({ ...x, el: document.getElementById(x.id) }));

  if (!sections.length) return;

  const setActive = (id) => {
    tabs.forEach(t => t.classList.toggle('is-active', t.getAttribute('data-section') === id));
  };

  tabs.forEach(t => {
    t.addEventListener('click', (e) => {
      const id = t.getAttribute('data-section');
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      e.preventDefault();
      const headerOffset = 120;
      const top = el.getBoundingClientRect().top + window.pageYOffset - headerOffset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter(e => e.isIntersecting)
        .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
      if (visible?.target?.id) setActive(visible.target.id);
    },
    { root: null, threshold: [0.2, 0.35, 0.5] }
  );

  sections.forEach(s => observer.observe(s.el));
  setActive(sections[0].id);
}

/* ---------- VIEW SWITCHER (Projects <-> Case Studies, same page) ---------- */
function initViewSwitcher() {
  const projectsView = document.getElementById('projects-view');
  const caseStudiesView = document.getElementById('case-studies-view');
  const viewTitle = document.getElementById('view-title');
  const backBtn = document.getElementById('view-back-to-projects');
  const arrowBtn = document.getElementById('view-go-to-case-studies');
  const archiveBtn = document.getElementById('view-go-to-archive');
  const sectionTabs = document.getElementById('section-tabs');

  if (!projectsView || !caseStudiesView || !viewTitle || !backBtn || !arrowBtn) return;

  function homepageUiTitle(key, fallback) {
    const ui = window.__HOMEPAGE_UI__;
    if (ui && typeof ui[key] === 'string' && ui[key].trim()) return ui[key].trim();
    return fallback;
  }

  function showProjects() {
    projectsView.classList.remove('hidden');
    caseStudiesView.classList.add('hidden');
    viewTitle.textContent = homepageUiTitle('featuredTitle', 'Featured Projects');
    backBtn.classList.add('hidden');
    arrowBtn.classList.remove('hidden');
    if (archiveBtn) archiveBtn.classList.add('hidden');
    if (sectionTabs) sectionTabs.classList.remove('hidden');
  }

  function showCaseStudies() {
    projectsView.classList.add('hidden');
    caseStudiesView.classList.remove('hidden');
    viewTitle.textContent = homepageUiTitle('caseStudiesTitle', 'Case Studies');
    backBtn.classList.remove('hidden');
    arrowBtn.classList.add('hidden');
    if (archiveBtn) archiveBtn.classList.remove('hidden');
    if (sectionTabs) sectionTabs.classList.add('hidden');
  }

  arrowBtn.addEventListener('click', showCaseStudies);
  backBtn.addEventListener('click', showProjects);

  // Deep-link support (e.g., returning from archive)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('view') === 'case-studies') {
    showCaseStudies();
  } else {
    showProjects();
  }

  document.addEventListener('homepage-ui-updated', () => {
    if (caseStudiesView.classList.contains('hidden')) showProjects();
    else showCaseStudies();
  });
}

/* ---------- CASE STUDIES SECTION (Medium / TDS style) ---------- */
async function loadCaseStudies() {
  try {
    const response = await fetch(getDataBase() + 'case_studies.json');
    if (!response.ok) throw new Error('Failed to load case studies');
    return await response.json();
  } catch (error) {
    console.error('Error loading case studies:', error);
    return [];
  }
}

async function renderCaseStudiesSection() {
  const grid = document.getElementById('case-studies-grid');
  if (!grid) return;

  const caseStudies = await loadCaseStudies();
  if (!caseStudies.length) {
    grid.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 py-12">Case studies will appear here. Edit <code>data/case_studies.json</code> to add or reorder.</p>';
    return;
  }

  const requestedTier = (grid.dataset.tier || '').trim().toLowerCase();
  const normalizedTier = requestedTier === 'archive' ? 'archive' : (requestedTier === 'featured' ? 'featured' : null);
  const filtered = normalizedTier ? caseStudies.filter(cs => (cs.tier || 'featured') === normalizedTier) : caseStudies;

  if (!filtered.length) {
    grid.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400 py-12">No case studies in this section yet.</p>';
    return;
  }

  grid.innerHTML = filtered.map(cs => createCaseStudyCard(cs)).join('');
}

function createCaseStudyCard(caseStudy) {
  const thumbnailUrl = resolveAssetUrl(caseStudy, caseStudy.thumbnail || 'assets/images/thumbs/01.jpg');
  const fallbackImage = 'assets/images/thumbs/01.jpg';
  const excerpt = (caseStudy.short_description || '').replace(/<[^>]*>/g, '').substring(0, 160);
  const category = caseStudy.category || 'Analytics';
  const readMins = caseStudy.case_study_read_mins != null ? caseStudy.case_study_read_mins : 5;
  const tags = (caseStudy.tools || []).slice(0, 3).map(t =>
    `<a href="${getHomeUrl().replace(/\?.*$/, '').replace('#','')}?filter=${encodeURIComponent(t)}" class="case-study-tag">${t}</a>`
  ).join('');

  return `
    <article class="case-study-card">
      <a href="${getBasePath()}case-study.html?id=${encodeURIComponent(caseStudy.id)}" class="case-study-card-link">
        <div class="case-study-card-image">
          <picture>
            <source srcset="${getOptimizedImagePath(caseStudy.thumbnail || 'assets/images/thumbs/01.jpg')}" type="image/webp">
            <img src="${thumbnailUrl}" alt="${caseStudy.title}" onerror="this.onerror=null; this.src='${fallbackImage}';" loading="lazy">
          </picture>
          <span class="case-study-card-read-time">${readMins} min read</span>
        </div>
        <div class="case-study-card-body">
          <span class="case-study-card-category">${category}</span>
          <h3 class="case-study-card-title">${caseStudy.title}</h3>
          <p class="case-study-card-excerpt">${excerpt}${excerpt.length >= 160 ? '…' : ''}</p>
          <div class="case-study-card-tags">${tags}</div>
        </div>
      </a>
    </article>
  `;
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
    const response = await fetch(getDataBase() + 'projects.json');
    if (!response.ok) throw new Error('Failed to load projects');
    return await response.json();
  } catch (error) {
    console.error('Error loading projects:', error);
    return [];
  }
}

/* ---------- FEATURED PROJECTS LAYOUT ---------- */
async function renderFeaturedSection() {
  const heroContainer = document.getElementById('featured-hero-row');
  const rowTwo = document.getElementById('featured-row-2');
  const rowThree = document.getElementById('featured-row-3');
  const featuredSection = document.getElementById('featured-projects-section');
  if (!heroContainer || !rowTwo || !rowThree) return;

  const projects = await loadProjects();
  const orderedFeatured = getOrderedFeaturedProjects(projects).slice(0, 4);

  if (!orderedFeatured.length) {
    if (featuredSection) featuredSection.style.display = 'none';
    return;
  }

  const [hero, second, third, fourth] = orderedFeatured;

  heroContainer.innerHTML = hero ? createFeaturedHeroCard(hero) : '';
  rowTwo.innerHTML = [second, third].filter(Boolean).map(createFeaturedHalfCard).join('');
  rowThree.innerHTML = `
    ${fourth ? createFeaturedHalfCard(fourth) : ''}
    ${createFeaturedEmptySlot()}
  `;
}

function createFeaturedHeroCard(project) {
  const thumbnailUrl = resolveAssetUrl(project, project.thumbnail || 'assets/images/thumbs/01.jpg');
  const fallbackImage = 'assets/images/thumbs/01.jpg';
  const tags = (project.tools || []).slice(0, 4).map(t =>
    `<a href="${getHomeUrl().replace(/\?.*$/, '').replace('#','')}?filter=${encodeURIComponent(t)}" class="list-tag" title="Filter by ${t}">${t}</a>`
  ).join('');
  const impactPreview = getImpactPreview(project);
  const actionIcons = {
    github: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`,
    streamlit: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 4l9 5 9-5-9-4-9 4zm0 4.5v7.25L12 20l9-4.25V8.5L12 13 3 8.5z"/></svg>`,
    notebook: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2zm0 4h10M9 4v16"/></svg>`,
    demo: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>`,
    powerbi: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h4v18H3V3zm7 5h4v13h-4V8zm7-3h4v16h-4V5z"/></svg>`,
    slides: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h16v12H4V4zm-2 14h20v2H2v-2zm4-9h6v6H6V9z"/></svg>`,
    video: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 5h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm16 3 4-2v12l-4-2V8z"/></svg>`,
    link: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 13a5 5 0 007.54.54l1.92-1.92a3 3 0 00-4.24-4.24l-1.06 1.06M14 11a5 5 0 00-7.54-.54l-1.92 1.92a3 3 0 004.24 4.24l1.06-1.06"/></svg>`
  };
  const actionButtons = [
    { label: 'View Project', url: `${getBasePath()}project.html?id=${project.id}`, primary: true },
    { label: 'GitHub', url: project.github_url, icon: actionIcons.github },
    { label: 'Demo', url: project.demo_url, icon: actionIcons.demo },
    { label: 'Streamlit', url: project.streamlit_url, icon: actionIcons.streamlit },
    { label: 'Power BI', url: project.powerbi_url, icon: actionIcons.powerbi },
    { label: 'Slides', url: project.slides_url, icon: actionIcons.slides },
    { label: 'Video', url: project.video_url, icon: actionIcons.video }
  ].filter(btn => btn.url).map(btn => {
    if (btn.primary) {
      return `<a href="${btn.url}" class="btn-primary">View Project</a>`;
    }
    return `<a href="${btn.url}" target="_blank" class="project-link-icon" aria-label="${btn.label}" title="${btn.label}">${btn.icon}</a>`;
  }).join('');

  const overlayButtons = `
    <a href="${getBasePath()}project.html?id=${project.id}" class="px-4 py-2 text-sm font-semibold rounded-lg transition-all bg-white text-gray-900 hover:bg-gray-100 hover:scale-105 shadow-lg">
      View Project →
    </a>
  `;
  return `
    <article class="featured-card featured-hero group">
      <a href="${getBasePath()}project.html?id=${project.id}" class="featured-media">
        <picture>
          <source srcset="${getOptimizedImagePath(project.thumbnail || 'assets/images/thumbs/01.jpg')}" type="image/webp">
          <img src="${thumbnailUrl}" alt="${project.title}" onerror="this.onerror=null; this.src='${fallbackImage}';" loading="lazy">
        </picture>
        <div class="featured-hover-overlay">
          <div class="featured-hover-inner">
            ${project.category ? `<div class="text-xs font-semibold text-white/80 uppercase tracking-wide mb-2">${project.category}</div>` : ''}
            <h4 class="text-lg font-bold text-white mb-3">${project.title}</h4>
            <p class="text-sm text-white/90 leading-relaxed mb-2">${project.short_description || project.full_description?.replace(/<[^>]*>/g, '').substring(0, 120) + '...' || 'Explore this project'}</p>
            ${impactPreview ? `<p class="text-xs text-white/80 leading-relaxed mb-4"><strong>Impact:</strong> ${impactPreview}</p>` : ''}
            <div class="flex flex-wrap gap-2 justify-center">
              ${overlayButtons}
            </div>
          </div>
        </div>
      </a>
      <div class="featured-body">
        <div class="featured-meta">${project.category ? `${project.category} • ` : ''}${project.date || ''}</div>
        <h3 class="featured-title"><a href="${getBasePath()}project.html?id=${project.id}">${project.title}</a></h3>
        <p class="featured-summary">${project.short_description || ''}</p>
        ${impactPreview ? `<p class="text-xs text-gray-600 dark:text-gray-300 mt-1">${impactPreview}</p>` : ''}
        <div class="list-tags">
          ${tags || ''}
        </div>
        <div class="featured-actions">
          ${actionButtons || ''}
        </div>
      </div>
    </article>
  `;
}

function createFeaturedHalfCard(project) {
  const thumbnailUrl = resolveAssetUrl(project, project.thumbnail || 'assets/images/thumbs/01.jpg');
  const fallbackImage = 'assets/images/thumbs/01.jpg';
  const tags = (project.tools || []).slice(0, 3).map(t =>
    `<a href="${getHomeUrl().replace(/\?.*$/, '').replace('#','')}?filter=${encodeURIComponent(t)}" class="list-tag" title="Filter by ${t}">${t}</a>`
  ).join('');
  const impactPreview = getImpactPreview(project);
  const actionIcons = {
    github: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`,
    streamlit: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 4l9 5 9-5-9-4-9 4zm0 4.5v7.25L12 20l9-4.25V8.5L12 13 3 8.5z"/></svg>`,
    notebook: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2zm0 4h10M9 4v16"/></svg>`,
    demo: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>`,
    powerbi: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h4v18H3V3zm7 5h4v13h-4V8zm7-3h4v16h-4V5z"/></svg>`,
    slides: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h16v12H4V4zm-2 14h20v2H2v-2zm4-9h6v6H6V9z"/></svg>`,
    video: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 5h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm16 3 4-2v12l-4-2V8z"/></svg>`,
    link: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 13a5 5 0 007.54.54l1.92-1.92a3 3 0 00-4.24-4.24l-1.06 1.06M14 11a5 5 0 00-7.54-.54l-1.92 1.92a3 3 0 004.24 4.24l1.06-1.06"/></svg>`
  };
  const actionButtons = [
    { label: 'View Project', url: `${getBasePath()}project.html?id=${project.id}`, primary: true },
    { label: 'GitHub', url: project.github_url, icon: actionIcons.github },
    { label: 'Demo', url: project.demo_url, icon: actionIcons.demo },
    { label: 'Streamlit', url: project.streamlit_url, icon: actionIcons.streamlit },
    { label: 'Power BI', url: project.powerbi_url, icon: actionIcons.powerbi },
    { label: 'Slides', url: project.slides_url, icon: actionIcons.slides },
    { label: 'Video', url: project.video_url, icon: actionIcons.video }
  ].filter(btn => btn.url).map(btn => {
    if (btn.primary) {
      return `<a href="${btn.url}" class="btn-primary">View Project</a>`;
    }
    return `<a href="${btn.url}" target="_blank" class="project-link-icon" aria-label="${btn.label}" title="${btn.label}">${btn.icon}</a>`;
  }).join('');

  const overlayButtons = `
    <a href="${getBasePath()}project.html?id=${project.id}" class="px-4 py-2 text-sm font-semibold rounded-lg transition-all bg-white text-gray-900 hover:bg-gray-100 hover:scale-105 shadow-lg">
      View Project →
    </a>
  `;
  return `
    <article class="featured-card featured-half group">
      <a href="${getBasePath()}project.html?id=${project.id}" class="featured-media">
        <picture>
          <source srcset="${getOptimizedImagePath(project.thumbnail || 'assets/images/thumbs/01.jpg')}" type="image/webp">
          <img src="${thumbnailUrl}" alt="${project.title}" onerror="this.onerror=null; this.src='${fallbackImage}';" loading="lazy">
        </picture>
        <div class="featured-hover-overlay">
          <div class="featured-hover-inner">
            ${project.category ? `<div class="text-xs font-semibold text-white/80 uppercase tracking-wide mb-2">${project.category}</div>` : ''}
            <h4 class="text-base font-bold text-white mb-2">${project.title}</h4>
            <p class="text-sm text-white/90 leading-relaxed mb-2">${project.short_description || project.full_description?.replace(/<[^>]*>/g, '').substring(0, 100) + '...' || 'Explore this project'}</p>
            ${impactPreview ? `<p class="text-xs text-white/80 leading-relaxed mb-3"><strong>Impact:</strong> ${impactPreview}</p>` : ''}
            <div class="flex flex-wrap gap-2 justify-center">
              ${overlayButtons}
            </div>
          </div>
        </div>
      </a>
      <div class="featured-body">
        <div class="featured-meta">${project.category ? `${project.category} • ` : ''}${project.date || ''}</div>
        <h4 class="featured-title"><a href="${getBasePath()}project.html?id=${project.id}">${project.title}</a></h4>
        <p class="featured-summary">${project.short_description || ''}</p>
        ${impactPreview ? `<p class="text-xs text-gray-600 dark:text-gray-300 mt-1">${impactPreview}</p>` : ''}
        <div class="list-tags">
          ${tags || ''}
        </div>
        <div class="featured-actions">
          ${actionButtons || ''}
        </div>
      </div>
    </article>
  `;
}

function createFeaturedEmptySlot() {
  return `
    <div class="featured-empty">
      <div class="featured-empty-inner">
        <div class="featured-empty-title">Explore more projects</div>
        <p class="featured-empty-text">Browse analytics, product, and BI case studies.</p>
        <a href="#all-projects-section" class="btn-primary">Jump to All Projects</a>
      </div>
    </div>
  `;
}

/* ---------- DASHBOARD PROJECTS LOADING ---------- */
async function loadDashboardProjects(containerId, page = 1, firstPageCount = FIRST_PAGE_COUNT, restPageCount = REST_PAGE_COUNT) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const projects = await loadProjects();

  // Optional filter from URL (?filter=Python)
  const urlParams = new URLSearchParams(window.location.search);
  const activeFilter = urlParams.get('filter');
  const activeType = urlParams.get('type') || 'both';      // 'projects' | 'case-studies' | 'both'
  const sortMode = urlParams.get('sort') || 'default';     // 'default' | 'date-desc'

  const featured = getOrderedFeaturedProjects(projects).slice(0, 4);
  const nonFeatured = projects.filter(p => !p.featured);
  let list = [];
  let totalCount = 0;

  if (activeFilter) {
    const groupTools = FILTER_GROUPS[activeFilter];
    let filterTools = [];

    // Filter PROJECTS by tools / filter groups
    if (groupTools && groupTools.length) {
      filterTools = groupTools;
      list = projects.filter(p => (p.tools || []).some(t => groupTools.includes(t)));
    } else {
      filterTools = [activeFilter];
      list = projects.filter(p => (p.tools || []).includes(activeFilter));
    }

    let filteredProjects = list;

    // Also include CASE STUDIES that match the filter
    const caseStudies = await loadCaseStudies();
    const filteredCaseStudies = caseStudies.filter(cs => {
      const csTools = cs.tools || [];
      return csTools.some(t => filterTools.includes(t) || t === activeFilter);
    });

    // Convert case studies to project-like format for rendering
    let caseStudyProjects = filteredCaseStudies.map(cs => ({
      id: cs.id,
      title: cs.title,
      short_description: cs.short_description,
      thumbnail: cs.thumbnail,
      tools: cs.tools || [],
      category: cs.category,
      date: cs.date || '',
      featured: false,
      isCaseStudy: true,
      case_study_path: cs.case_study_path
    }));

    // Optional sort by date (newest first), keeping projects and case studies grouped
    if (sortMode === 'date-desc') {
      const parseDate = (value) => {
        if (!value) return 0;
        const d = new Date(value);
        return isNaN(d.getTime()) ? 0 : d.getTime();
      };
      filteredProjects = [...filteredProjects].sort((a, b) => (parseDate(b.date) - parseDate(a.date)));
      caseStudyProjects = [...caseStudyProjects].sort((a, b) => (parseDate(b.date) - parseDate(a.date)));
    }

    // Apply type filter: projects only, case studies only, or both (projects first)
    if (activeType === 'projects') {
      list = filteredProjects;
    } else if (activeType === 'case-studies') {
      list = caseStudyProjects;
    } else {
      list = [...filteredProjects, ...caseStudyProjects];
    }

    totalCount = list.length;
    const { start, end } = getPaginationSlice(totalCount, page, firstPageCount, restPageCount);
    list = list.slice(start, end);
  } else if (page === 1) {
    const firstPageNonFeaturedCount = Math.max(firstPageCount - featured.length, 0);
    list = [...featured, ...nonFeatured.slice(0, firstPageNonFeaturedCount)];
    totalCount = featured.length + nonFeatured.length;
  } else {
    const firstPageNonFeaturedCount = Math.max(firstPageCount - featured.length, 0);
    const start = firstPageNonFeaturedCount + (page - 2) * restPageCount;
    const end = start + restPageCount;
    list = nonFeatured.slice(start, end);
    totalCount = featured.length + nonFeatured.length;
  }

  const slice = list;
  
  // Get current view mode
  const viewMode = el.dataset.view || currentViewMode || 'card';

  // Show active filter info if present
  const filterInfo = document.getElementById('active-filter');
  if (filterInfo) {
    if (activeFilter) {
      filterInfo.innerHTML = `
        <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm">
          Tagged: <strong>${activeFilter}</strong>
          <a href="${getHomeUrl()}" class="ml-2 text-xs text-gray-600 hover:text-primary underline">Clear</a>
        </span>
      `;
    } else {
      filterInfo.innerHTML = '';
    }
  }

  if (!slice.length) {
    el.innerHTML = '<p class="text-gray-500 text-center py-8">No projects or case studies found for this filter.</p>';
    renderPagination(totalCount, page, firstPageCount, restPageCount);
    return;
  }

  // Ensure grid classes are set for card view
  if (viewMode !== 'list') {
    el.classList.remove('flex', 'flex-col');
    el.classList.add('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-8');
    el.dataset.view = 'card';
  } else {
    el.classList.remove('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-8');
    el.classList.add('flex', 'flex-col');
    el.dataset.view = 'list';
  }

  // Render based on view mode
  if (viewMode === 'list') {
    el.innerHTML = slice.map((project, index) => createDashboardProjectList(project, index)).join('');
  } else {
    // Consistent card grid on all pages
    el.innerHTML = slice.map(createDashboardProjectCard).join('');
  }
  
  renderPagination(totalCount, page, firstPageCount, restPageCount);
}

function getOrderedFeaturedProjects(projects) {
  const featuredProjects = projects.filter(p => p.featured);
  const ordered = FEATURED_ORDER.map(id => featuredProjects.find(p => p.id === id)).filter(Boolean);
  const remaining = featuredProjects.filter(p => !FEATURED_ORDER.includes(p.id));
  return [...ordered, ...remaining];
}

function getPaginationSlice(total, page, firstPageCount, restPageCount) {
  if (page <= 1) {
    return { start: 0, end: Math.min(firstPageCount, total) };
  }
  const start = firstPageCount + (page - 2) * restPageCount;
  const end = Math.min(start + restPageCount, total);
  return { start, end };
}

function createDashboardProjectCard(project, layoutClass = '') {
  const isCaseStudy = project.isCaseStudy === true;
  const detailUrl = isCaseStudy ? `${getBasePath()}case-study.html?id=${project.id}` : `${getBasePath()}project.html?id=${project.id}`;
  const viewLabel = isCaseStudy ? 'View Case Study' : 'View Project';
  
  const tags = (project.tools || []).slice(0, 4).map(t => 
    `<a href="${getHomeUrl().replace(/\?.*$/, '').replace('#','')}?filter=${encodeURIComponent(t)}" class="px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer" title="Filter by ${t}">${t}</a>`
  ).join('');

  const thumbnailUrl = resolveAssetUrl(project, project.thumbnail || 'assets/images/thumbs/01.jpg');
  const fallbackImage = 'assets/images/thumbs/01.jpg';
  const impactPreview = getImpactPreview(project);

  const actionIcons = {
    github: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`,
    demo: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>`,
    streamlit: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.4c5.302 0 9.6 4.298 9.6 9.6s-4.298 9.6-9.6 9.6S2.4 17.302 2.4 12 6.698 2.4 12 2.4z"/></svg>`,
    powerbi: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h4v18H3V3zm7 5h4v13h-4V8zm7-3h4v16h-4V5z"/></svg>`,
    slides: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h16v12H4V4zm-2 14h20v2H2v-2zm4-9h6v6H6V9z"/></svg>`,
    video: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 5h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm16 3 4-2v12l-4-2V8z"/></svg>`,
    notebook: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2zm0 4h10M9 4v16"/></svg>`,
    link: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 13a5 5 0 007.54.54l1.92-1.92a3 3 0 00-4.24-4.24l-1.06 1.06M14 11a5 5 0 00-7.54-.54l-1.92 1.92a3 3 0 004.24 4.24l1.06-1.06"/></svg>`
  };

  const genericLink =
    project.demo_url ||
    project.slide_pdf_path ||
    project.pbix_download_path ||
    project.medium_url ||
    project.kaggle_url;

  const iconButtons = [
    { label: 'GitHub', url: project.github_url, icon: actionIcons.github },
    { label: 'Streamlit App', url: project.streamlit_url, icon: actionIcons.streamlit },
    { label: 'Notebook', url: project.notebook_url, icon: actionIcons.notebook },
    { label: 'More', url: genericLink, icon: actionIcons.link }
  ];
  const renderIconBtn = (btn) => {
    if (btn.url) {
      return `<a href="${btn.url}" target="_blank" class="project-link-icon" aria-label="${btn.label}" title="${btn.label}">${btn.icon}</a>`;
    }
    return `<span class="project-link-icon disabled" aria-label="${btn.label} (not available)" title="${btn.label} (not available)">${btn.icon}</span>`;
  };

  const actionButtons = isCaseStudy ? [
    `<a href="${detailUrl}" class="px-3 py-1.5 text-xs font-semibold rounded transition-colors bg-primary text-white hover:bg-accent">${viewLabel}</a>`
  ] : [
    `<a href="${detailUrl}" class="px-3 py-1.5 text-xs font-semibold rounded transition-colors bg-primary text-white hover:bg-accent">${viewLabel}</a>`,
    ...iconButtons.map(renderIconBtn)
  ].join('');

  const overlayButtons = `
    <a href="${detailUrl}" class="px-3 py-1.5 text-xs font-semibold rounded transition-colors bg-primary text-white hover:bg-accent">
      ${viewLabel}
    </a>
  `;
  
  const categoryBadge = isCaseStudy ? `<span class="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 mb-2">Case Study</span>` : '';
  
  return `
    <article class="project-card-modern bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group relative ${layoutClass}">
      <div class="relative overflow-hidden bg-gray-100">
        <a href="${detailUrl}" class="block">
          <picture>
            <source srcset="${getOptimizedImagePath(project.thumbnail || 'assets/images/thumbs/01.jpg')}" type="image/webp">
            <img src="${thumbnailUrl}" alt="${project.title}" class="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-105" onerror="this.onerror=null; this.src='${fallbackImage}'; this.alt='${project.title} - Image not available';" loading="lazy">
          </picture>
        </a>
        <div class="card-hover-overlay absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div class="text-center text-white px-4">
            <p class="text-sm mb-4 opacity-90 line-clamp-2 text-white">${impactPreview ? `Impact: ${impactPreview}` : (project.short_description || '')}</p>
            <div class="flex flex-wrap gap-2 justify-center">
              ${overlayButtons || ''}
            </div>
          </div>
        </div>
      </div>
      <div class="p-6">
        <div class="flex items-start justify-between mb-3">
          <div class="flex-1">
            ${categoryBadge}
            <a href="${detailUrl}" class="block group-hover:text-primary transition-colors">
              <h3 class="text-xl font-bold text-gray-900 mb-2 leading-tight">${project.title}</h3>
            </a>
            <p class="text-sm text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2 mb-2">${project.short_description || ''}</p>
            ${impactPreview ? `<p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-4"><strong>Impact:</strong> ${impactPreview}</p>` : ''}
          </div>
        </div>
        
        <div class="flex flex-wrap gap-2 mb-4">
          ${tags || '<span class="text-xs text-gray-400">No tags</span>'}
        </div>
        
        <div class="pt-3 border-t border-gray-100">
          <div class="flex flex-wrap gap-2">
            ${actionButtons || ''}
          </div>
        </div>
      </div>
    </article>
  `;
}

function createDashboardProjectList(project, index = 0) {
  const isCaseStudy = project.isCaseStudy === true;
  const detailUrl = isCaseStudy ? `${getBasePath()}case-study.html?id=${project.id}` : `${getBasePath()}project.html?id=${project.id}`;
  const viewLabel = isCaseStudy ? 'View Case Study' : 'View Project';
  
  const tags = (project.tools || []).slice(0, 4).map(t => 
    `<a href="${getHomeUrl().replace(/\?.*$/, '').replace('#','')}?filter=${encodeURIComponent(t)}" class="list-tag" title="Filter by ${t}">${t}</a>`
  ).join('');
  
  const thumbnailUrl = resolveAssetUrl(project, project.thumbnail || 'assets/images/thumbs/01.jpg');
  const fallbackImage = 'assets/images/thumbs/01.jpg';
  const impactPreview = getImpactPreview(project);
  
  const actionIcons = {
    github: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`,
    demo: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>`,
    streamlit: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.4c5.302 0 9.6 4.298 9.6 9.6s-4.298 9.6-9.6 9.6S2.4 17.302 2.4 12 6.698 2.4 12 2.4z"/></svg>`,
    powerbi: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h4v18H3V3zm7 5h4v13h-4V8zm7-3h4v16h-4V5z"/></svg>`,
    slides: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 4h16v12H4V4zm-2 14h20v2H2v-2zm4-9h6v6H6V9z"/></svg>`,
    video: `<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4 5h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm16 3 4-2v12l-4-2V8z"/></svg>`,
    notebook: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2zm0 4h10M9 4v16"/></svg>`,
    link: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 13a5 5 0 007.54.54l1.92-1.92a3 3 0 00-4.24-4.24l-1.06 1.06M14 11a5 5 0 00-7.54-.54l-1.92 1.92a3 3 0 004.24 4.24l1.06-1.06"/></svg>`
  };

  const genericLink =
    project.demo_url ||
    project.slide_pdf_path ||
    project.pbix_download_path ||
    project.medium_url ||
    project.kaggle_url;

  const iconButtons = [
    { label: 'GitHub', url: project.github_url, icon: actionIcons.github },
    { label: 'Streamlit App', url: project.streamlit_url, icon: actionIcons.streamlit },
    { label: 'Notebook', url: project.notebook_url, icon: actionIcons.notebook },
    { label: 'More', url: genericLink, icon: actionIcons.link }
  ];
  const renderIconBtn = (btn) => {
    if (btn.url) {
      return `<a href="${btn.url}" target="_blank" class="project-link-icon" aria-label="${btn.label}" title="${btn.label}">${btn.icon}</a>`;
    }
    return `<span class="project-link-icon disabled" aria-label="${btn.label} (not available)" title="${btn.label} (not available)">${btn.icon}</span>`;
  };

  const actionButtons = isCaseStudy ? [
    `<a href="${detailUrl}" class="px-3 py-1.5 text-xs font-semibold rounded transition-colors bg-primary text-white hover:bg-accent">${viewLabel}</a>`
  ] : [
    `<a href="${detailUrl}" class="px-3 py-1.5 text-xs font-semibold rounded transition-colors bg-primary text-white hover:bg-accent">${viewLabel}</a>`,
    ...iconButtons.map(renderIconBtn)
  ].join('');

  const overlayButtons = isCaseStudy ? [
    { label: viewLabel, url: detailUrl, primary: true }
  ] : [
    { label: viewLabel, url: detailUrl, primary: true },
    { label: 'GitHub', url: project.github_url },
    { label: 'Demo', url: project.demo_url },
    { label: 'Streamlit', url: project.streamlit_url },
    { label: 'Power BI', url: project.powerbi_url },
    { label: 'Slides', url: project.slides_url },
    { label: 'Video', url: project.video_url }
  ].filter(btn => btn.url).map(btn => {
    const base = btn.primary
      ? 'bg-primary text-white hover:bg-accent'
      : 'bg-white/10 text-white hover:bg-white/20';
    return `<a href="${btn.url}" ${btn.primary ? '' : 'target="_blank"'} class="px-3 py-1.5 text-xs font-semibold rounded transition-colors ${base}">${btn.label}</a>`;
  }).join('');
  
  const categoryBadge = isCaseStudy ? `<span class="inline-block px-2.5 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 mb-2">Case Study</span>` : '';
  const isReverse = index % 2 === 1;
  return `
    <article class="project-list-row ${isReverse ? 'is-reverse' : ''}">
      <div class="list-row-inner">
        <div class="list-media">
          <a href="${detailUrl}" class="block">
            <picture>
              <source srcset="${getOptimizedImagePath(project.thumbnail || 'assets/images/thumbs/01.jpg')}" type="image/webp">
              <img src="${thumbnailUrl}" alt="${project.title}" class="list-image" onerror="this.onerror=null; this.src='${fallbackImage}'; this.alt='${project.title} - Image not available';" loading="lazy">
            </picture>
          </a>
          <div class="list-hover-overlay">
            <div class="list-hover-inner">
              <p class="text-sm mb-3 opacity-90 text-white">${impactPreview ? `Impact: ${impactPreview}` : (project.short_description || '')}</p>
              <div class="flex flex-wrap gap-2 justify-center">
                ${overlayButtons}
              </div>
            </div>
          </div>
        </div>
        <div class="list-body">
          <div class="list-meta">${project.date || ''}</div>
          ${categoryBadge}
          <h3 class="list-title">
            <a href="${detailUrl}">${project.title}</a>
          </h3>
          <p class="list-summary">${project.short_description || ''}</p>
          ${impactPreview ? `<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-4"><strong>Impact:</strong> ${impactPreview}</p>` : ''}
          <div class="list-tags">
            ${tags || '<span class="list-tag muted">No tags</span>'}
          </div>
          <div class="list-actions">
            ${actionButtons || ''}
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderPagination(total, currentPage, firstPageCount, restPageCount) {
  const container = document.getElementById('pagination');
  if (!container) return;

  const totalPages = total <= firstPageCount
    ? 1
    : 1 + Math.ceil((total - firstPageCount) / restPageCount);
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
    const homeUrl = getHomeUrl();
    return params.toString() ? `${homeUrl}?${params.toString()}` : homeUrl;
  };

  let html = '';
  
  if (currentPage > 1) {
    html += `<a href="${buildUrl(currentPage - 1)}" class="px-4 py-2 bg-white rounded hover:bg-gray-100 transition-colors font-semibold">Prev</a>`;
  }

  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      html += `<span class="px-4 py-2 bg-primary text-white rounded font-bold">${i}</span>`;
    } else {
      html += `<a href="${buildUrl(i)}" class="px-4 py-2 bg-white rounded hover:bg-gray-100 transition-colors font-semibold">${i}</a>`;
    }
  }

  if (currentPage < totalPages) {
    html += `<a href="${buildUrl(currentPage + 1)}" class="px-4 py-2 bg-white rounded hover:bg-gray-100 transition-colors font-semibold">Next</a>`;
  }

  container.innerHTML = html;

  // Handle pagination clicks
  container.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const url = new URL(link.href);
      const page = parseInt(url.searchParams.get('page') || '1');
      loadDashboardProjects('projects-grid', page, firstPageCount, restPageCount);
      const activeFilter = url.searchParams.get('filter');
      const featuredSection = document.getElementById('featured-projects-section');
      if (featuredSection) {
        featuredSection.style.display = (page > 1 || activeFilter) ? 'none' : '';
      }
      window.history.pushState({}, '', url.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
					});
				});
}

/* ---------- CASE STUDY PAGE (standalone long-form) ---------- */
async function loadCaseStudyPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const caseStudyId = urlParams.get('id');
  if (!caseStudyId) {
    document.getElementById('case-study-content').innerHTML = '<p class="text-gray-500">No case study selected. <a href="' + getHomeUrl() + '" class="text-primary hover:underline">Back to dashboard</a>.</p>';
    return;
  }

  const caseStudies = await loadCaseStudies();
  const caseStudy = caseStudies.find(cs => cs.id === caseStudyId);
  if (!caseStudy) {
    document.getElementById('case-study-content').innerHTML = '<p class="text-gray-500">Case study not found. <a href="' + getHomeUrl() + '" class="text-primary hover:underline">Back to dashboard</a>.</p>';
    return;
  }

  document.title = `${caseStudy.title} | Case Study | Sumit S. Chaure`;

  const hero = document.getElementById('case-study-hero');
  if (hero) {
    const readMins = caseStudy.case_study_read_mins != null ? caseStudy.case_study_read_mins : 5;
    hero.innerHTML = `
      <div class="container mx-auto px-6 py-16 text-center max-w-4xl">
        <div class="text-sm text-white/80 mb-4">
          <span>${caseStudy.category || 'Analytics'}</span>
          ${caseStudy.date ? ` · <span>${caseStudy.date}</span>` : ''}
          · <span>${readMins} min read</span>
        </div>
        <h1 class="text-4xl md:text-6xl font-bold text-white mb-6">${caseStudy.title}</h1>
        <p class="text-xl text-white/90 max-w-2xl mx-auto">${(caseStudy.short_description || '').replace(/<[^>]*>/g, '')}</p>
      </div>
    `;
  }

  const viewProjectEl = document.getElementById('case-study-view-project');
  if (viewProjectEl && caseStudy.project_id) {
    viewProjectEl.innerHTML = `
      <a href="${getBasePath()}project.html?id=${encodeURIComponent(caseStudy.project_id)}" class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-accent transition-colors font-semibold text-sm">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
        View full project
      </a>
    `;
  } else if (viewProjectEl) {
    viewProjectEl.innerHTML = '';
  }

  const container = document.getElementById('case-study-content');
  if (!container) return;
  try {
    const editorStory = editorBlocksToHtml(caseStudy?.editor_content);
    if (editorStory) {
      container.innerHTML = editorStory;
      renderCaseStudyQuickSummary(caseStudy, container);
      renderCaseStudyTOC(container);
      renderRelatedCaseStudiesCallout(caseStudy, caseStudies);
      return;
    }
    const casePath = caseStudy.case_study_path.startsWith('data/') ? getDataBase() + caseStudy.case_study_path.slice(5) : caseStudy.case_study_path;
    const res = await fetch(casePath);
    if (!res.ok) throw new Error(`Failed to load: ${res.status}`);
    const html = await res.text();
    container.innerHTML = html;
    renderCaseStudyQuickSummary(caseStudy, container);
    renderCaseStudyTOC(container);
    renderRelatedCaseStudiesCallout(caseStudy, caseStudies);
  } catch (e) {
    container.innerHTML = '<p class="text-gray-500">Case study content could not be loaded. <a href="' + getHomeUrl() + '" class="text-primary hover:underline">Back to dashboard</a>.</p>';
  }
}

function renderRelatedCaseStudiesCallout(caseStudy, allCaseStudies) {
  const relatedIds = Array.isArray(caseStudy.related_case_studies) ? caseStudy.related_case_studies : [];
  if (!relatedIds.length) return;
  const related = relatedIds
    .map(id => allCaseStudies.find(cs => cs.id === id))
    .filter(Boolean)
    .slice(0, 6);
  if (!related.length) return;

  const container = document.getElementById('case-study-content');
  if (!container) return;

  const items = related.map(cs => `
    <a href="${getBasePath()}case-study.html?id=${encodeURIComponent(cs.id)}" class="block p-3 rounded-lg bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 hover:border-primary/60 hover:bg-white dark:hover:bg-gray-800 transition-colors">
      <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">${cs.category || 'Further study'}</div>
      <div class="font-semibold text-gray-800 dark:text-gray-100">${cs.title}</div>
      <div class="text-sm text-gray-600 dark:text-gray-300 mt-1">${(cs.short_description || '').replace(/<[^>]*>/g, '').substring(0, 140)}${(cs.short_description || '').length > 140 ? '…' : ''}</div>
    </a>
  `).join('');

  const callout = document.createElement('section');
  callout.className = 'mt-10 p-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/40 dark:to-gray-800/40';
  callout.innerHTML = `
    <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Related further studies</h2>
    <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">Cross-links from Featured → Archive (same depth; organized for focus).</p>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${items}</div>
    <div class="mt-4">
      <a href="${getBasePath()}case-studies-archive.html" class="text-sm font-semibold text-primary hover:underline">Browse the Archive →</a>
    </div>
  `;
  container.appendChild(callout);
}

/* ---------- PROJECT DETAIL PAGE ---------- */
async function loadProjectDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  if (!projectId) return;

  const [projects, caseStudies] = await Promise.all([loadProjects(), loadCaseStudies()]);
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  const caseStudy = caseStudies.find(cs => cs.project_id === projectId);
  let contentFromFile = null;
  if (project.content_path) {
    contentFromFile = await fetchProjectContent(project.content_path);
  }
  renderProject(project, caseStudy, contentFromFile);
}

/** Fetch project content from HTML file; returns { overview, problem, approach, insights, media } or null. */
async function fetchProjectContent(path) {
  try {
    const resolvedPath = path.startsWith('data/') ? getDataBase() + path.slice(5) : path;
    const res = await fetch(resolvedPath);
    if (!res.ok) return null;
    const html = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const get = (id) => { const el = doc.getElementById(id); return el ? el.innerHTML.trim() : ''; };
    return {
      overview: get('overview'),
      problem: get('problem'),
      approach: get('approach'),
      insights: get('insights'),
      media: get('media')
    };
  } catch (e) {
    console.warn('Failed to load project content from', path, e);
    return null;
  }
}

function renderProject(project, caseStudy, contentFromFile) {
  document.title = `${project.title} | Sumit S. Chaure`;

  // Update sharing metadata if meta tags exist on the page head.
  const descriptionText = truncateText(stripHtmlToText(project.short_description || project.full_description || ''), 160);
  const impactText = getImpactPreview(project);
  const ogTitle = `${project.title} | Sumit S. Chaure`;
  const ogDesc = truncateText(impactText || descriptionText, 170);
  const ogImage = resolveAssetUrl(project, project.thumbnail || 'assets/images/thumbs/01.jpg');
  setMetaContent('meta[name="description"]', descriptionText || ogDesc);
  setMetaContent('meta[property="og:title"]', ogTitle);
  setMetaContent('meta[property="og:description"]', ogDesc);
  setMetaContent('meta[property="og:image"]', ogImage);
  setMetaContent('meta[name="twitter:title"]', ogTitle);
  setMetaContent('meta[name="twitter:description"]', ogDesc);
  setMetaContent('meta[name="twitter:image"]', ogImage);

  const insightsHtml = contentFromFile?.insights || project?.insights || '';
  const outcomeBullets = extractFirstListItemsText(insightsHtml, 3)
    .map(b => truncateText(b, 95))
    .filter(Boolean)
    .map(b => escapeHtml(b));

  const hero = document.getElementById("project-hero");
  if (hero) {
    hero.innerHTML = `
      <div class="container mx-auto px-6 py-16 text-center">
        <div class="text-sm text-gray-500 mb-4">
          <span class="text-white/90">${project.category || "Analytics"}</span>
          ${project.date ? ` • <span class="text-white/80">${project.date}</span>` : ""}
        </div>
        <h1 class="text-4xl md:text-6xl font-bold text-white mb-6">${project.title}</h1>
        <p class="text-xl text-white/90 max-w-2xl mx-auto mb-8">${project.short_description || ""}</p>
        ${
          outcomeBullets.length
            ? `
          <div class="max-w-3xl mx-auto mb-8 text-left">
            <div class="text-xs font-semibold tracking-wide uppercase text-white/80">Metrics & Outcomes</div>
            <ul class="mt-3 space-y-2">
              ${outcomeBullets
                .map(b => `<li class="flex gap-3"><span class="text-primary font-bold">•</span><span class="text-white/90">${b}</span></li>`)
                .join('')}
            </ul>
          </div>
        `
            : ''
        }
        <div class="flex flex-wrap gap-3 justify-center">
          ${project.github_url ? `<a href="${project.github_url}" target="_blank" class="px-6 py-3 bg-primary text-white rounded-lg hover:bg-accent transition-colors font-bold">GitHub</a>` : ""}
          ${project.demo_url ? `<a href="${project.demo_url}" target="_blank" class="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold">Live Demo</a>` : ""}
        </div>
      </div>
    `;
  }

  // Build sections with IDs for TOC (use content from HTML file if available, else JSON)
  const sections = [];
  const editorStory = editorBlocksToHtml(project?.editor_content);
  const overview = editorStory || contentFromFile?.overview || project.full_description;
  const problem = contentFromFile?.problem || project.problem_statement;
  const approach = contentFromFile?.approach || project.approach;
  const insights = contentFromFile?.insights || project.insights;
  const mediaNotes = contentFromFile?.media || project.media_notes;
  if (overview) sections.push({ id: 'overview', title: editorStory ? 'Story' : 'Overview', content: overview });
  if (problem) sections.push({ id: 'problem', title: 'Problem Statement', content: problem });
  if (approach) sections.push({ id: 'approach', title: 'Approach / Methodology', content: approach });
  if (insights) sections.push({ id: 'insights', title: 'Insights & Outcomes', content: insights });
  if (caseStudy && caseStudy.case_study_path) {
    sections.push({
      id: 'case-study',
      title: 'Case Study (Long-form)',
      content: `<div id="case-study-assets" class="mb-6"></div><div id="case-study-content" class="text-sm text-gray-600 dark:text-gray-300">Loading case study…</div>`,
      isMedia: false
    });
  }
  if (project.notebook_url) {
    sections.push({
      id: 'notebook',
      title: 'Notebook (Code Walkthrough)',
      content: '<p class="text-sm text-gray-600 dark:text-gray-300">The full notebook is available via the “View Notebook” button in the Tools / Artifacts panel.</p>',
      isMedia: false
    });
  }
  if (mediaNotes) sections.push({ id: 'media', title: 'Media & Assets', content: mediaNotes });
  if (shouldShowAppsSection(project)) {
    sections.push({ id: 'apps', title: 'Applications & Dashboards', content: appsSection(project), isMedia: true });
  } else {
    if (project.streamlit_url) sections.push({ id: 'streamlit', title: 'Streamlit App', content: streamlitEmbed(project.streamlit_url), isMedia: true });
    if (project.powerbi_embed_url || project.pbix_download_path) sections.push({ id: 'powerbi', title: 'Power BI Dashboard', content: powerBiBlock(project.powerbi_embed_url, project.pbix_download_path, project), isMedia: true });
    if (project.video_url) sections.push({ id: 'video', title: 'Video Walkthrough', content: videoEmbed(project.video_url), isMedia: true });
  }
  if (project.images && project.images.length > 0) sections.push({ id: 'gallery', title: 'Gallery', content: galleryBlock(project.images, project), isMedia: true });
  if (project.slide_pdf_path) sections.push({ id: 'slides', title: 'Slides / PDF', content: pdfEmbed(project.slide_pdf_path, project), isMedia: true });

  const main = document.getElementById("project-main");
  if (main) {
    main.innerHTML = sections.map(s => section(s.title, s.content, s.id, s.isMedia)).join('');
    // Initialize any gallery carousels rendered inside the project content
    initGalleryCarousels();
  }

  // Generate TOC
  const tocNav = document.getElementById("toc-nav");
  const tocSelect = document.getElementById("project-toc-select");
  if (tocNav) {
    tocNav.innerHTML = sections.map(s => 
      `<a href="#${s.id}" class="block text-sm text-gray-600 hover:text-primary transition-colors py-1 toc-link" data-section="${s.id}">${s.title}</a>`
    ).join('');
    
    // Add scroll spy for TOC
    initTOCScrollSpy();
  }

  // Populate mobile TOC select
  if (tocSelect) {
    tocSelect.innerHTML = `<option value="">Select a section…</option>` + 
      sections.map(s => `<option value="${s.id}">${s.title}</option>`).join('');
    tocSelect.addEventListener('change', () => {
      const id = tocSelect.value;
      if (!id) return;
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
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

  if (caseStudy && caseStudy.case_study_path) {
    loadCaseStudyIntoProject(project, caseStudy);
  }
}

async function loadCaseStudyIntoProject(project, caseStudy) {
  const container = document.getElementById('case-study-content');
  if (!container) return;

  try {
    const editorStory = editorBlocksToHtml(caseStudy?.editor_content);
    if (editorStory) {
      container.innerHTML = editorStory;
      const assetsSlot = document.getElementById('case-study-assets');
      if (assetsSlot) assetsSlot.innerHTML = caseStudyAssetsCallout(project);
      return;
    }
    const casePath = caseStudy.case_study_path.startsWith('data/') ? getDataBase() + caseStudy.case_study_path.slice(5) : caseStudy.case_study_path;
    const res = await fetch(casePath);
    if (!res.ok) throw new Error(`Failed to load case study: ${res.status}`);
    const html = await res.text();
    container.innerHTML = html;

    const assetsSlot = document.getElementById('case-study-assets');
    if (assetsSlot) assetsSlot.innerHTML = caseStudyAssetsCallout(project);
  } catch (e) {
    container.innerHTML = `<div class="text-sm text-gray-600 dark:text-gray-300">Case study content coming soon.</div>`;
  }
}

function caseStudyAssetsCallout(project) {
  const links = [
    project.github_url ? { label: 'GitHub', url: project.github_url } : null,
    project.demo_url ? { label: 'Demo', url: project.demo_url } : null,
    project.streamlit_url ? { label: 'Streamlit', url: project.streamlit_url } : null,
    project.powerbi_embed_url ? { label: 'Power BI', url: project.powerbi_embed_url } : null,
    project.video_url ? { label: 'Video', url: project.video_url } : null,
    project.notebook_url ? { label: 'Notebook', url: project.notebook_url } : null,
  ].filter(Boolean);

  const downloads = [
    project.pbix_download_path ? { label: 'PBIX', url: resolveAssetUrl(project, project.pbix_download_path) } : null,
    project.slide_pdf_path ? { label: 'PDF', url: resolveAssetUrl(project, project.slide_pdf_path) } : null,
  ].filter(Boolean);

  const pill = (l, isPrimary = false) =>
    `<a href="${l.url}" target="_blank" rel="noopener" class="artifact-button ${isPrimary ? 'artifact-button--primary' : 'artifact-button--ghost'}">${l.label}</a>`;

  const empty = `<span class="text-xs text-gray-500 dark:text-gray-300">Add links (GitHub/Demo/Streamlit/Power BI/Video/PBIX/PDF) in <code>data/projects.json</code>.</span>`;

  const itemsHtml = links.length || downloads.length
    ? `${links.map((l, index) => pill(l, index === 0)).join('')}${downloads.map(d => pill(d, false)).join('')}`
    : empty;

  return `
    <div class="artifact-container">
      <div class="artifact-container-header">Explore assets</div>
      <div class="artifact-buttons">
        ${itemsHtml}
      </div>
    </div>
  `;
}

function section(title, content, id = null, isMedia = false) {
  if (!content) return "";
  const sectionId = id || title.toLowerCase().replace(/\s+/g, '-');
  return `
    <section id="${sectionId}" class="mb-12 scroll-mt-24">
      <h2 class="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-4">${title}</h2>
      ${isMedia
        ? `<div class="media-container">${content}</div>`
        : `<div class="text-gray-600 dark:text-gray-300 leading-relaxed space-y-4">${content}</div>`}
    </section>
  `;
}

function shouldShowAppsSection(project) {
  return Boolean(project.show_apps_section);
}

function appsSection(project) {
  const streamlitBlock = project.streamlit_url
    ? streamlitEmbed(project.streamlit_url)
    : `<div class="text-sm text-gray-600 dark:text-gray-300">Streamlit app link coming soon.</div>`;
  const powerbiBlock = project.powerbi_embed_url || project.pbix_download_path
    ? powerBiBlock(project.powerbi_embed_url, project.pbix_download_path, project)
    : `<div class="text-sm text-gray-600 dark:text-gray-300">Power BI dashboard link coming soon.</div>`;
  const videoBlock = project.video_url
    ? videoEmbed(project.video_url)
    : `<div class="text-sm text-gray-600 dark:text-gray-300">Video walkthrough coming soon.</div>`;

  return `
    <div class="space-y-6">
      <div>
        <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Streamlit App</h3>
        ${streamlitBlock}
      </div>
      <div>
        <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Power BI Dashboard</h3>
        ${powerbiBlock}
      </div>
      <div>
        <h3 class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-3">Video Walkthrough</h3>
        ${videoBlock}
      </div>
    </div>
  `;
}

function mediaBlock(title, content) {
  if (!content) return "";
  const sectionId = title.toLowerCase().replace(/\s+/g, '-');
  return `
    <section id="${sectionId}" class="mb-12 scroll-mt-24">
      <h2 class="text-3xl font-bold text-gray-800 mb-4">${title}</h2>
      <div class="media-container">${content}</div>
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
  
  // Local paths – normalize so they work from both root and /pages/*
  // If the path points into the bundled assets folder, always treat it as root-relative.
  if (assetPath.startsWith('assets/')) {
    return '/' + assetPath;
  }
  if (assetPath.startsWith('./assets/')) {
    return '/' + assetPath.replace(/^\.\//, '');
  }
  // Already root-relative or explicitly relative – return as-is
  return assetPath;
}

/**
 * Given an image path used in data (usually PNG/JPG under assets/images),
 * return the corresponding optimized WebP path.
 *
 * Example:
 *   assets/images/projects/foo/01.jpg
 * → /assets/optimized-images/projects/foo/01.webp
 *
 * If the path is external or not under assets/images, we just return it as-is.
 */
function getOptimizedImagePath(assetPath) {
  if (!assetPath) return '';
  // Only handle our local images; external URLs stay as-is
  if (!assetPath.startsWith('assets/images/')) return assetPath;

  // Strip leading "assets/images/" and any query/hash
  const withoutPrefix = assetPath.replace(/^assets\/images\//, '');
  const baseNoQuery = withoutPrefix.split(/[?#]/)[0];
  const webpPath = baseNoQuery.replace(/\.(png|jpe?g)$/i, '.webp');

  // New location (preferred).
  // If the WebP is missing, the <picture> will fall back to the <img> (original PNG/JPG).
  return `/assets/optimized-images/${webpPath}`;
}

function streamlitEmbed(url) {
  return `
    <div class="embed-container">
      <button class="embed-expand-btn" type="button" onclick="openEmbedModal('${url}?embed=true', 'Streamlit App')">
        Expand
      </button>
      <iframe src="${url}?embed=true" frameborder="0" allowfullscreen loading="lazy"></iframe>
    </div>
  `;
}

function powerBiBlock(embedUrl, downloadPath, project = null) {
  if (embedUrl) {
    return `
      <div class="embed-container">
        <button class="embed-expand-btn" type="button" onclick="openEmbedModal('${embedUrl}', 'Power BI Dashboard')">
          Expand
        </button>
        <iframe src="${embedUrl}" frameborder="0" allowfullscreen loading="lazy"></iframe>
      </div>
    `;
  } else if (downloadPath) {
    const resolvedUrl = project ? resolveAssetUrl(project, downloadPath) : downloadPath;
    return `
      <div class="artifact-container">
        <div class="artifact-container-header">Power BI Artifact</div>
        <div class="artifact-buttons">
          <a href="${resolvedUrl}" download class="artifact-button artifact-button--primary">Download PBIX</a>
        </div>
      </div>
    `;
  }
  return "";
}

function videoEmbed(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    if (videoId) {
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      return `
        <div class="embed-container">
          <button class="embed-expand-btn" type="button" onclick="openEmbedModal('${embedUrl}', 'Video Walkthrough')">
            Expand
          </button>
          <iframe src="${embedUrl}" frameborder="0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>
        </div>
      `;
    }
  }
  return `
    <div class="embed-container">
      <button class="embed-expand-btn" type="button" onclick="openEmbedModal('${url}', 'Video Walkthrough')">
        Expand
      </button>
      <video controls>
        <source src="${url}" type="video/mp4">
      </video>
    </div>
  `;
}

function notebookEmbed(url) {
  if (!url) return "";
  const isGithub = url.includes("github.com") && url.includes(".ipynb");
  const embedUrl = isGithub ? url.replace("https://github.com/", "https://nbviewer.org/github/") : url;
  return `
    <div class="artifact-container">
      <div class="artifact-container-header">Notebook</div>
      <div class="artifact-buttons">
        <button type="button" class="artifact-button artifact-button--primary" onclick="openEmbedModal('${embedUrl}', 'Notebook Preview')">
          View Notebook
        </button>
      </div>
    </div>
  `;
}

function pdfEmbed(path, project = null) {
  const resolvedPath = project ? resolveAssetUrl(project, path) : path;
  return `
    <div class="media-container">
      <div class="embed-container embed-pdf">
        <iframe src="${resolvedPath}" width="100%" height="100%" frameborder="0" loading="lazy"></iframe>
      </div>
    </div>
  `;
}

// Infer a human-friendly caption from an image file name (fallbacks to project title + view index)
function inferImageCaption(imgPath, project = null, position = 1) {
  if (!imgPath) {
    return project ? `${project.title} – view ${position}` : `Screenshot ${position}`;
  }
  // Strip query/hash and extension
  const cleanPath = imgPath.split(/[?#]/)[0];
  const file = cleanPath.split('/').pop() || '';
  let base = file.replace(/\.[^/.]+$/, '');
  if (!base) {
    return project ? `${project.title} – view ${position}` : `Screenshot ${position}`;
  }
  // If purely numeric (e.g. 01, 02) fall back to generic caption
  if (/^\d+$/.test(base)) {
    return project ? `${project.title} – view ${position}` : `Screenshot ${position}`;
  }
  // Replace separators with spaces and normalize
  base = base.replace(/[_-]+/g, ' ').trim().replace(/\s+/g, ' ');
  if (!base) {
    return project ? `${project.title} – view ${position}` : `Screenshot ${position}`;
  }
  // Title-case words
  base = base
    .split(' ')
    .map(w => w ? w.charAt(0).toUpperCase() + w.slice(1) : '')
    .join(' ');
  return base;
}

function galleryBlock(images, project = null) {
  if (!images || images.length === 0) return "";
  const resolvedImages = project
    ? images.map(img => resolveAssetUrl(project, img))
    : images;
  const fallbackImage = 'assets/images/thumbs/01.jpg'; // Use actual image as fallback
  const total = resolvedImages.length;

  // Single-image gallery: keep it simple but with caption overlay
  if (total === 1) {
    const img = resolvedImages[0];
    const caption = inferImageCaption(images[0] || img, project, 1);
    const alt = caption || (project ? `${project.title} – key dashboard view` : 'Project image');
    const optimized = getOptimizedImagePath(images[0] || img);
    return `
      <div class="media-container">
        <div class="gallery-single">
        <figure class="gallery-slide is-active">
          <div class="gallery-slide-inner">
            <picture>
              <source srcset="${optimized}" type="image/webp">
              <img src="${img}" alt="${alt}" class="w-full rounded-lg shadow-md gallery-item" onerror="this.onerror=null; this.src='${fallbackImage}'; this.alt='Image not available';">
            </picture>
            <figcaption class="gallery-caption">
              <span class="gallery-caption-index">1/1</span>
              <span class="gallery-caption-text">${caption}</span>
            </figcaption>
          </div>
        </figure>
        </div>
      </div>
    `;
  }

  // Multi-image gallery → carousel with captions and controls
  const galleryId = project ? project.id : 'inline-gallery';
  return `
    <div class="media-container">
      <div class="gallery-carousel" data-gallery="${galleryId}">
      <div class="gallery-track">
        <div class="gallery-track-inner">
        ${resolvedImages
          .map((img, index) => {
            const position = index + 1;
            const originalPath = images[index] || img;
            const caption = inferImageCaption(originalPath, project, position);
            const alt = caption || (project ? `${project.title} – view ${position}` : `Project image ${position}`);
            const optimized = getOptimizedImagePath(originalPath);
            return `
              <figure class="gallery-slide ${index === 0 ? 'is-center' : index === 1 ? 'is-right' : 'is-hidden'}" data-index="${index}">
                <div class="gallery-slide-inner">
                  <picture>
                    <source srcset="${optimized}" type="image/webp">
                    <img src="${img}" alt="${alt}" class="gallery-item" onerror="this.onerror=null; this.src='${fallbackImage}'; this.alt='Image not available';" loading="lazy">
                  </picture>
                  <figcaption class="gallery-caption">
                    <span class="gallery-caption-index">${position}/${total}</span>
                    <span class="gallery-caption-text">${caption}</span>
                  </figcaption>
                </div>
              </figure>
            `;
          })
          .join('')}
        </div>
      </div>
      <button class="gallery-nav gallery-prev" type="button" aria-label="Previous image">
        <span>&larr;</span>
      </button>
      <button class="gallery-nav gallery-next" type="button" aria-label="Next image">
        <span>&rarr;</span>
      </button>
      <div class="gallery-dots" aria-label="Select image">
        ${resolvedImages
          .map(
            (_img, index) => `
          <button
            class="gallery-dot ${index === 0 ? 'is-active' : ''}"
            type="button"
            data-index="${index}"
            aria-label="Go to image ${index + 1}"
          ></button>`
          )
          .join('')}
      </div>
    </div>
  </div>
  `;
}

// Initialize all gallery carousels on the current page
function initGalleryCarousels() {
  const carousels = document.querySelectorAll('.gallery-carousel');
  if (!carousels.length) return;
  carousels.forEach(setupGalleryCarousel);
}

function setupGalleryCarousel(container) {
  const track = container.querySelector('.gallery-track');
  const trackInner = container.querySelector('.gallery-track-inner');
  const slides = Array.from(container.querySelectorAll('.gallery-slide'));
  const dots = Array.from(container.querySelectorAll('.gallery-dot'));
  const prevBtn = container.querySelector('.gallery-prev');
  const nextBtn = container.querySelector('.gallery-next');

  if (!track || !trackInner || !slides.length) return;

  const total = slides.length;
  let current = 0;
  let autoplayTimer = null;
  let isPaused = false;

  // Set track-inner width to accommodate all slides
  // Each slide is 15% (side) or 70% (center) of viewport width
  // Total width needed: (total - 1) * 15% + 70% = 15 * total + 55%
  // But we need to account for all slides being laid out
  // Actually, simpler: make it wide enough (each slide takes its percentage of viewport)
  // Track-inner should be at least: sum of all slide widths
  // For N slides: (N-1) * 15% + 70% = 15N + 55%
  const trackInnerWidth = total > 1 ? (total - 1) * 15 + 70 : 100;
  trackInner.style.width = `${trackInnerWidth}%`;

  // Calculate translate percentage to center the active slide
  // Layout: each slide is 15% (side) or 70% (center) of viewport width
  // Track-inner contains all slides in a flex row
  // To center slide i: translate track-inner so slide i's center aligns with viewport center (50%)
  function updateCarousel() {
    if (total === 0) return;

    let translatePercent = 0;
    
    if (total === 1) {
      translatePercent = 0;
    } else {
      // Calculate cumulative width of slides before current slide
      // Each slide before current is 15% (side) when not center
      let cumulativeWidth = 0;
      for (let i = 0; i < current; i++) {
        cumulativeWidth += 15; // Previous slides are 15% (sides)
      }
      
      // Current slide is 70% wide, its center is at cumulativeWidth + 35%
      // Viewport center is at 50% of viewport
      // We need to translate track-inner so that (cumulativeWidth + 35%) aligns with 50%
      // Since track-inner is wider than viewport, we translate by the difference
      // Translate by: 50% - (cumulativeWidth + 35%) = 15% - cumulativeWidth
      // But wait, we're translating the track-inner, so we need to move it left (negative)
      // If slide center is at cumulativeWidth + 35%, and we want it at 50%,
      // we translate by: 50% - (cumulativeWidth + 35%) = 15% - cumulativeWidth
      translatePercent = 50 - (cumulativeWidth + 35);
    }

    // Update track transform - translate track-inner to center the current slide
    trackInner.style.transform = `translateX(${translatePercent}%)`;

    // Update slide classes
    const prevIndex = (current - 1 + total) % total;
    const nextIndex = (current + 1) % total;

    slides.forEach((slide, i) => {
      slide.classList.remove('is-center', 'is-left', 'is-right', 'is-hidden');
      if (total === 1) {
        slide.classList.add('is-center');
      } else if (total === 2) {
        if (i === current) {
          slide.classList.add('is-center');
        } else {
          slide.classList.add(i === prevIndex ? 'is-left' : 'is-right');
        }
      } else {
        if (i === current) {
          slide.classList.add('is-center');
        } else if (i === prevIndex) {
          slide.classList.add('is-left');
        } else if (i === nextIndex) {
          slide.classList.add('is-right');
        } else {
          slide.classList.add('is-hidden');
        }
      }
    });

    // Update dots
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === current);
    });
  }

  function goTo(index) {
    if (total === 0) return;
    current = (index + total) % total;
    updateCarousel();
  }

  function next() {
    goTo(current + 1);
  }

  function prev() {
    goTo(current - 1);
  }

  function startAutoplay() {
    if (isPaused || total <= 1) return;
    stopAutoplay();
    autoplayTimer = window.setInterval(() => {
      if (!isPaused) next();
    }, 7000); // 7s interval - calm and professional
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  // Attach events
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prev();
      stopAutoplay();
      setTimeout(startAutoplay, 3000); // Resume after 3s pause
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      next();
      stopAutoplay();
      setTimeout(startAutoplay, 3000); // Resume after 3s pause
    });
  }

  if (dots.length) {
    dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const index = parseInt(dot.dataset.index || '0', 10);
        goTo(index);
        stopAutoplay();
        setTimeout(startAutoplay, 3000);
      });
    });
  }

  // Pause on hover/interaction
  container.addEventListener('mouseenter', () => {
    isPaused = true;
    stopAutoplay();
  });

  container.addEventListener('mouseleave', () => {
    isPaused = false;
    startAutoplay();
  });

  // Touch/swipe support for mobile
  let touchStartX = 0;
  let touchEndX = 0;

  container.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    isPaused = true;
    stopAutoplay();
  });

  container.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const swipeDistance = touchStartX - touchEndX;
    if (Math.abs(swipeDistance) > 50) {
      if (swipeDistance > 0) {
        next();
      } else {
        prev();
      }
    }
    setTimeout(() => {
      isPaused = false;
      startAutoplay();
    }, 3000);
  });

  // Initial state
  updateCarousel();
  startAutoplay();
}

function ensureEmbedModal() {
  if (document.getElementById('embed-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'embed-modal';
  modal.className = 'embed-modal hidden';
  modal.innerHTML = `
    <div class="embed-modal-backdrop" onclick="closeEmbedModal()"></div>
    <div class="embed-modal-content">
      <div class="embed-modal-header">
        <h3 id="embed-modal-title">Preview</h3>
        <div class="embed-modal-actions">
          <a id="embed-modal-open-link" href="#" target="_blank" rel="noopener" class="embed-modal-open-link">Open in new tab</a>
          <button type="button" class="embed-modal-close" onclick="closeEmbedModal()">✕</button>
        </div>
      </div>
      <div class="embed-modal-body">
        <iframe id="embed-modal-iframe" src="" frameborder="0" allowfullscreen loading="lazy"></iframe>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function openEmbedModal(url, title) {
  ensureEmbedModal();
  const modal = document.getElementById('embed-modal');
  const iframe = document.getElementById('embed-modal-iframe');
  const modalTitle = document.getElementById('embed-modal-title');
  const openLink = document.getElementById('embed-modal-open-link');
  if (iframe) iframe.src = url;
  if (modalTitle) modalTitle.textContent = title || 'Preview';
  if (openLink) openLink.href = url;
  if (modal) modal.classList.remove('hidden');
}

function closeEmbedModal() {
  const modal = document.getElementById('embed-modal');
  const iframe = document.getElementById('embed-modal-iframe');
  if (iframe) iframe.src = '';
  if (modal) modal.classList.add('hidden');
}

// Close embed modal on ESC key
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' || event.key === 'Esc') {
    closeEmbedModal();
  }
});

function toolsBlock(tools, projectId) {
  if (!tools || tools.length === 0) return "";
  return `
    <div class="artifact-container">
      <div class="artifact-container-header">Tools & Stack</div>
      <div class="artifact-buttons">
        ${tools.map(t => `<button class="tool-badge artifact-button artifact-button--ghost" data-tool="${t}" data-project-id="${projectId}">${t}</button>`).join('')}
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
      window.location.href = `${getHomeUrl()}?filter=${encodeURIComponent(tool)}`;
    });
  });
}

// Initialize TOC scroll spy
function initTOCScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const tocLinks = document.querySelectorAll('.toc-link');
  const tocSelect = document.getElementById('project-toc-select');
  
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
      link.classList.remove('text-primary', 'font-semibold', 'toc-link-active');
      if (link.dataset.section === current) {
        link.classList.add('text-primary', 'font-semibold', 'toc-link-active');
        // Sync mobile dropdown highlight
        if (tocSelect && tocSelect.value !== current) {
          tocSelect.value = current;
        }
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
  if (project.github_url) links.push({ label: 'View Code', url: project.github_url, primary: true });
  if (project.demo_url) links.push({ label: 'Live Demo', url: project.demo_url, primary: !project.github_url });
  if (project.medium_url) links.push({ label: 'Medium Article', url: project.medium_url, primary: false });
  if (project.kaggle_url) links.push({ label: 'Kaggle Notebook', url: project.kaggle_url, primary: false });
  if (project.notebook_url && !project.kaggle_url) {
    // Prefer nbviewer for GitHub-hosted notebooks
    const isGithub = project.notebook_url.includes("github.com") && project.notebook_url.includes(".ipynb");
    const embedUrl = isGithub ? project.notebook_url.replace("https://github.com/", "https://nbviewer.org/github/") : project.notebook_url;
    links.push({ label: 'View Notebook', url: embedUrl, primary: !project.github_url && !project.demo_url });
  } else if (!project.kaggle_url) {
    // Template for notebook button even if URL not yet provided
    links.push({ label: 'View Notebook', url: '', primary: false });
  }
  
  if (links.length === 0) return "";
  return `
    <div class="artifact-container">
      <div class="artifact-container-header">Tools &amp; Artifacts</div>
      <div class="artifact-buttons">
        ${links
          .map(link => {
            const isNotebook = link.label.toLowerCase().includes('notebook');
            const isCode = link.label.toLowerCase().includes('code');
            if (isNotebook || isCode) {
              return `<button type="button" class="artifact-button ${link.primary ? 'artifact-button--primary' : 'artifact-button--ghost'}" ${link.url ? `onclick="openEmbedModal('${link.url}', '${link.label}')"` : 'disabled aria-disabled="true"'}>${link.label}</button>`;
            }
            return `<a href="${link.url}" target="_blank" rel="noopener" class="artifact-button ${link.primary ? 'artifact-button--primary' : 'artifact-button--ghost'}">${link.label}</a>`;
          })
          .join('')}
      </div>
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
