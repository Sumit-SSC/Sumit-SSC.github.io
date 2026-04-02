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
  let editorPreviewTimer = null;

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
        { type: "paragraph", data: { text: "Use the ribbon Insert menu, or click + in the editor." } }
      ],
      version: "2.30.7"
    };
  }

  function normalizeEditorData(raw) {
    if (!raw || typeof raw !== "object") return getDefaultEditorData();
    const blocksIn = Array.isArray(raw.blocks) ? raw.blocks : [];
    const blocks = [];
    for (const b of blocksIn) {
      if (!b || !b.type || !b.data) continue;
      if (b.type === "list") {
        const items = b.data.items;
        if (Array.isArray(items)) {
          const fixed = items.map((it) => {
            if (typeof it === "string") return it;
            if (it && typeof it.content === "string") return it.content;
            return String(it || "");
          });
          blocks.push({ type: "list", data: { ...b.data, style: b.data.style || "unordered", items: fixed } });
          continue;
        }
      }
      blocks.push(b);
    }
    if (blocks.length === 0) return getDefaultEditorData();
    return {
      time: raw.time || Date.now(),
      blocks,
      version: raw.version || "2.30.7"
    };
  }

  function recordToEditorData(record) {
    if (!record) return getDefaultEditorData();
    const blocks = [
      { type: "header", data: { text: record.title || record.id || "Untitled", level: 2 } },
      { type: "paragraph", data: { text: record.short_description || "" } }
    ];
    if (record.full_description) {
      blocks.push({ type: "code", data: { code: String(record.full_description) } });
    }
    return { time: Date.now(), blocks, version: "2.30.7" };
  }

  async function loadPublicRecordEditor(target, slug) {
    if (target === "projects") {
      const arr = await fetchJson("data/projects.json");
      const found = Array.isArray(arr) ? arr.find((r) => r.id === slug) : null;
      return found ? recordToEditorData(found) : null;
    }
    if (target === "caseStudies") {
      const arr = await fetchJson("data/case_studies.json");
      const found = Array.isArray(arr) ? arr.find((r) => r.id === slug) : null;
      return found ? recordToEditorData(found) : null;
    }
    return null;
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
    // Editor.js tools are exposed as different globals depending on the CDN bundle.
    // We try multiple known names so the editor actually renders blocks.
    const W = window || {};
    const tools = {};

    const headerTool = W.Header || W.HeaderTool;
    const paragraphTool = W.Paragraph || W.ParagraphTool;
    const listTool = W.List || W.EditorjsList || W.EditorjsListTool || W.ListRenderer;
    const codeTool = W.CodeTool || W.Code || W.CodeToolPlugin;
    const embedTool = W.Embed || W.EmbedTool || W.Embedder;

    if (headerTool) tools.header = headerTool;
    if (paragraphTool) tools.paragraph = paragraphTool;
    if (listTool) tools.list = listTool;
    if (codeTool) tools.code = codeTool;
    if (embedTool) tools.embed = embedTool;

    return tools;
  }

  function previewElForHolder(holderId) {
    if (holderId === "admin-editor-holder-home") return el("json-preview-home");
    if (holderId === "admin-editor-holder") return el("json-preview-record");
    return null;
  }

  async function updateEditorJsonPreviewNow() {
    const previewEl = previewElForHolder(activeEditorHolderId);
    if (!previewEl || !editorInstance) return;
    try {
      const data = await editorInstance.save();
      previewEl.textContent = JSON.stringify(data, null, 2);
    } catch (e) {
      previewEl.textContent = String(e && e.message ? e.message : e);
    }
  }

  function scheduleEditorJsonPreview() {
    if (editorPreviewTimer) clearTimeout(editorPreviewTimer);
    editorPreviewTimer = setTimeout(() => updateEditorJsonPreviewNow(), 500);
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
    const normalized = normalizeEditorData(data);
    const tools = getTools();
    if (!tools || Object.keys(tools).length === 0) {
      setStatus("Editor.js tools not loaded (check CDN). Hard refresh and retry.");
    }
    editorInstance = new Editor({
      holder: holderId,
      data: normalized,
      tools,
      onChange: () => {
        setStatus("Edited — save draft when ready.");
        scheduleEditorJsonPreview();
      }
    });
    if (editorInstance.isReady && typeof editorInstance.isReady.then === "function") {
      await editorInstance.isReady;
    }
    // Initial preview after tools and data are ready.
    await updateEditorJsonPreviewNow();
  }

  async function apiSession() {
    const res = await fetch(`${API}/api/admin/session`, { credentials: "include" });
    return res.json();
  }

  async function loadContentRead(target, slug) {
    const q = new URLSearchParams({ target });
    if (slug) q.set("slug", slug);
    const res = await fetch(`${API}/api/admin/content/read?${q}`, { credentials: "include" });
    const data = await res.json();
    data._httpStatus = res.status;
    return data;
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
    const pSettings = el("panel-settings");
    const ribIns = el("rib-insert-group");

    const isHome = state.kind === "projects-home";
    const isRecord = state.kind === "project" || state.kind === "caseStudy";
    const isStatic = state.kind === "about" || state.kind === "case-archive";
    const isSettings = state.kind === "settings";

    if (tabs) tabs.classList.toggle("hidden", !isHome);
    if (pUi) pUi.classList.toggle("hidden", !isHome || state.homeTab !== "titles");
    if (pJson) pJson.classList.toggle("hidden", !isHome || state.homeTab !== "json");
    if (pEd) pEd.classList.toggle("hidden", !isRecord);
    if (pSt) pSt.classList.toggle("hidden", !isStatic);
    if (pSettings) pSettings.classList.toggle("hidden", !isSettings);
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

    if (state.kind === "settings") {
      setIframe(`${PAGES}homepage.html`.replace(/^\//, ""));
      await destroyEditor();
      await loadThemeSettings();
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
    const hint = el("home-auth-hint");
    const res = await fetch(`${API}/api/admin/homepage-ui`, { credentials: "include" });
    const data = await res.json();
    if (hint) hint.classList.toggle("hidden", data.ok);
    if (!data.ok) {
      if (msg) msg.textContent = data.error || "Sign in with Login to load/save.";
      return;
    }
    const ui = data.ui || {};
    const f = el("fld-featured");
    const c = el("fld-cs");
    if (f) f.value = ui.featuredTitle || "Featured Projects";
    if (c) c.value = ui.caseStudiesTitle || "Case Studies";
    if (msg) msg.textContent = "Loaded from API.";
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
    const hint = el("home-auth-hint");
    const data = await loadContentRead("homepage", "");
    if (hint) hint.classList.toggle("hidden", data.ok);
    if (!data.ok) {
      setStatus(data.error === "Unauthorized" ? "Sign in — then Reload." : data.error || "Load failed");
      await mountEditor("admin-editor-holder-home", getDefaultEditorData());
      return;
    }
    await mountEditor("admin-editor-holder-home", data.editorData || getDefaultEditorData());
    setStatus("Homepage JSON loaded — edit and Save draft, then Publish to live when ready.");
  }

  function setRecordAuthBanner(show, message) {
    const b = el("record-auth-banner");
    if (!b) return;
    b.classList.toggle("hidden", !show);
    if (show && message) b.textContent = message;
  }

  async function loadRecordEditor(target, slug) {
    const label = el("record-label");
    if (label) label.textContent = `${target === "projects" ? "Project" : "Case study"} · ${slug}`;
    setRecordAuthBanner(false, "");
    setStatus("Loading record…");
    const data = await loadContentRead(target, slug);
    if (!data.ok) {
      const unauthorized = data.error === "Unauthorized" || data._httpStatus === 401;
      if (unauthorized) {
        setRecordAuthBanner(
          true,
          "Not signed in — click Login in the ribbon, then Reload. Showing a read-only copy from the public site."
        );
        setStatus("Read-only preview — Login to load draft and save.");
        try {
          const pub = await loadPublicRecordEditor(target, slug);
          if (pub) {
            await mountEditor("admin-editor-holder", pub);
            return;
          }
        } catch (e) {
          console.warn(e);
        }
        await mountEditor("admin-editor-holder", getDefaultEditorData());
        return;
      }
      setStatus(data.error || "Load failed");
      await mountEditor("admin-editor-holder", getDefaultEditorData());
      return;
    }
    setRecordAuthBanner(false, "");
    await mountEditor("admin-editor-holder", data.editorData || getDefaultEditorData());
    setStatus("Loaded — Save draft, then Publish to live to update the public site.");
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
    document.querySelectorAll('.nav-item[data-route="settings"]').forEach((b) => {
      b.addEventListener("click", () => {
        state.kind = "settings";
        state.slug = "";
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

  async function apiPublish(target) {
    const res = await fetch(`${API}/api/admin/content/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ target })
    });
    return res.json();
  }

  async function loadThemeSettings() {
    const msg = el("msg-theme");
    if (msg) msg.textContent = "Loading…";
    const data = await loadContentRead("siteTheme", "");
    if (!data.ok) {
      if (msg) msg.textContent = data.error || "Failed to load theme";
      return;
    }
    // Worker returns Editor.js blocks; pull JSON from the code block.
    const blocks = data.editorData?.blocks || [];
    const code = blocks.find((b) => b.type === "code")?.data?.code || "";
    let parsed;
    try {
      parsed = JSON.parse(code || "{}");
    } catch {
      parsed = {};
    }
    const theme = parsed.theme || {};
    const pri = el("theme-primary");
    const acc = el("theme-accent");
    const fs = el("theme-font-size");
    const ff = el("theme-font-family");
    if (pri) pri.value = theme.primary || "#3B4CCA";
    if (acc) acc.value = theme.accent || "#2CB1A6";
    if (fs) fs.value = theme.baseFontSizePx || 16;
    if (ff) ff.value = theme.fontFamily || "Inter, system-ui, sans-serif";
    if (msg) msg.textContent = "Loaded.";
  }

  async function saveThemeDraft() {
    const msg = el("msg-theme");
    const pri = el("theme-primary")?.value || "#3B4CCA";
    const acc = el("theme-accent")?.value || "#2CB1A6";
    const fs = Number(el("theme-font-size")?.value || 16);
    const ff = el("theme-font-family")?.value || "Inter, system-ui, sans-serif";
    if (msg) msg.textContent = "Saving…";
    const res = await fetch(`${API}/api/admin/content/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        target: "siteTheme",
        slug: "",
        content: {
          time: Date.now(),
          version: "2.30.7",
          blocks: [
            { type: "header", data: { text: "Site Theme", level: 2 } },
            { type: "paragraph", data: { text: "Edit settings via the form, Save draft, then Publish to live." } },
            { type: "code", data: { code: JSON.stringify({ schemaVersion: 1, theme: { primary: pri, accent: acc, baseFontSizePx: fs, fontFamily: ff } }, null, 2) } }
          ]
        }
      })
    });
    const data = await res.json();
    if (!data.ok) {
      if (msg) msg.textContent = data.error || "Save failed";
      return;
    }
    if (msg) msg.textContent = `Saved draft (${data.branch || "draft"}).`;
  }

  el("btn-theme-load")?.addEventListener("click", () => loadThemeSettings());
  el("btn-theme-save")?.addEventListener("click", () => saveThemeDraft());
  el("btn-theme-publish")?.addEventListener("click", async () => {
    const s = await apiSession();
    if (!s.ok) {
      setStatus("Login first.");
      return;
    }
    if (!window.confirm("Publish site-theme.json draft to live?")) return;
    setStatus("Publishing…");
    const out = await apiPublish("siteTheme");
    setStatus(out.ok ? "Published theme to live." : out.error || "Publish failed");
    const iframe = el("admin-preview");
    if (iframe && iframe.src) iframe.src = iframe.src;
  });

  async function apiListBackups() {
    const res = await fetch(`${API}/api/admin/content/backups`, { credentials: "include" });
    return res.json();
  }

  async function apiRestore(backupPath) {
    const res = await fetch(`${API}/api/admin/content/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ backupPath })
    });
    return res.json();
  }

  async function refreshBackupSelect() {
    const sel = el("sel-restore-backup");
    if (!sel) return;
    sel.innerHTML = '<option value="">Loading…</option>';
    const data = await apiListBackups();
    sel.innerHTML = '<option value="">Select backup…</option>';
    if (!data.ok || !Array.isArray(data.backups)) {
      sel.innerHTML = '<option value="">No backups or unauthorized</option>';
      return;
    }
    data.backups.forEach((b) => {
      const opt = document.createElement("option");
      opt.value = b.path;
      opt.textContent = b.name;
      sel.appendChild(opt);
    });
  }

  el("rib-publish")?.addEventListener("click", async () => {
    const s = await apiSession();
    if (!s.ok) {
      setStatus("Login first, then Publish.");
      return;
    }
    let target = null;
    if (state.kind === "project") target = "projects";
    else if (state.kind === "caseStudy") target = "caseStudies";
    else if (state.kind === "projects-home") {
      target = state.homeTab === "json" ? "homepage" : "homepageUi";
    }
    if (!target) {
      setStatus("Choose Projects (home) or a project/case study first.");
      return;
    }
    if (!window.confirm(`Publish draft file for ${target} to your live GitHub Pages branch? A backup of the current live file is saved first if it exists.`)) {
      return;
    }
    setStatus("Publishing…");
    const out = await apiPublish(target);
    if (!out.ok) {
      setStatus(out.error || "Publish failed");
      return;
    }
    setStatus(`Published to ${out.baseBranch || "live"}. ${out.backupPath ? "Backup: " + out.backupPath : ""}`);
    const iframe = el("admin-preview");
    if (iframe && iframe.src) iframe.src = iframe.src;
  });

  el("btn-publish-home-ui")?.addEventListener("click", async () => {
    const s = await apiSession();
    if (!s.ok) {
      setStatus("Login first.");
      return;
    }
    if (!window.confirm("Publish homepage-ui.json draft to the live branch?")) return;
    setStatus("Publishing…");
    const out = await apiPublish("homepageUi");
    setStatus(out.ok ? `Published. ${out.backupPath || ""}` : out.error || "Failed");
    if (out.ok) {
      const iframe = el("admin-preview");
      if (iframe && iframe.src) iframe.src = iframe.src;
    }
  });

  el("btn-publish-home-json")?.addEventListener("click", async () => {
    const s = await apiSession();
    if (!s.ok) {
      setStatus("Login first.");
      return;
    }
    if (!window.confirm("Publish homepage-content.json draft to the live branch?")) return;
    setStatus("Publishing…");
    const out = await apiPublish("homepage");
    setStatus(out.ok ? `Published. ${out.backupPath || ""}` : out.error || "Failed");
    if (out.ok) {
      const iframe = el("admin-preview");
      if (iframe && iframe.src) iframe.src = iframe.src;
    }
  });

  el("btn-refresh-backups")?.addEventListener("click", () => refreshBackupSelect());
  el("btn-restore-backup")?.addEventListener("click", async () => {
    const s = await apiSession();
    if (!s.ok) {
      setStatus("Login first.");
      return;
    }
    const path = el("sel-restore-backup")?.value;
    if (!path) {
      setStatus("Select a backup.");
      return;
    }
    if (!window.confirm("Overwrite the LIVE file on your Pages branch with this backup?")) return;
    setStatus("Restoring…");
    const out = await apiRestore(path);
    setStatus(out.ok ? `Restored ${out.path}` : out.error || "Restore failed");
    if (out.ok) {
      const iframe = el("admin-preview");
      if (iframe && iframe.src) iframe.src = iframe.src;
      await ribLoad();
    }
  });

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

  async function refreshSessionLabel() {
    const sess = await apiSession();
    setStatus(sess.ok ? `Signed in · ${sess.user?.login || ""}` : "Not signed in — use Login to load drafts & save.");
    const hint = el("home-auth-hint");
    if (hint && state.kind === "projects-home") {
      hint.classList.toggle("hidden", sess.ok);
    }
  }

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
      setStatus("Could not load project lists (check siteOrigin in admin/index.html).");
      console.error(e);
    }
    highlightNav();
    await applyRoute();
    await refreshSessionLabel();
    await refreshBackupSelect();
  });
})();
