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

    var mq = window.matchMedia('(max-width: 767px)');

    var burger = document.createElement('button');
    burger.type = 'button';
    burger.className = 'site-nav-burger';
    burger.setAttribute('aria-label', 'Open menu');
    burger.setAttribute('aria-expanded', 'false');
    burger.innerHTML =
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16"/></svg>';

    var backdrop = document.createElement('div');
    backdrop.className = 'site-nav-backdrop';
    backdrop.id = 'site-nav-backdrop';

    var panel = document.createElement('div');
    panel.className = 'site-nav-panel';
    panel.id = 'site-nav-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Site navigation');

    brand.insertAdjacentElement('afterend', burger);
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    function fillPanel() {
      panel.innerHTML =
        '<p class="text-xs font-bold uppercase tracking-wide opacity-70 mb-3" style="margin:0 0 0.75rem">Navigate</p>';
      var wrap = document.createElement('div');
      wrap.innerHTML = cluster.innerHTML;
      panel.appendChild(wrap);
    }

    function setOpen(open) {
      if (open) fillPanel();
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      backdrop.classList.toggle('is-open', open);
      panel.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    }

    burger.addEventListener('click', function () {
      if (!mq.matches) return;
      var next = !panel.classList.contains('is-open');
      setOpen(next);
    });

    backdrop.addEventListener('click', function () {
      setOpen(false);
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
