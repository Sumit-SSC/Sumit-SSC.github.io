/**
 * Full admin workspace: sidebar navigation, live preview iframe, inspector (titles + Editor.js).
 * Config: window.__ADMIN_APP__ { siteOrigin, apiBase, pagesPrefix }
 */
(function () {
  const cfg = window.__ADMIN_APP__ || {};
  const SITE = (cfg.siteOrigin || "https://sumit.indevs.in").replace(/\/$/, "");
  const API = (cfg.apiBase || "https://admin-api.sumit.indevs.in").replace(/\/$/, "");
  const PAGES = cfg.pagesPrefix || "/pages/";

  const THEME_TOKENS = {
    textSize: ["sm", "base", "lg", "xl"],
    textColor: ["default", "muted", "primary", "accent"],
    align: ["left", "center", "right"],
    imagePreset: ["thumbnail", "banner", "hero", "inline"]
  };

  let editorInstance = null;
  let activeEditorHolderId = null;

  const state = {
    kind: "projects-home",
    target: "homepage",
    slug: "",
    homeTab: "titles"
  };

  const el = (id) => document.getElementById(id);

  function setStatus(t) {
    const n = el("rib-status");
    if (n) n.textContent = t || "";
  }

  function previewUrl(pathWithQuery) {
    const u = new URL(pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`, SITE + "/");
    u.searchParams.set("admin_embed", "1");
    return u.toString();
  }

  function getDefaultEditorData() {
    return {
      time: Date.now(),
      blocks: [
        { type: "header", data: { text: "Start editing", level: 2 } },
        { type: "paragraph", data: { text: "Use the ribbon to insert blocks." } }
      ],
      version: "2.30.7"
    };
  }

  function sanitizeEditorPayload(editorData, target) {
    const allowedTypes = new Set(["paragraph", "header", "list", "code", "embed"]);
    const blocks = (editorData.blocks || [])
      .filter((block) => allowedTypes.has(block.type))
      .map((block) => ({ type: block.type, data: block.data || {} }));

    return {
      schemaVersion: 1,
      target,
      content: {
        ...editorData,
        blocks
      },
      themeTokens: THEME_TOKENS
    };
  }

  async function destroyEditor() {
    if (editorInstance && typeof editorInstance.destroy === "function") {
      try {
        await editorInstance.destroy();
      } catch (_) {}
    }
    editorInstance = null;
    activeEditorHolderId = null;
  }

  function getTools() {
    const H = window.Header;
    const L = window.EditorjsList;
    const C = window.CodeTool;
    const E = window.Embed;
    const tools = {};
    if (H) tools.header = H;
    if (L) tools.list = L;
    if (C) tools.code = C;
    if (E) tools.embed = E;
    return tools;
  }

  async function mountEditor(holderId, data) {
    await destroyEditor();
    activeEditorHolderId = holderId;
    const holder = el(holderId);
    if (!holder) return;
    holder.innerHTML = "";
    const Editor = window.EditorJS;
    if (!Editor) {
      holder.textContent = "Editor.js failed to load.";
      return;
    }
    editorInstance = new Editor({
      holder: holderId,
      data: data || getDefaultEditorData(),
      tools: getTools(),
      onChange: () => setStatus("Edited — save when ready.")
    });
  }

  async function apiSession() {
    const res = await fetch(`${API}/api/admin/session`, { credentials: "include" });
    return res.json();
  }

  async function loadContentRead(target, slug) {
    const q = new URLSearchParams({ target });
    if (slug) q.set("slug", slug);
    const res = await fetch(`${API}/api/admin/content/read?${q}`, { credentials: "include" });
    return res.json();
  }

  async function saveContentWrite(target, slug, editorData) {
    const payload = sanitizeEditorPayload(editorData, target);
    payload.slug = slug || "";
    const res = await fetch(`${API}/api/admin/content/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  function setIframe(path) {
    const f = el("admin-preview");
    if (f) f.src = previewUrl(path);
  }

  function showPanels() {
    const tabs = el("inspector-tabs");
    const pUi = el("panel-home-ui");
    const pJson = el("panel-home-json");
    const pEd = el("panel-editor-record");
    const pSt = el("panel-static");
    const ribIns = el("rib-insert-group");

    const isHome = state.kind === "projects-home";
    const isRecord = state.kind === "project" || state.kind === "caseStudy";
    const isStatic = state.kind === "about" || state.kind === "case-archive";

    if (tabs) tabs.classList.toggle("hidden", !isHome);
    if (pUi) pUi.classList.toggle("hidden", !isHome || state.homeTab !== "titles");
    if (pJson) pJson.classList.toggle("hidden", !isHome || state.homeTab !== "json");
    if (pEd) pEd.classList.toggle("hidden", !isRecord);
    if (pSt) pSt.classList.toggle("hidden", !isStatic);
    if (ribIns) ribIns.classList.toggle("hidden", !((isHome && state.homeTab === "json") || isRecord));
  }

  async function applyRoute() {
    showPanels();

    if (state.kind === "projects-home") {
      setIframe(`${PAGES}homepage.html`.replace(/^\//, ""));
      if (state.homeTab === "titles") {
        await loadHomeUiFields();
      } else {
        await loadHomepageJsonEditor();
      }
      return;
    }

    if (state.kind === "project") {
      setIframe(`${PAGES}project.html?id=${encodeURIComponent(state.slug)}`.replace(/^\//, ""));
      await loadRecordEditor(state.target, state.slug);
      return;
    }

    if (state.kind === "caseStudy") {
      setIframe(`${PAGES}case-study.html?id=${encodeURIComponent(state.slug)}`.replace(/^\//, ""));
      await loadRecordEditor(state.target, state.slug);
      return;
    }

    if (state.kind === "case-archive") {
      setIframe(`${PAGES}case-studies-archive.html`.replace(/^\//, ""));
      await destroyEditor();
      return;
    }

    if (state.kind === "about") {
      setIframe(`${PAGES}about.html`.replace(/^\//, ""));
      await destroyEditor();
    }
  }

  async function loadHomeUiFields() {
    await destroyEditor();
    const msg = el("msg-home-ui");
    const res = await fetch(`${API}/api/admin/homepage-ui`, { credentials: "include" });
    const data = await res.json();
    if (!data.ok) {
      if (msg) msg.textContent = data.error || "Unauthorized — use Login.";
      return;
    }
    const ui = data.ui || {};
    const f = el("fld-featured");
    const c = el("fld-cs");
    if (f) f.value = ui.featuredTitle || "Featured Projects";
    if (c) c.value = ui.caseStudiesTitle || "Case Studies";
    if (msg) msg.textContent = "Loaded.";
  }

  async function saveHomeUi() {
    const msg = el("msg-home-ui");
    const featuredTitle = el("fld-featured")?.value || "";
    const caseStudiesTitle = el("fld-cs")?.value || "";
    if (msg) msg.textContent = "Saving…";
    const res = await fetch(`${API}/api/admin/homepage-ui`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ featuredTitle, caseStudiesTitle })
    });
    const data = await res.json();
    if (!data.ok) {
      if (msg) msg.textContent = data.error || "Save failed";
      return;
    }
    if (msg) msg.textContent = "Saved. Refresh preview to see titles.";
    setIframe(`${PAGES}homepage.html`.replace(/^\//, ""));
  }

  async function loadHomepageJsonEditor() {
    setStatus("Loading homepage JSON…");
    const data = await loadContentRead("homepage", "");
    const ed = data.ok ? data.editorData : getDefaultEditorData();
    await mountEditor("admin-editor-holder-home", ed);
    setStatus("Homepage JSON loaded.");
  }

  async function loadRecordEditor(target, slug) {
    const label = el("record-label");
    if (label) label.textContent = `${target === "projects" ? "Project" : "Case study"} · ${slug}`;
    setStatus("Loading record…");
    const data = await loadContentRead(target, slug);
    if (!data.ok) {
      setStatus(data.error || "Load failed");
      await mountEditor("admin-editor-holder", getDefaultEditorData());
      return;
    }
    await mountEditor("admin-editor-holder", data.editorData || getDefaultEditorData());
    setStatus("Loaded. Edit blocks and Save.");
  }

  async function ribSave() {
    const s = await apiSession();
    if (!s.ok) {
      setStatus("Not logged in.");
      return;
    }

    if (state.kind === "projects-home" && state.homeTab === "json") {
      if (!editorInstance) return;
      const d = await editorInstance.save();
      setStatus("Saving…");
      const out = await saveContentWrite("homepage", "", d);
      if (!out.ok) {
        setStatus(out.error || "Save failed");
        return;
      }
      setStatus(`Saved · ${out.branch || "draft"}`);
      return;
    }

    if (state.kind === "project" || state.kind === "caseStudy") {
      if (!editorInstance) return;
      const d = await editorInstance.save();
      setStatus("Saving…");
      const out = await saveContentWrite(state.target, state.slug, d);
      if (!out.ok) {
        setStatus(out.error || "Save failed");
        return;
      }
      setStatus(`Saved · ${out.branch || "draft"}`);
    }
  }

  async function ribLoad() {
    if (state.kind === "projects-home" && state.homeTab === "json") {
      await loadHomepageJsonEditor();
      return;
    }
    if (state.kind === "project" || state.kind === "caseStudy") {
      await loadRecordEditor(state.target, state.slug);
    }
  }

  function ribOpenLive() {
    const f = el("admin-preview");
    if (!f || !f.src) return;
    try {
      const u = new URL(f.src);
      u.searchParams.delete("admin_embed");
      window.open(u.toString(), "_blank", "noopener,noreferrer");
    } catch (_) {}
  }

  function highlightNav() {
    document.querySelectorAll(".nav-item").forEach((b) => {
      const r = b.getAttribute("data-route");
      const on =
        (r === "projects-home" && state.kind === "projects-home") ||
        (r === "case-archive" && state.kind === "case-archive") ||
        (r === "about" && state.kind === "about");
      b.classList.toggle("bg-slate-800", on);
    });
    document.querySelectorAll(".nav-project, .nav-case").forEach((b) => {
      const id = b.getAttribute("data-id");
      const t = b.getAttribute("data-kind");
      const on =
        (t === "project" && state.kind === "project" && state.slug === id) ||
        (t === "case" && state.kind === "caseStudy" && state.slug === id);
      b.classList.toggle("bg-indigo-900/50", on);
      b.classList.toggle("text-indigo-200", on);
    });
  }

  async function fetchJson(path) {
    const url = new URL(path.replace(/^\//, ""), SITE + "/");
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(res.statusText);
    return res.json();
  }

  function buildSidebarLists(projects, cases) {
    const pu = el("admin-sortable-projects");
    const cu = el("admin-sortable-cases");
    if (pu) {
      pu.innerHTML = "";
      (projects || []).forEach((p) => {
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.type = "button";
        b.className =
          "nav-project w-full text-left rounded-lg px-3 py-1.5 hover:bg-slate-800 text-slate-300 text-sm";
        b.setAttribute("data-kind", "project");
        b.setAttribute("data-id", p.id);
        b.textContent = p.title || p.id;
        b.addEventListener("click", () => {
          state.kind = "project";
          state.target = "projects";
          state.slug = p.id;
          highlightNav();
          applyRoute();
        });
        li.appendChild(b);
        pu.appendChild(li);
      });
    }
    if (cu) {
      cu.innerHTML = "";
      (cases || []).forEach((c) => {
        const li = document.createElement("li");
        const b = document.createElement("button");
        b.type = "button";
        b.className =
          "nav-case w-full text-left rounded-lg px-3 py-1.5 hover:bg-slate-800 text-slate-300 text-sm";
        b.setAttribute("data-kind", "case");
        b.setAttribute("data-id", c.id);
        b.textContent = c.title || c.id;
        b.addEventListener("click", () => {
          state.kind = "caseStudy";
          state.target = "caseStudies";
          state.slug = c.id;
          highlightNav();
          applyRoute();
        });
        li.appendChild(b);
        cu.appendChild(li);
      });
    }

    if (window.Sortable && pu) {
      Sortable.create(pu, { animation: 150, ghostClass: "opacity-50" });
    }
    if (window.Sortable && cu) {
      Sortable.create(cu, { animation: 150, ghostClass: "opacity-50" });
    }
  }

  function wireRibbon() {
    el("rib-login")?.addEventListener("click", () => {
      window.location.href = `${API}/api/admin/auth/github/start`;
    });
    el("rib-session")?.addEventListener("click", async () => {
      const d = await apiSession();
      setStatus(d.ok ? `Session: ${d.user?.login || "ok"}` : "No session");
    });
    el("rib-refresh")?.addEventListener("click", () => {
      const f = el("admin-preview");
      if (f && f.src) f.src = f.src;
    });
    el("rib-open-live")?.addEventListener("click", ribOpenLive);
    el("rib-save")?.addEventListener("click", ribSave);
    el("rib-load")?.addEventListener("click", ribLoad);

    document.querySelectorAll(".rib-ins").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!editorInstance || !editorInstance.blocks) return;
        const type = btn.getAttribute("data-insert");
        const map = {
          paragraph: { type: "paragraph", data: { text: "" } },
          header: { type: "header", data: { text: "Heading", level: 2 } },
          list: { type: "list", data: { style: "unordered", items: ["Item"] } },
          code: { type: "code", data: { code: "" } }
        };
        const block = map[type];
        if (!block) return;
        try {
          await editorInstance.blocks.insert(block.type, block.data);
        } catch (e) {
          setStatus("Could not insert block — use + inside the editor.");
          console.warn(e);
        }
      });
    });
  }

  function setHomeTabStyle(which) {
    const a = el("tab-titles");
    const b = el("tab-json");
    if (!a || !b) return;
    const active = "bg-slate-700 text-white";
    const idle = "text-slate-400 hover:bg-slate-800";
    a.className = "inspector-tab px-2 py-1 rounded " + (which === "titles" ? active : idle);
    b.className = "inspector-tab px-2 py-1 rounded " + (which === "json" ? active : idle);
  }

  function wireInspectorTabs() {
    el("tab-titles")?.addEventListener("click", () => {
      state.homeTab = "titles";
      setHomeTabStyle("titles");
      applyRoute();
    });
    el("tab-json")?.addEventListener("click", () => {
      state.homeTab = "json";
      setHomeTabStyle("json");
      applyRoute();
    });
    setHomeTabStyle("titles");
  }

  function wireNav() {
    document.querySelectorAll('.nav-item[data-route="projects-home"]').forEach((b) => {
      b.addEventListener("click", () => {
        state.kind = "projects-home";
        state.slug = "";
        state.homeTab = "titles";
        highlightNav();
        applyRoute();
      });
    });
    document.querySelectorAll('.nav-item[data-route="case-archive"]').forEach((b) => {
      b.addEventListener("click", () => {
        state.kind = "case-archive";
        state.slug = "";
        highlightNav();
        applyRoute();
      });
    });
    document.querySelectorAll('.nav-item[data-route="about"]').forEach((b) => {
      b.addEventListener("click", () => {
        state.kind = "about";
        state.slug = "";
        highlightNav();
        applyRoute();
      });
    });
  }

  el("btn-save-ui")?.addEventListener("click", saveHomeUi);

  async function fileToWebpDataUrl(file, maxWidth = 1920, quality = 0.82) {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, maxWidth / bitmap.width);
    const width = Math.round(bitmap.width * ratio);
    const height = Math.round(bitmap.height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL("image/webp", quality);
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  el("btn-upload")?.addEventListener("click", async () => {
    const slug = slugify(state.slug);
    const preset = el("img-preset")?.value || "inline";
    const file = el("img-file")?.files?.[0];
    if (!slug) {
      setStatus("Select a project or case study first.");
      return;
    }
    if (!file) {
      setStatus("Choose an image file.");
      return;
    }
    setStatus("Uploading…");
    try {
      const webpDataUrl = await fileToWebpDataUrl(file);
      const res = await fetch(`${API}/api/admin/images/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug, preset, dataUrl: webpDataUrl })
      });
      const data = await res.json();
      if (!data.ok) {
        setStatus(data.error || "Upload failed");
        return;
      }
      setStatus(`Saved image: ${data.relativePath || ""}`);
    } catch (e) {
      setStatus(String(e.message || e));
    }
  });

  window.addEventListener("message", (ev) => {
    if (ev.data && ev.data.type === "admin-focus-inspector") {
      el("admin-preview")?.scrollIntoView({ behavior: "smooth" });
    }
  });

  window.addEventListener("DOMContentLoaded", async () => {
    wireRibbon();
    wireInspectorTabs();
    wireNav();
    setStatus("Loading site index…");
    try {
      const projects = await fetchJson("data/projects.json");
      const cases = await fetchJson("data/case_studies.json");
      buildSidebarLists(projects, cases);
    } catch (e) {
      setStatus("Could not load project lists (check siteOrigin).");
      console.error(e);
    }
    highlightNav();
    await applyRoute();
    const sess = await apiSession();
    setStatus(sess.ok ? `Ready · ${sess.user?.login || ""}` : "Login to save changes.");
  });
})();
