/**
 * Loads theme tokens from `data/site-theme.json` and applies CSS variables.
 * Safe to include on every page; no-op if the file is missing.
 */
(function () {
  function normalizeMode(mode) {
    const m = String(mode || "").toLowerCase();
    if (m === "dark" || m === "light" || m === "system") return m;
    return "system";
  }

  function normalizeColorTheme(name) {
    const allowed = ["theme-custom", "theme-indigo", "theme-orange", "theme-emerald", "theme-purple"];
    const n = String(name || "").toLowerCase();
    return allowed.includes(n) ? n : "theme-custom";
  }

  function apply(theme) {
    if (!theme || typeof theme !== "object") return;
    const r = document.documentElement;
    if (theme.primary) r.style.setProperty("--primary", String(theme.primary));
    if (theme.accent) r.style.setProperty("--accent", String(theme.accent));
    if (theme.fontFamily) r.style.setProperty("--site-font-family", String(theme.fontFamily));
    if (theme.baseFontSizePx) r.style.setProperty("--site-base-font-size", String(theme.baseFontSizePx) + "px");
  }

  function urlFor(path) {
    // Root vs /pages/ handling
    const base = window.location.pathname.includes("/pages/") ? "../" : "";
    return base + path.replace(/^\//, "");
  }

  fetch(urlFor("data/site-theme.json"), { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      const t = j && j.theme ? j.theme : null;
      apply(t);
      if (!t || typeof t !== "object") return;
      const defaults = {
        defaultMode: normalizeMode(t.defaultMode),
        defaultColorTheme: normalizeColorTheme(t.defaultColorTheme),
        customPrimary: t.primary || "",
        customAccent: t.accent || ""
      };
      window.__SITE_THEME_DEFAULTS__ = defaults;
      if (!localStorage.getItem("theme")) {
        localStorage.setItem("theme", defaults.defaultMode);
      }
      if (!localStorage.getItem("colorTheme")) {
        localStorage.setItem("colorTheme", defaults.defaultColorTheme);
      }
    })
    .catch(function () {});
})();

