/**
 * Mobile nav: replaces wide horizontal link strip with burger + slide-in panel.
 * Expects #nav.nav-single-line with .nav-brand and a .ml-auto cluster of links.
 */
(function () {
  function init() {
    var nav = document.querySelector('#nav.nav-single-line');
    if (!nav || nav.getAttribute('data-mobile-nav') === '1') return;

    var row = nav.querySelector('.container > div.flex');
    if (!row) return;

    var brand = row.querySelector('.nav-brand');
    var cluster = row.querySelector('.ml-auto');
    if (!brand || !cluster) return;

    nav.setAttribute('data-mobile-nav', '1');
    cluster.classList.add('site-nav-desktop-cluster');

    var mq = window.matchMedia('(max-width: 900px)');

    var burger = document.createElement('button');
    burger.type = 'button';
    burger.className = 'site-nav-burger';
    burger.setAttribute('aria-label', 'Open menu');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-controls', 'site-nav-panel');
    burger.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16"/></svg>';

    var quick = document.createElement('div');
    quick.className = 'site-nav-quick';
    quick.innerHTML =
      '<a href="homepage.html" class="site-nav-quick-link" aria-label="Projects"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z"/></svg></a>' +
      '<a href="about.html" class="site-nav-quick-link" aria-label="About"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c2-4 6-6 8-6s6 2 8 6"/></svg></a>' +
      '<a href="contact.html" class="site-nav-quick-link" aria-label="Contact"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18v12H3z"/><path d="M3 8l9 6 9-6"/></svg></a>' +
      '<button type="button" class="site-nav-quick-link site-nav-quick-theme" aria-label="Toggle theme"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button>';

    var backdrop = document.createElement('div');
    backdrop.className = 'site-nav-backdrop';
    backdrop.id = 'site-nav-backdrop';

    var panel = document.createElement('div');
    panel.className = 'site-nav-panel';
    panel.id = 'site-nav-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Site navigation');

    brand.insertAdjacentElement('afterend', quick);
    quick.insertAdjacentElement('afterend', burger);
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    function clonePanelLink(source) {
      var link = document.createElement('a');
      link.href = source.getAttribute('href') || '#';
      link.textContent = (source.textContent || source.getAttribute('aria-label') || 'Link').trim();
      link.className = 'site-nav-panel-link';
      if (source.getAttribute('aria-current') === 'page' || source.classList.contains('text-primary')) {
        link.classList.add('is-active');
      }
      return link;
    }

    function fillPanel() {
      panel.innerHTML = '';

      var head = document.createElement('div');
      head.className = 'site-nav-panel-head';
      head.innerHTML =
        '<div><p class="site-nav-panel-kicker">Navigate</p><strong>Menu</strong></div>' +
        '<button type="button" class="site-nav-panel-close" aria-label="Close menu">' +
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button>';
      panel.appendChild(head);

      var navLinks = document.createElement('nav');
      navLinks.className = 'site-nav-panel-links';
      Array.prototype.slice.call(cluster.querySelectorAll('a')).forEach(function (source) {
        var label = (source.textContent || '').trim();
        var href = source.getAttribute('href') || '';
        if (!label || href.indexOf('mailto:') === 0 || /^https?:\/\//i.test(href)) return;
        navLinks.appendChild(clonePanelLink(source));
      });
      panel.appendChild(navLinks);

      var actions = document.createElement('div');
      actions.className = 'site-nav-panel-actions';
      actions.innerHTML =
        '<button type="button" class="site-nav-panel-theme">' +
        '<span>Toggle theme</span><span class="site-nav-panel-theme-dot" aria-hidden="true"></span>' +
        '</button>';
      panel.appendChild(actions);

      var social = document.createElement('div');
      social.className = 'site-nav-panel-social';
      Array.prototype.slice.call(cluster.querySelectorAll('a[aria-label]')).forEach(function (source) {
        var href = source.getAttribute('href') || '';
        if (href.indexOf('mailto:') !== 0 && !/^https?:\/\//i.test(href)) return;
        var link = source.cloneNode(true);
        link.className = 'site-nav-panel-social-link';
        social.appendChild(link);
      });
      if (social.children.length) panel.appendChild(social);
    }

    function setOpen(open) {
      if (open) fillPanel();
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      backdrop.classList.toggle('is-open', open);
      panel.classList.toggle('is-open', open);
      document.body.classList.toggle('site-nav-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) {
        var firstLink = panel.querySelector('a');
        if (firstLink) firstLink.focus();
      } else {
        burger.focus();
      }
    }

    burger.addEventListener('click', function () {
      if (!mq.matches) return;
      var next = !panel.classList.contains('is-open');
      setOpen(next);
    });

    quick.addEventListener('click', function (e) {
      var themeBtn = e.target && e.target.closest ? e.target.closest('.site-nav-quick-theme') : null;
      if (!themeBtn) return;
      e.preventDefault();
      if (typeof window.toggleTheme === 'function') {
        window.toggleTheme();
      } else {
        var root = document.documentElement;
        root.classList.toggle('dark-theme');
      }
    });

    backdrop.addEventListener('click', function () {
      setOpen(false);
    });

    panel.addEventListener('click', function (e) {
      var t = e.target;
      if (t && t.closest && t.closest('.site-nav-panel-close')) {
        setOpen(false);
        return;
      }
      if (t && t.closest && t.closest('.site-nav-panel-theme')) {
        if (typeof window.toggleTheme === 'function') {
          window.toggleTheme();
        } else {
          document.documentElement.classList.toggle('dark-theme');
        }
        return;
      }
      if (t && t.closest && t.closest('a')) {
        setOpen(false);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) setOpen(false);
    });

    function onMq() {
      if (!mq.matches) setOpen(false);
    }

    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else mq.addListener(onMq);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
