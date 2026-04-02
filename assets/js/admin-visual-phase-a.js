/**
 * Phase A: visual edit mode on homepage (view switcher titles).
 * Enable: open homepage with ?admin_edit=1 (after GitHub login via admin API).
 */
(function () {
  const API_BASE =
    window.__ADMIN_API_BASE__ || "https://admin-api.sumit.indevs.in";

  function params() {
    return new URLSearchParams(window.location.search);
  }

  function isEditMode() {
    const p = params();
    return p.get("admin_edit") === "1" || p.get("admin_embed") === "1";
  }

  function ensureBar() {
    let bar = document.getElementById("admin-phase-a-bar");
    if (bar) return bar;
    bar = document.createElement("div");
    bar.id = "admin-phase-a-bar";
    bar.setAttribute(
      "style",
      "position:fixed;bottom:16px;left:16px;right:16px;z-index:9999;max-width:42rem;margin:0 auto;padding:12px 16px;border-radius:12px;background:#0f172a;color:#f8fafc;font:14px/1.4 system-ui,Segoe UI,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.35);"
    );
    bar.innerHTML =
      '<div style="font-weight:600;margin-bottom:8px">Phase A — Homepage titles</div>' +
      '<p style="margin:0 0 10px;opacity:.9;font-size:12px">Edit the Featured / Case Studies header. Save writes to <code>data/homepage-ui.json</code> on branch <code>content/drafts</code>. Merge that branch into your Pages branch to go live.</p>' +
      '<div style="display:grid;gap:8px">' +
      '<label>Featured view title <input id="admin-ph-a-featured" type="text" style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid #334155;background:#1e293b;color:#f8fafc" /></label>' +
      '<label>Case studies view title <input id="admin-ph-a-cs" type="text" style="width:100%;padding:6px 8px;border-radius:6px;border:1px solid #334155;background:#1e293b;color:#f8fafc" /></label>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' +
      '<button type="button" id="admin-ph-a-reload" style="padding:8px 12px;border-radius:8px;border:none;background:#475569;color:#fff;cursor:pointer">Reload from API</button>' +
      '<button type="button" id="admin-ph-a-save" style="padding:8px 12px;border-radius:8px;border:none;background:#059669;color:#fff;cursor:pointer;font-weight:600">Save draft</button>' +
      '<a href="' +
      API_BASE +
      '/api/admin/auth/github/start" style="padding:8px 12px;border-radius:8px;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600">Login</a>' +
      "</div>" +
      '<p id="admin-ph-a-msg" style="margin:8px 0 0;font-size:12px;min-height:1.2em"></p>';
    document.body.appendChild(bar);
    return bar;
  }

  async function apiSession() {
    const res = await fetch(API_BASE + "/api/admin/session", {
      credentials: "include"
    });
    return res.json();
  }

  async function apiGetUi() {
    const res = await fetch(API_BASE + "/api/admin/homepage-ui", {
      credentials: "include"
    });
    return res.json();
  }

  async function apiSaveUi(body) {
    const res = await fetch(API_BASE + "/api/admin/homepage-ui", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    return res.json();
  }

  function applyUiToInputs(ui) {
    const f = document.getElementById("admin-ph-a-featured");
    const c = document.getElementById("admin-ph-a-cs");
    if (f) f.value = ui.featuredTitle || "Featured Projects";
    if (c) c.value = ui.caseStudiesTitle || "Case Studies";
    window.__HOMEPAGE_UI__ = ui;
    window.dispatchEvent(new CustomEvent("homepage-ui-updated"));
  }

  async function boot() {
    if (!isEditMode()) return;
    // Full admin UI lives in /admin/ — avoid duplicating the bottom bar inside the preview iframe.
    if (window.self !== window.top) return;
    ensureBar();
    const msg = document.getElementById("admin-ph-a-msg");

    const session = await apiSession();
    if (!session.ok) {
      if (msg) msg.textContent = "Not logged in — use Login, then Reload from API.";
    }

    document.getElementById("admin-ph-a-reload").addEventListener("click", async () => {
      if (msg) msg.textContent = "Loading…";
      const data = await apiGetUi();
      if (!data.ok) {
        if (msg) msg.textContent = data.error || "Failed to load";
        return;
      }
      applyUiToInputs(data.ui || {});
      if (msg) msg.textContent = "Loaded. Edit and Save, or merge drafts for live site.";
    });

    document.getElementById("admin-ph-a-save").addEventListener("click", async () => {
      const featuredTitle = document.getElementById("admin-ph-a-featured").value;
      const caseStudiesTitle = document.getElementById("admin-ph-a-cs").value;
      if (msg) msg.textContent = "Saving…";
      const data = await apiSaveUi({ featuredTitle, caseStudiesTitle });
      if (!data.ok) {
        if (msg) msg.textContent = data.error || "Save failed";
        return;
      }
      applyUiToInputs(data.ui || {});
      if (msg) msg.textContent = "Saved to content/drafts. Reload page to refresh preview.";
    });

    const data = await apiGetUi();
    if (data.ok && data.ui) applyUiToInputs(data.ui);
    else {
      const ui = window.__HOMEPAGE_UI__ || {};
      applyUiToInputs(ui);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
