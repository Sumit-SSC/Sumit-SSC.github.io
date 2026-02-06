/* ===================================================
   Component System - Reusable UI Components
   Loads header, footer, navigation dynamically
   =================================================== */

// Navigation configuration - single source of truth
const NAV_CONFIG = {
  brand: {
    text: "Analytics Portfolio",
    link: "index.html"
  },
  links: [
    { text: "Projects", href: "index.html", key: "projects" },
    { text: "About", href: "pages/about.html", key: "about" },
    { text: "Resume", href: "pages/resume.html", key: "resume" },
    { text: "Skills", href: "pages/skills.html", key: "skills" },
    { text: "Contact", href: "pages/contact.html", key: "contact" }
  ],
  social: [
    { 
      name: "LinkedIn", 
      href: "https://www.linkedin.com/in/sumitsc/", 
      icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`
    },
    { 
      name: "GitHub", 
      href: "https://github.com/Sumit-SC", 
      icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`
    },
    { 
      name: "Kaggle", 
      href: "https://www.kaggle.com/mitsu00", 
      icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M21.5 0h-4L11 7.8V0H6v24h5v-7.4l6.8 7.4h4.7L15 12.3z"></path></svg>`
    },
    { 
      name: "Medium", 
      href: "https://medium.com/@sumitsc.work", 
      icon: `<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/></svg>`
    },
    { 
      name: "Email", 
      href: "mailto:sumitsc.work@gmail.com", 
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>`
    }
  ]
};

// Get current page key from URL
function getCurrentPageKey() {
  const path = window.location.pathname;
  const page = path.split('/').pop() || 'index.html';
  
  // Map file names to keys
  const pageMap = {
    'index.html': 'home',
    'homepage.html': 'projects',
    'about.html': 'about',
    'resume.html': 'resume',
    'contact.html': 'contact',
    'project.html': 'projects',
    'socialhandles.html': 'contact',
    'skills.html': 'skills'
  };
  
  return pageMap[page] || 'home';
}

// Render Navigation Component
function renderNavigation(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const currentKey = getCurrentPageKey();
  const style = options.style || 'default'; // 'default', 'minimal', 'spectral'
  
  let navHTML = '';
  
  if (style === 'spectral') {
    // Spectral theme navigation (for index.html)
    navHTML = `
      <header id="header" class="alt">
        <h1><a href="${NAV_CONFIG.brand.link}">${NAV_CONFIG.brand.text}</a></h1>
        <nav id="nav">
          <ul>
            <li class="special">
              <a href="#menu" class="menuToggle"><span>Menu</span></a>
              <div id="menu">
                <ul>
                  ${NAV_CONFIG.links.map(link => 
                    `<li><a href="${link.href}">${link.text}</a></li>`
                  ).join('')}
                </ul>
              </div>
            </li>
          </ul>
        </nav>
      </header>
    `;
  } else {
    // Default Tailwind navigation
    const activeLink = NAV_CONFIG.links.find(l => l.key === currentKey);
    
    navHTML = `
      <header class="bg-white shadow-sm sticky top-0 z-40">
        <nav class="container mx-auto px-6 py-4 flex justify-between items-center">
          <div class="flex items-center gap-8">
            <a href="${NAV_CONFIG.brand.link}" class="text-2xl font-bold text-gray-800 hover:text-primary transition-colors">
              ${NAV_CONFIG.brand.text}
            </a>
            <ul class="flex gap-6">
              ${NAV_CONFIG.links.map(link => {
                const isActive = link.key === currentKey;
                return `
                  <li>
                    <a href="${link.href}" 
                       class="${isActive ? 'text-primary font-semibold border-b-2 border-primary pb-1' : 'text-gray-600 hover:text-primary transition-colors'}">
                      ${link.text}
                    </a>
                  </li>
                `;
              }).join('')}
            </ul>
          </div>
          <div class="flex items-center gap-4">
            ${NAV_CONFIG.social.map(social => `
              <a href="${social.href}" 
                 target="_blank" 
                 class="text-gray-600 hover:text-primary transition-colors" 
                 aria-label="${social.name}">
                ${social.icon}
              </a>
            `).join('')}
          </div>
        </nav>
      </header>
    `;
  }
  
  container.innerHTML = navHTML;
}

// Render Footer Component
function renderFooter(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const style = options.style || 'default';
  const year = new Date().getFullYear();
  
  let footerHTML = '';
  
  if (style === 'spectral') {
    footerHTML = `
      <footer id="footer">
        <ul class="icons">
          ${NAV_CONFIG.social.map(social => `
            <li>
              <a href="${social.href}" target="_blank" class="icon ${social.name.toLowerCase()}">
                <span class="label">${social.name}</span>
              </a>
            </li>
          `).join('')}
        </ul>
        <ul class="copyright">
          <li>&copy; ${year} · Sumit S. Chaure · Data & Analytics Portfolio</li>
        </ul>
      </footer>
    `;
  } else {
    footerHTML = `
      <footer class="bg-gray-800 text-white py-8 mt-12">
        <div class="container mx-auto px-6">
          <div class="flex justify-center gap-6 mb-4">
            ${NAV_CONFIG.social.map(social => `
              <a href="${social.href}" 
                 target="_blank" 
                 class="text-gray-400 hover:text-primary transition-colors" 
                 aria-label="${social.name}">
                ${social.icon.replace('w-5 h-5', 'w-6 h-6')}
              </a>
            `).join('')}
          </div>
          <p class="text-center text-gray-400">
            &copy; ${year} · Sumit S. Chaure · Data & Analytics Portfolio
          </p>
        </div>
      </footer>
    `;
  }
  
  container.innerHTML = footerHTML;
}

// Initialize components on page load
function initComponents() {
  // Auto-detect and render navigation
  const navContainer = document.getElementById('nav-container') || 
                       document.querySelector('[data-component="navigation"]');
  if (navContainer) {
    const style = navContainer.dataset.style || 'default';
    renderNavigation(navContainer.id || 'nav-container', { style });
  }
  
  // Auto-detect and render footer
  const footerContainer = document.getElementById('footer-container') || 
                          document.querySelector('[data-component="footer"]');
  if (footerContainer) {
    const style = footerContainer.dataset.style || 'default';
    renderFooter(footerContainer.id || 'footer-container', { style });
  }
}

// Export for manual use
window.NavComponents = {
  renderNavigation,
  renderFooter,
  initComponents,
  config: NAV_CONFIG
};

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initComponents);
} else {
  initComponents();
}
