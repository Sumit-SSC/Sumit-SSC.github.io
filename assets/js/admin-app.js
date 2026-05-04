/**
 * Full admin workspace: sidebar navigation, live preview iframe, inspector (titles + Editor.js).
 * Config: window.__ADMIN_APP__ { siteOrigin, apiBase, pagesPrefix }
 */
(function () {
  const cfg = window.__ADMIN_APP__ || {};
  const SITE = (cfg.siteOrigin || window.location.origin || "https://sumit.indevs.in").replace(/\/$/, "");
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
  let autoSaveTimer = null;
  let autoSaveInFlight = false;
  let lastSessionData = null;
  let toastTimer = null;
  let blockNavSortable = null;

  const state = {
    kind: "dashboard",
    target: "homepage",
    slug: "",
    homeTab: "json",
    editWorkspace: false,
    compactListsOnSelect: true,
    centerPreviewMode: "live",
    sourceMode: true,
    draftDirty: false
  };
  let monacoEditor = null;
  let monacoReady = null;
  let sourceDoc = { target: "", slug: "", mode: "file", language: "json" };
  const LS_SOURCE_PREFS = "admin_source_prefs_v1";
  const localDraftRecords = {
    projects: [],
    caseStudies: []
  };
  let cachedSiteProjects = [];
  let cachedSiteCases = [];

  const el = (id) => document.getElementById(id);

  function getSourcePrefs() {
    try {
      const raw = localStorage.getItem(LS_SOURCE_PREFS);
      const parsed = raw ? JSON.parse(raw) : {};
      return {
        theme: parsed.theme === "vs" ? "vs" : "vs-dark",
        wordWrap: parsed.wordWrap === "off" ? "off" : "on",
        fontSize: [12, 13, 14, 15, 16].includes(Number(parsed.fontSize)) ? Number(parsed.fontSize) : 13
      };
    } catch (_) {
      return { theme: "vs-dark", wordWrap: "on", fontSize: 13 };
    }
  }

  function saveSourcePrefs(next) {
    try {
      localStorage.setItem(LS_SOURCE_PREFS, JSON.stringify(next));
    } catch (_) {}
  }

  function syncSourcePrefsUi() {
    const prefs = getSourcePrefs();
    const themeSel = el("source-theme");
    const wrapSel = el("source-wrap");
    const sizeSel = el("source-font-size");
    if (themeSel) themeSel.value = prefs.theme;
    if (wrapSel) wrapSel.value = prefs.wordWrap;
    if (sizeSel) sizeSel.value = String(prefs.fontSize);
  }

  /** Last branch label from save/publish (draft branch name when known). */
  let lastBranchHint = "";

  function setStatus(t, opts = {}) {
    const text = t || "";
    const n = el("rib-status");
    if (n) {
      n.textContent = text;
      n.title = opts.title || text;
    }
    const d = el("dash-last-status");
    if (d) d.textContent = text;
  }

  function toast(message, tone = "info") {
    const n = el("ui-toast");
    if (!n) return;
    n.textContent = message || "";
    n.classList.remove("hidden", "border-emerald-700", "border-rose-700", "border-slate-700");
    if (tone === "success") n.classList.add("border-emerald-700");
    else if (tone === "error") n.classList.add("border-rose-700");
    else n.classList.add("border-slate-700");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => n.classList.add("hidden"), 2400);
  }

  function setAutosaveStateLabel(text, tone = "ok") {
    const n = el("rib-autosave-state");
    if (!n) return;
    n.textContent = text;
    n.classList.remove("text-emerald-400/90", "text-amber-300", "text-slate-400");
    if (tone === "warn") n.classList.add("text-amber-300");
    else if (tone === "idle") n.classList.add("text-slate-400");
    else n.classList.add("text-emerald-400/90");
  }

  function setBranchHint(branch) {
    lastBranchHint = branch && String(branch).trim() ? String(branch).trim() : "";
    const hintEl = el("rib-branch-hint");
    if (hintEl) {
      hintEl.textContent = lastBranchHint ? `Draft: ${lastBranchHint}` : "";
      hintEl.classList.toggle("hidden", !lastBranchHint);
      hintEl.title = lastBranchHint ? `Last saved draft branch: ${lastBranchHint}` : "";
    }
  }

  const LS_PUBLISH_KEY = "admin_last_publish_v1";
  const LS_PUBLISH_HISTORY_KEY = "admin_publish_history_v1";

  function recordPublishSuccess(target) {
    try {
      const raw = localStorage.getItem(LS_PUBLISH_KEY);
      const o = raw ? JSON.parse(raw) : {};
      o[target] = new Date().toISOString();
      localStorage.setItem(LS_PUBLISH_KEY, JSON.stringify(o));
    } catch (_) {}
    try {
      const rawHistory = localStorage.getItem(LS_PUBLISH_HISTORY_KEY);
      const parsed = rawHistory ? JSON.parse(rawHistory) : null;
      const history = Array.isArray(parsed) ? parsed : [];
      history.unshift({
        target,
        at: new Date().toISOString()
      });
      localStorage.setItem(LS_PUBLISH_HISTORY_KEY, JSON.stringify(history.slice(0, 25)));
    } catch (_) {}
  }

  function renderDashboardPublishHistory() {
    const list = el("dash-publish-history");
    if (!list) return;
    let history = [];
    try {
      const raw = localStorage.getItem(LS_PUBLISH_HISTORY_KEY);
      history = Array.isArray(raw ? JSON.parse(raw) : null) ? JSON.parse(raw) : [];
    } catch (_) {
      history = [];
    }
    if (!history.length) {
      list.innerHTML = '<li class="text-slate-500">No publish history yet.</li>';
      return;
    }
    list.innerHTML = "";
    history.slice(0, 8).forEach((item) => {
      const when = item?.at ? new Date(item.at).toLocaleString() : "-";
      const li = document.createElement("li");
      li.className = "rounded border border-slate-800 bg-slate-900/40 px-2 py-1";
      li.textContent = `${labelForPublishTarget(item?.target || "content")} · ${when}`;
      list.appendChild(li);
    });
  }

  function labelForPublishTarget(key) {
    const m = {
      homepage: "Homepage content",
      homepageUi: "Section titles",
      projects: "Projects",
      caseStudies: "Case studies",
      siteTheme: "Site theme"
    };
    return m[key] || key;
  }

  function getActivePublishTarget() {
    if (state.kind === "project") return "projects";
    if (state.kind === "caseStudy") return "caseStudies";
    if (state.kind === "projects-home") return state.homeTab === "json" ? "homepage" : "homepageUi";
    if (state.kind === "settings" || state.kind === "dashboard") return "siteTheme";
    return null;
  }

  function updateLastPublishedLabel() {
    const span = el("rib-last-published");
    if (!span) return;
    const key = getActivePublishTarget();
    if (!key) {
      span.textContent = "";
      span.classList.add("hidden");
      return;
    }
    let ts = null;
    try {
      const raw = localStorage.getItem(LS_PUBLISH_KEY);
      const o = raw ? JSON.parse(raw) : {};
      ts = o[key] || null;
    } catch (_) {
      ts = null;
    }
    if (!ts) {
      span.textContent = "";
      span.classList.add("hidden");
      return;
    }
    const d = new Date(ts);
    const short = Number.isNaN(d.getTime())
      ? String(ts)
      : d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
    span.textContent = `Last published (${labelForPublishTarget(key)}): ${short}`;
    span.title = `Last successful publish for this content type`;
    span.classList.remove("hidden");
  }

  function setRibbonAuthState(sess) {
    const ok = !!(sess && sess.ok);
    const saveBtn = el("rib-save");
    const pubBtn = el("rib-publish");
    if (saveBtn) {
      saveBtn.disabled = !ok;
      saveBtn.title = ok ? "Save draft to your GitHub branch" : "Log in under Account to save drafts";
    }
    if (pubBtn) {
      pubBtn.disabled = !ok;
      pubBtn.title = ok ? "Publish draft to the live site" : "Log in under Account to publish";
    }
  }

  function updateAuthBanner(sess) {
    const b = el("rib-auth-banner");
    if (!b) return;
    b.classList.toggle("hidden", !!(sess && sess.ok));
  }

  async function applyRibbonChromeOnly() {
    const sess = await apiSession();
    lastSessionData = sess;
    updateSessionUi(sess);
    setRibbonAuthState(sess);
    updateAuthBanner(sess);
    setAutosaveStateLabel(
      sess && sess.ok ? (state.draftDirty ? "Auto-save: pending…" : "Auto-save: on") : "Auto-save: login required",
      sess && sess.ok ? "ok" : "warn"
    );
    updateLastPublishedLabel();
    return sess;
  }

  function pickToolConstructor(...names) {
    const W = window || {};
    for (const n of names) {
      const c = W[n];
      if (typeof c === "function") return c;
    }
    return null;
  }

  function isEditingRoute() {
    return state.kind === "project" || state.kind === "caseStudy" || (state.kind === "projects-home" && state.homeTab === "json");
  }

  function updateSessionUi(sess) {
    const login = getSessionLogin(sess);
    const role = sess && sess.role ? String(sess.role) : "admin";
    const top = el("rib-session-info");
    const dash = el("dash-session-detail");
    if (top) top.textContent = sess && sess.ok ? `Signed in: ${login || "unknown"} · role: ${role}` : "Not signed in";
    if (dash) dash.textContent = sess && sess.ok ? `GitHub: ${login || "unknown"} | role: ${role}` : "Not signed in. Click Login.";
  }

  function getSessionLogin(sessionData) {
    const u = sessionData && sessionData.user;
    if (!u) return "";
    if (typeof u === "string") return u;
    if (u && typeof u.login === "string") return u.login;
    return "";
  }

  function setCenterView(mode) {
    const dash = el("admin-dashboard-view");
    const frame = el("admin-preview");
    const draft = el("center-draft-preview");
    const hdr = el("center-preview-header");
    if (dash) dash.classList.toggle("hidden", mode !== "dashboard");
    if (frame) frame.classList.toggle("hidden", mode === "dashboard");
    if (draft) draft.classList.toggle("hidden", mode !== "preview" || state.centerPreviewMode !== "draft");
    if (frame) frame.classList.toggle("hidden", mode !== "preview" || state.centerPreviewMode !== "live");
    if (hdr) hdr.classList.toggle("hidden", mode !== "preview" || !isEditingRoute());
    applyWorkspaceLayout();
  }

  function setCenterPreviewMode(next) {
    state.centerPreviewMode = next === "draft" ? "draft" : "live";
    const lbl = el("center-preview-label");
    const bd = el("btn-center-draft");
    const bl = el("btn-center-live");
    if (lbl) lbl.textContent = state.centerPreviewMode === "draft" ? "Live editing preview (auto updates)" : "Published live page preview";
    if (bd) bd.classList.toggle("bg-indigo-700", state.centerPreviewMode === "draft");
    if (bl) bl.classList.toggle("bg-indigo-700", state.centerPreviewMode === "live");
    setCenterView(state.kind === "dashboard" ? "dashboard" : "preview");
  }

  function syncWriteCodeSegment() {
    const v = el("btn-mode-visual");
    const s = el("btn-mode-source");
    if (!v || !s) return;
    const code = state.sourceMode;
    const active = "px-3 py-1 rounded-md text-xs font-medium transition-colors bg-indigo-600 text-white shadow-sm";
    const idle = "px-3 py-1 rounded-md text-xs font-medium transition-colors text-slate-400 hover:text-slate-200";
    v.className = code ? idle : active;
    s.className = code ? active : idle;
  }

  function applyWorkspaceLayout() {
    const previewPane = el("workspace-preview-pane");
    const inspector = el("workspace-inspector");
    const toggleBtn = el("rib-edit-workspace");
    const sidebar = document.querySelector("#workspace-main > aside");
    const active = state.editWorkspace && isEditingRoute();

    if (previewPane) previewPane.classList.toggle("hidden", active);
    if (inspector) inspector.classList.toggle("w-[min(100%,420px)]", !active);
    if (inspector) inspector.classList.toggle("w-full", active);
    if (toggleBtn) {
      toggleBtn.classList.toggle("hidden", !isEditingRoute());
      toggleBtn.textContent = active ? "Split" : "Focus";
      toggleBtn.classList.toggle("bg-slate-700", active);
      toggleBtn.classList.toggle("text-white", active);
    }
    if (sidebar) sidebar.classList.toggle("hidden", state.kind === "dashboard");
  }

  function previewUrl(pathWithQuery, bustCache = false) {
    const u = new URL(pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`, SITE + "/");
    u.searchParams.set("admin_embed", "1");
    if (bustCache) u.searchParams.set("_admin_cb", String(Date.now()));
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
      if (b.type === "image") {
        const url = b.data.url || b.data.file?.url || "";
        blocks.push({
          type: "image",
          data: {
            ...b.data,
            url: String(url || ""),
            caption: b.data.caption != null ? String(b.data.caption) : ""
          }
        });
        continue;
      }
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

  function stripHtml(s) {
    return String(s || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function looksLikeHtml(s) {
    return /<\/?[a-z][\s\S]*>/i.test(String(s || "").trim());
  }

  function recordToEditorData(record) {
    if (!record) return getDefaultEditorData();
    const blocks = [
      { type: "header", data: { text: record.title || record.id || "Untitled", level: 2 } },
      { type: "paragraph", data: { text: record.short_description || "" } }
    ];
    if (record.full_description) {
      const raw = String(record.full_description);
      if (looksLikeHtml(raw)) {
        const plain = stripHtml(raw).slice(0, 2000);
        blocks.push({
          type: "paragraph",
          data: {
            text: plain || "(HTML body — open Source → Record HTML to edit the full page HTML.)"
          }
        });
        blocks.push({
          type: "code",
          data: {
            code: `<!-- Original HTML stored in content file. Edit in Source mode → Record HTML for full control. -->\n${raw.slice(0, 8000)}${raw.length > 8000 ? "\n… (truncated in preview)" : ""}`
          }
        });
      } else {
        blocks.push({ type: "code", data: { code: raw } });
      }
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

  function sanitizeEditorPayload(editorData, target, options = {}) {
    const allowedTypes = new Set(["paragraph", "header", "list", "image", "code", "embed"]);
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
      themeTokens: THEME_TOKENS,
      meta: options.meta && typeof options.meta === "object" ? options.meta : undefined
    };
  }

  function validateEditorIntegrity(editorData) {
    const blocks = Array.isArray(editorData?.blocks) ? editorData.blocks : [];
    if (!blocks.length) {
      return { ok: false, error: "Add at least one content block before saving." };
    }
    const hasReadableContent = blocks.some((block) => {
      if (!block || typeof block !== "object") return false;
      const data = block.data || {};
      const text = `${data.text || ""} ${data.code || ""} ${data.url || ""}`.trim();
      const listItems = Array.isArray(data.items) ? data.items.join(" ").trim() : "";
      return text.length > 0 || listItems.length > 0;
    });
    if (!hasReadableContent) {
      return { ok: false, error: "Content is empty. Please type something first." };
    }
    return { ok: true };
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
    const tools = {};

    const headerTool = pickToolConstructor("Header", "HeaderTool");
    const paragraphTool = pickToolConstructor(
      "Paragraph",
      "ParagraphTool",
      "ParagraphBlock",
      "paragraph",
      "EditorjsParagraph"
    );
    const listTool = pickToolConstructor(
      "List",
      "EditorjsList",
      "EditorjsListTool",
      "ListRenderer",
      "NestedList",
      "EditorjsNestedList"
    );
    const codeTool = pickToolConstructor("CodeTool", "Code", "CodeToolPlugin", "EditorjsCode");
    const imageTool = pickToolConstructor("SimpleImage", "ImageTool", "Image", "EditorjsSimpleImage");
    const embedTool = pickToolConstructor("Embed", "EmbedTool", "Embedder", "EditorjsEmbed");

    if (headerTool) tools.header = headerTool;
    if (paragraphTool) tools.paragraph = paragraphTool;
    if (listTool) tools.list = listTool;
    if (imageTool) tools.image = imageTool;
    if (codeTool) tools.code = codeTool;
    if (embedTool) tools.embed = embedTool;

    if (!tools.paragraph || !tools.header) {
      const keys = Object.keys(window || {}).filter((k) => /header|paragraph|editor|list|code|embed/i.test(k));
      console.warn("[admin-app] Editor.js tool globals partial match:", keys.slice(0, 40));
    }
    if (!tools.image) {
      console.warn("[admin-app] SimpleImage tool not found — image blocks disabled until CDN loads.");
    }

    return tools;
  }

  function previewElForHolder(holderId) {
    if (holderId === "admin-editor-holder-home") return el("json-preview-home");
    if (holderId === "admin-editor-holder") return el("json-preview-record");
    return null;
  }

  function draftPreviewElForHolder(holderId) {
    if (holderId === "admin-editor-holder-home") return el("draft-preview-home");
    if (holderId === "admin-editor-holder") return el("draft-preview-record");
    return null;
  }

  function escHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function editorBlocksToHtml(data) {
    const blocks = Array.isArray(data?.blocks) ? data.blocks : [];
    if (!blocks.length) return '<p class="text-gray-500 italic">No blocks yet — use the editor or Insert in the toolbar.</p>';
    const out = [];
    for (let i = 0; i < blocks.length; i += 1) {
      const b = blocks[i];
      const d = b?.data || {};
      if (b?.type === "header") {
        const lvl = Math.min(4, Math.max(2, Number(d.level || 2)));
        const t = escHtml(d.text || "");
        out.push(
          `<div data-block-index="${i}" data-block-type="header" data-preview-editable="1" class="preview-block mb-6 cursor-pointer rounded-md px-1 -mx-1 hover:bg-black/5 transition-colors"><h${lvl} class="font-serif font-bold text-gray-900 leading-tight">${t}</h${lvl}></div>`
        );
      } else if (b?.type === "paragraph") {
        const raw = String(d.text || "");
        out.push(
          `<div data-block-index="${i}" data-block-type="paragraph" data-preview-editable="1" class="preview-block mb-5 cursor-pointer rounded-md px-1 -mx-1 hover:bg-black/5 transition-colors"><div class="font-serif text-lg leading-8 text-gray-800 prose prose-slate max-w-none">${raw.replace(/\n/g, "<br/>")}</div></div>`
        );
      } else if (b?.type === "list") {
        const items = Array.isArray(d.items) ? d.items : [];
        const tag = d.style === "ordered" ? "ol" : "ul";
        const cls = tag === "ol" ? "list-decimal" : "list-disc";
        out.push(
          `<div data-block-index="${i}" data-block-type="list" class="preview-block mb-5 cursor-pointer font-serif text-gray-800 pl-4"><${tag} class="${cls} space-y-2">${items
            .map((it) => `<li>${escHtml(typeof it === "string" ? it : String(it || ""))}</li>`)
            .join("")}</${tag}></div>`
        );
      } else if (b?.type === "image") {
        const raw = String(d.url || d.file?.url || "").trim();
        let src = "";
        if (raw.startsWith("data:image/")) {
          src = raw;
        } else if (raw) {
          try {
            const u = new URL(raw, SITE + "/");
            if (u.protocol === "http:" || u.protocol === "https:") src = u.href;
          } catch (_) {}
        }
        if (!src) {
          out.push(
            `<div data-block-index="${i}" data-block-type="image" class="preview-block mb-6 rounded-md border border-dashed border-amber-300/80 bg-amber-50/90 p-3 text-sm text-amber-900">Add a valid image URL (or paste an image into the block).</div>`
          );
        } else {
          const cap = String(d.caption || "");
          out.push(
            `<div data-block-index="${i}" data-block-type="image" class="preview-block mb-6 cursor-pointer"><figure><img src="${escHtml(src)}" alt="" class="w-full rounded-lg border border-slate-200"/><figcaption class="text-sm text-slate-600 mt-2">${cap}</figcaption></figure></div>`
          );
        }
      } else if (b?.type === "code") {
        const safe = escHtml(String(d.code || ""));
        out.push(
          `<div data-block-index="${i}" data-block-type="code" class="preview-block mb-5 cursor-pointer rounded-lg bg-slate-100 p-4 text-sm overflow-x-auto"><pre><code class="font-mono text-slate-800">${safe}</code></pre></div>`
        );
      } else if (b?.type === "embed") {
        const rawU = String(d.source || d.embed || "").trim();
        let href = "#";
        try {
          const u = new URL(rawU);
          if (u.protocol === "http:" || u.protocol === "https:") href = u.href;
        } catch (_) {
          href = "#";
        }
        out.push(
          `<div data-block-index="${i}" data-block-type="embed" class="preview-block mb-5 cursor-pointer border border-gray-200 rounded-lg p-4"><a class="text-indigo-600 underline" href="${escHtml(href)}" target="_blank" rel="noopener noreferrer">Embed → open link</a></div>`
        );
      }
    }
    return `<div class="medium-draft-inner">${out.join("\n")}</div>`;
  }

  function bindPreviewBlockInteractions(container) {
    if (!container) return;
    container.onclick = (ev) => {
      if (ev.detail !== 1) return;
      const node = ev.target.closest("[data-block-index]");
      if (!node) return;
      const idx = Number(node.getAttribute("data-block-index"));
      if (!Number.isFinite(idx)) return;
      const holder = el(activeEditorHolderId);
      const editNode = holder?.querySelectorAll(".ce-block")[idx];
      editNode?.scrollIntoView({ behavior: "smooth", block: "center" });
      editNode?.classList.add("ring-2", "ring-indigo-500");
      setTimeout(() => editNode?.classList.remove("ring-2", "ring-indigo-500"), 900);
    };
    container.addEventListener(
      "dblclick",
      async (ev) => {
        const node = ev.target.closest("[data-preview-editable]");
        if (!node || !editorInstance?.blocks) return;
        const idx = Number(node.getAttribute("data-block-index"));
        const btype = node.getAttribute("data-block-type");
        if (!Number.isFinite(idx) || (btype !== "paragraph" && btype !== "header")) return;
        ev.preventDefault();
        let blockEl = btype === "header" ? node.querySelector("h2, h3, h4") : node.querySelector("p");
        if (!blockEl) return;
        const snap = await editorInstance.save();
        const block = snap.blocks[idx];
        if (!block || (block.type !== "paragraph" && block.type !== "header")) return;
        let api;
        try {
          api = editorInstance.blocks.getBlockByIndex(idx);
          if (api && typeof api.then === "function") api = await api;
        } catch (_) {
          return;
        }
        const id = api?.id;
        if (!id) return;
        blockEl.contentEditable = "true";
        blockEl.classList.add("outline", "outline-2", "outline-indigo-400", "rounded-sm");
        blockEl.focus();
        const cleanup = async () => {
          blockEl.contentEditable = "false";
          blockEl.classList.remove("outline", "outline-2", "outline-indigo-400", "rounded-sm");
          const next = (blockEl.innerText || "").trim();
          try {
            if (block.type === "header") {
              await editorInstance.blocks.update(id, {
                data: { ...(block.data || {}), text: next, level: block.data?.level || 2 }
              });
            } else {
              await editorInstance.blocks.update(id, { data: { text: next } });
            }
            await updateEditorJsonPreviewNow();
            setStatus("Preview edit synced — save draft when ready.");
          } catch (err) {
            setStatus(String(err?.message || err) || "Could not sync preview edit.");
          }
        };
        blockEl.addEventListener("blur", () => cleanup(), { once: true });
      },
      true
    );
  }

  async function updateEditorJsonPreviewNow() {
    const previewEl = previewElForHolder(activeEditorHolderId);
    if (!editorInstance) return;
    try {
      const data = await editorInstance.save();
      if (previewEl) previewEl.textContent = JSON.stringify(data, null, 2);
      const draftEl = draftPreviewElForHolder(activeEditorHolderId);
      if (draftEl) {
        draftEl.innerHTML = editorBlocksToHtml(data);
        bindPreviewBlockInteractions(draftEl);
      }
      const centerDraft = el("center-draft-preview");
      if (centerDraft && isEditingRoute()) {
        centerDraft.innerHTML = editorBlocksToHtml(data);
        bindPreviewBlockInteractions(centerDraft);
      }
      renderBlockNav(data);
    } catch (e) {
      if (previewEl) previewEl.textContent = String(e && e.message ? e.message : e);
    }
  }

  function scheduleEditorJsonPreview() {
    if (editorPreviewTimer) clearTimeout(editorPreviewTimer);
    editorPreviewTimer = setTimeout(() => updateEditorJsonPreviewNow(), 120);
  }

  function canAutosaveCurrentRoute() {
    if (state.sourceMode) return false;
    if (!isEditingRoute()) return false;
    return !!(lastSessionData && lastSessionData.ok);
  }

  function scheduleDraftAutosave() {
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    if (!canAutosaveCurrentRoute()) {
      setAutosaveStateLabel("Auto-save: login required", "warn");
      return;
    }
    setAutosaveStateLabel("Auto-save: pending…", "warn");
    autoSaveTimer = setTimeout(() => {
      autoSaveCurrentDraft();
    }, 1400);
  }

  async function saveDraftForCurrentRoute({ silent = false } = {}) {
    if (state.kind === "projects-home" && state.homeTab === "json") {
      if (!editorInstance) return { ok: false, error: "Editor not ready." };
      const d = await editorInstance.save();
      const integrity = validateEditorIntegrity(d);
      if (!integrity.ok) return integrity;
      return saveContentWrite("homepage", "", d);
    }
    if (state.kind === "project" || state.kind === "caseStudy") {
      if (!editorInstance) return { ok: false, error: "Editor not ready." };
      const d = await editorInstance.save();
      const integrity = validateEditorIntegrity(d);
      if (!integrity.ok) return integrity;
      return saveContentWrite(state.target, state.slug, d);
    }
    if (!silent) setStatus("Nothing to save on this screen.");
    return { ok: false, error: "No editable target." };
  }

  async function autoSaveCurrentDraft() {
    if (autoSaveInFlight || !state.draftDirty || !canAutosaveCurrentRoute()) return;
    autoSaveInFlight = true;
    try {
      const out = await saveDraftForCurrentRoute({ silent: true });
      if (!out.ok) {
        setAutosaveStateLabel("Auto-save: failed", "warn");
        return;
      }
      if (out.branch) setBranchHint(out.branch);
      state.draftDirty = false;
      setAutosaveStateLabel("Auto-save: saved", "ok");
    } catch (_) {
      setAutosaveStateLabel("Auto-save: failed", "warn");
    } finally {
      autoSaveInFlight = false;
    }
  }

  function blockTitleFor(block, i) {
    const t = block?.type || "block";
    const d = block?.data || {};
    const firstListItem = Array.isArray(d.items)
      ? (typeof d.items[0] === "string" ? d.items[0] : (d.items[0]?.content || ""))
      : "";
    const text = d.text || d.code || firstListItem || d.source || "";
    const clipped = String(text || "").replace(/<[^>]*>/g, "").trim().slice(0, 40);
    return `${i + 1}. ${t}${clipped ? ` - ${clipped}` : ""}`;
  }

  function renderBlockNav(editorData) {
    const wrap = el("block-nav-wrap");
    const list = el("block-nav-list");
    if (!wrap || !list) return;
    const previewPane = el("workspace-preview-pane");
    const iframe = el("admin-preview");
    // Keep block navigator at middle-top (above preview) when editing.
    if (previewPane && iframe && wrap.parentElement !== previewPane) {
      previewPane.insertBefore(wrap, iframe);
    }
    if (!isEditingRoute()) {
      wrap.classList.add("hidden");
      list.innerHTML = "";
      return;
    }
    wrap.classList.remove("hidden");
    const blocks = Array.isArray(editorData?.blocks) ? editorData.blocks : [];
    const headerBlocks = blocks
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => b && b.type === "header");
    if (!headerBlocks.length) {
      wrap.classList.add("hidden");
      list.innerHTML = "";
      return;
    }
    list.innerHTML = "";
    // Medium-like behavior: show only headings as "sections" navigation.
    // We intentionally disable drag-reorder here because filtered indices don't map cleanly to the editor block order.
    if (blockNavSortable && typeof blockNavSortable.destroy === "function") {
      try { blockNavSortable.destroy(); } catch (_) {}
    }
    blockNavSortable = null;

    headerBlocks.forEach(({ b, i }) => {
      const li = document.createElement("li");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "w-full text-left rounded px-2 py-1 bg-slate-800/60 hover:bg-slate-700 text-slate-200";
      btn.textContent = blockTitleFor(b, i);
      btn.addEventListener("click", () => {
        try {
          const holder = el(activeEditorHolderId);
          const node = holder?.querySelectorAll(".ce-block")[i];
          node?.scrollIntoView({ behavior: "smooth", block: "center" });
          node?.classList.add("ring-2", "ring-indigo-500");
          setTimeout(() => node?.classList.remove("ring-2", "ring-indigo-500"), 900);
        } catch (_) {}
      });
      li.appendChild(btn);
      list.appendChild(li);
    });
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
    if (!tools.paragraph) {
      setStatus(
        "Editor tools failed to load (paragraph missing). Hard refresh (Ctrl+F5). If it persists, check network/CDN.",
        { title: "Editor.js paragraph tool not found on window" }
      );
    } else if (!tools || Object.keys(tools).length === 0) {
      setStatus("Editor.js tools not loaded (check CDN). Hard refresh and retry.");
    }
    editorInstance = new Editor({
      holder: holderId,
      data: normalized,
      tools,
      autofocus: true,
      minHeight: 80,
      inlineToolbar: tools.paragraph ? ["bold", "italic", "link"] : false,
      onChange: () => {
        state.draftDirty = true;
        setStatus("Edited — changes are auto-saved.");
        setAutosaveStateLabel("Auto-save: pending…", "warn");
        scheduleEditorJsonPreview();
        scheduleDraftAutosave();
      }
    });
    if (editorInstance.isReady && typeof editorInstance.isReady.then === "function") {
      await editorInstance.isReady;
    }
    if (normalized.blocks.some((b) => b && b.type === "image") && !tools.image) {
      setStatus(
        "Image blocks need the SimpleImage tool — hard refresh (Ctrl+F5). If it persists, check the SimpleImage script in admin/editor.html.",
        { title: "SimpleImage tool missing" }
      );
    }
    // Initial preview after tools and data are ready.
    await updateEditorJsonPreviewNow();
  }

  async function apiSession() {
    const res = await fetch(`${API}/api/admin/session`, { credentials: "include" });
    return res.json();
  }

  async function apiGateStatus() {
    const res = await fetch(`${API}/api/admin/gate/status`, { credentials: "include" });
    return res.json();
  }

  async function apiGateVerify(password) {
    const res = await fetch(`${API}/api/admin/gate/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password })
    });
    return res.json();
  }

  async function loadContentRead(target, slug, source = "auto", ref = "") {
    const q = new URLSearchParams({ target });
    if (slug) q.set("slug", slug);
    if (source && source !== "auto") q.set("source", source);
    if (ref) q.set("ref", ref);
    const res = await fetch(`${API}/api/admin/content/read?${q}`, { credentials: "include" });
    const data = await res.json();
    data._httpStatus = res.status;
    return data;
  }

  async function apiListDraftCommits(target) {
    const res = await fetch(`${API}/api/admin/content/commits?${new URLSearchParams({ target, per_page: "20" })}`, {
      credentials: "include"
    });
    return res.json();
  }

  async function refreshDraftCommits() {
    const panel = el("draft-history-panel");
    const sel = el("sel-draft-commits");
    if (!sel || !panel || panel.classList.contains("hidden")) return;
    let target = "";
    if (state.kind === "projects-home" && state.homeTab === "json") target = "homepage";
    else if (state.kind === "project") target = "projects";
    else if (state.kind === "caseStudy") target = "caseStudies";
    if (!target) return;
    sel.innerHTML = '<option value="">Loading…</option>';
    const data = await apiListDraftCommits(target);
    sel.innerHTML = '<option value="">— Pick a past save —</option>';
    if (!data.ok || !Array.isArray(data.commits)) {
      sel.innerHTML = '<option value="">Unavailable (login or deploy Worker)</option>';
      return;
    }
    data.commits.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.sha;
      const when = c.date ? new Date(c.date).toLocaleString() : "";
      opt.textContent = `${c.shortSha} · ${when} · ${(c.message || "").slice(0, 42)}`;
      sel.appendChild(opt);
    });
  }

  async function saveContentWrite(target, slug, editorData, options = {}) {
    const payload = sanitizeEditorPayload(editorData, target, options);
    payload.slug = slug || "";
    const res = await fetch(`${API}/api/admin/content/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload)
    });
    return res.json();
  }

  async function loadRawSource(target, slug, mode) {
    const q = new URLSearchParams({ target, mode: mode || "file" });
    if (slug) q.set("slug", slug);
    const res = await fetch(`${API}/api/admin/content/raw?${q.toString()}`, { credentials: "include" });
    const data = await res.json();
    data._httpStatus = res.status;
    return data;
  }

  async function saveRawSource(target, slug, mode, text) {
    const res = await fetch(`${API}/api/admin/content/raw/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ target, slug, mode, text })
    });
    const data = await res.json();
    data._httpStatus = res.status;
    return data;
  }

  async function ensureMonaco() {
    if (monacoReady) return monacoReady;
    monacoReady = new Promise((resolve, reject) => {
      try {
        if (!window.require) throw new Error("Monaco loader missing");
        window.require.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs" } });
        window.require(["vs/editor/editor.main"], () => resolve(window.monaco), reject);
      } catch (e) {
        reject(e);
      }
    });
    return monacoReady;
  }

  function currentSourceRequest() {
    const pickerMode = el("source-format")?.value || "auto";
    if (state.kind === "project") {
      const mode = pickerMode === "homepage-text" ? "record-html" : pickerMode;
      return { target: "projects", slug: state.slug, mode: mode || "record-html", language: "html" };
    }
    if (state.kind === "caseStudy") {
      const mode = pickerMode === "homepage-text" ? "record-html" : pickerMode;
      return { target: "caseStudies", slug: state.slug, mode: mode || "record-html", language: "html" };
    }
    if (state.kind === "projects-home") {
      if (state.homeTab === "titles") return { target: "homepageUi", slug: "", mode: "file", language: "json" };
      return { target: "homepage", slug: "", mode: pickerMode || "homepage-text", language: "markdown" };
    }
    if (state.kind === "settings") return { target: "siteTheme", slug: "", mode: pickerMode || "file", language: "json" };
    return null;
  }

  function resolveAutoSourceMode(req) {
    if (!req) return "file";
    if (req.target === "projects" || req.target === "caseStudies") return "record-html";
    if (req.target === "homepage") return "homepage-text";
    return "file";
  }

  function isVirtualHomepageTextMode(target, mode) {
    return target === "homepage" && mode === "homepage-text";
  }

  function editorDataToPlainText(editorData) {
    const blocks = Array.isArray(editorData?.blocks) ? editorData.blocks : [];
    if (!blocks.length) return "";
    const lines = [];
    for (const block of blocks) {
      const type = block?.type;
      const data = block?.data || {};
      if (type === "header") {
        const level = Math.max(1, Math.min(4, Number(data.level || 2)));
        lines.push(`${"#".repeat(level)} ${String(data.text || "").trim()}`.trim());
        lines.push("");
        continue;
      }
      if (type === "paragraph") {
        const text = stripHtml(String(data.text || "")).trim();
        if (text) lines.push(text);
        lines.push("");
        continue;
      }
      if (type === "list") {
        const items = Array.isArray(data.items) ? data.items : [];
        const ordered = data.style === "ordered";
        items.forEach((item, idx) => {
          const txt = stripHtml(typeof item === "string" ? item : String(item || "")).trim();
          if (txt) lines.push(ordered ? `${idx + 1}. ${txt}` : `- ${txt}`);
        });
        lines.push("");
        continue;
      }
      if (type === "code") {
        const code = String(data.code || "").trim();
        if (code) {
          lines.push("```");
          lines.push(code);
          lines.push("```");
          lines.push("");
        }
        continue;
      }
    }
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  function plainTextToHomepageEditorData(text) {
    const src = String(text || "").replace(/\r\n/g, "\n");
    const lines = src.split("\n");
    const blocks = [];
    let i = 0;

    const pushParagraph = (buffer) => {
      const raw = buffer.join(" ").replace(/\s+/g, " ").trim();
      if (!raw) return;
      blocks.push({ type: "paragraph", data: { text: raw } });
    };

    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) {
        i += 1;
        continue;
      }

      const heading = /^(#{1,4})\s+(.+)$/.exec(line.trim());
      if (heading) {
        const level = Math.max(2, Math.min(4, heading[1].length));
        blocks.push({ type: "header", data: { text: heading[2].trim(), level } });
        i += 1;
        continue;
      }

      if (line.trim() === "```") {
        const codeLines = [];
        i += 1;
        while (i < lines.length && lines[i].trim() !== "```") {
          codeLines.push(lines[i]);
          i += 1;
        }
        if (i < lines.length && lines[i].trim() === "```") i += 1;
        const code = codeLines.join("\n").trim();
        if (code) blocks.push({ type: "code", data: { code } });
        continue;
      }

      const bullet = /^[-*]\s+(.+)$/.exec(line.trim());
      const numbered = /^(\d+)\.\s+(.+)$/.exec(line.trim());
      if (bullet || numbered) {
        const ordered = !!numbered;
        const items = [];
        while (i < lines.length) {
          const current = lines[i].trim();
          const m = ordered ? /^(\d+)\.\s+(.+)$/.exec(current) : /^[-*]\s+(.+)$/.exec(current);
          if (!m) break;
          items.push(m[ordered ? 2 : 1].trim());
          i += 1;
        }
        if (items.length) blocks.push({ type: "list", data: { style: ordered ? "ordered" : "unordered", items } });
        continue;
      }

      const para = [];
      while (i < lines.length && lines[i].trim()) {
        const current = lines[i].trim();
        if (/^(#{1,4})\s+/.test(current) || current === "```" || /^[-*]\s+/.test(current) || /^(\d+)\.\s+/.test(current)) break;
        para.push(current);
        i += 1;
      }
      pushParagraph(para);
    }

    if (!blocks.length) {
      blocks.push({ type: "paragraph", data: { text: "Start writing here." } });
    }

    return {
      time: Date.now(),
      version: "2.30.7",
      blocks
    };
  }

  async function openSourceMode() {
    const req = currentSourceRequest();
    if (!req) {
      setStatus("Text mode is available for editable targets only.");
      return;
    }
    state.sourceMode = true;
    showPanels();
    await ensureMonaco();
    const holder = el("source-editor-holder");
    if (!holder) return;
    const effectiveMode = req.mode === "auto" ? resolveAutoSourceMode(req) : req.mode;
    let textValue = "";
    let language = req.language || "json";
    if (isVirtualHomepageTextMode(req.target, effectiveMode)) {
      const data = await loadContentRead("homepage", "", "auto");
      if (!data.ok) {
        setStatus(data.error || "Failed to load homepage content.");
        return;
      }
      sourceDoc = { target: req.target, slug: req.slug, mode: effectiveMode, language: "markdown" };
      textValue = editorDataToPlainText(data.editorData || getDefaultEditorData());
      language = "markdown";
    } else {
      const data = await loadRawSource(req.target, req.slug, effectiveMode);
      if (!data.ok) {
        setStatus(data.error || "Failed to load source.");
        return;
      }
      sourceDoc = {
        target: req.target,
        slug: req.slug,
        mode: data.mode || effectiveMode,
        language: data.language || req.language || "json"
      };
      textValue = data.text || "";
      language = sourceDoc.language;
    }
    if (!monacoEditor) {
      const prefs = getSourcePrefs();
      monacoEditor = window.monaco.editor.create(holder, {
        value: textValue,
        language,
        theme: prefs.theme,
        automaticLayout: true,
        minimap: { enabled: false },
        wordWrap: prefs.wordWrap,
        smoothScrolling: true,
        fontSize: prefs.fontSize
      });
    } else {
      const model = monacoEditor.getModel();
      if (model) window.monaco.editor.setModelLanguage(model, language);
      monacoEditor.setValue(textValue);
      const prefs = getSourcePrefs();
      monacoEditor.updateOptions({
        wordWrap: prefs.wordWrap,
        fontSize: prefs.fontSize
      });
      window.monaco.editor.setTheme(prefs.theme);
    }
    syncSourcePrefsUi();
    setStatus(`Text editor ready (${sourceDoc.mode}). Edit, Save draft, then Publish.`);
  }

  function closeSourceMode() {
    state.sourceMode = false;
    showPanels();
    setStatus("Block editor mode. Switch back to Text for raw content editing.");
  }

  function setIframe(path, bustCache = false) {
    const f = el("admin-preview");
    if (f) f.src = previewUrl(path, bustCache);
  }

  function refreshPreviewIframe() {
    const f = el("admin-preview");
    if (!f || !f.src) return;
    try {
      const u = new URL(f.src);
      u.searchParams.set("_admin_cb", String(Date.now()));
      f.src = u.toString();
    } catch (_) {
      f.src = f.src;
    }
  }

  function showPanels() {
    const tabs = el("inspector-tabs");
    const pUi = el("panel-home-ui");
    const pJson = el("panel-home-json");
    const pEd = el("panel-editor-record");
    const pSt = el("panel-static");
    const pSettings = el("panel-settings");
    const pSource = el("panel-source");
    const ribBlocksToolbar = el("rib-blocks-toolbar");
    const sideLists = el("sidebar-record-lists");

    const isHome = state.kind === "projects-home";
    const isRecord = state.kind === "project" || state.kind === "caseStudy";
    const isStatic = state.kind === "about" || state.kind === "case-archive";
    const isSettings = state.kind === "settings";

    if (tabs) tabs.classList.toggle("hidden", !isHome);
    if (pUi) pUi.classList.toggle("hidden", state.sourceMode || !isHome || state.homeTab !== "titles");
    if (pJson) pJson.classList.toggle("hidden", state.sourceMode || !isHome || state.homeTab !== "json");
    if (pEd) pEd.classList.toggle("hidden", state.sourceMode || !isRecord);
    if (pSt) pSt.classList.toggle("hidden", !isStatic);
    if (pSettings) pSettings.classList.toggle("hidden", state.sourceMode || !isSettings);
    if (pSource) pSource.classList.toggle("hidden", !state.sourceMode || !(isHome || isRecord || isSettings));
    const showBlocksChrome = ((isHome && state.homeTab === "json") || isRecord) && !state.sourceMode;
    if (ribBlocksToolbar) ribBlocksToolbar.classList.toggle("hidden", !showBlocksChrome);
    // Keep record lists visible while editing so navigation never feels "stuck".
    if (sideLists) sideLists.classList.toggle("hidden", state.kind === "dashboard");
    const dhp = el("draft-history-panel");
    if (dhp) dhp.classList.toggle("hidden", !((isHome && state.homeTab === "json") || isRecord));
    const rrh = el("record-html-hint");
    if (rrh && !isRecord) rrh.classList.add("hidden");
    // Simple mode: hide noisy debug JSON panels while editing.
    if (!state.sourceMode && ((isHome && state.homeTab === "json") || isRecord)) {
      const jh = el("json-preview-home");
      const jr = el("json-preview-record");
      if (jh && jh.parentElement?.tagName === "DETAILS") jh.parentElement.classList.add("hidden");
      if (jr && jr.parentElement?.tagName === "DETAILS") jr.parentElement.classList.add("hidden");
    }
    renderBlockNav({ blocks: [] });
    syncWriteCodeSegment();
  }

  async function applyRoute() {
    try {
      showPanels();
      if (state.sourceMode) {
        await openSourceMode();
        return;
      }

      if (state.kind === "dashboard") {
        setCenterView("dashboard");
        await destroyEditor();
        await loadDashboardStats();
        return;
      }
      if (isEditingRoute()) {
        setCenterPreviewMode("draft");
      } else {
        setCenterPreviewMode("live");
      }
      setCenterView("preview");
      applyWorkspaceLayout();

      if (state.kind === "projects-home") {
        setIframe(`${PAGES}homepage.html`.replace(/^\//, ""));
        if (state.homeTab === "titles") {
          await loadHomeUiFields();
        } else {
          await loadHomepageJsonEditor();
          await refreshDraftCommits();
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
        await refreshDraftCommits();
        return;
      }

      if (state.kind === "caseStudy") {
        setIframe(`${PAGES}case-study.html?id=${encodeURIComponent(state.slug)}`.replace(/^\//, ""));
        await loadRecordEditor(state.target, state.slug);
        await refreshDraftCommits();
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
    } finally {
      await applyRibbonChromeOnly();
    }
  }

  async function loadHomeUiFields() {
    await destroyEditor();
    const msg = el("msg-home-ui");
    const hint = el("home-auth-hint");
    const res = await fetch(`${API}/api/admin/homepage-ui`, { credentials: "include" });
    const data = await res.json();
    if (hint) {
      hint.classList.toggle("hidden", data.ok);
      if (!data.ok) hint.textContent = "Sign in under Account to load and save section titles.";
    }
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
    if (msg) msg.textContent = "Saved. Preview updated below.";
    setIframe(`${PAGES}homepage.html`.replace(/^\//, ""), true);
  }

  async function loadPublicHomepageEditor() {
    try {
      const pub = await fetchJson("data/homepage-content.json");
      if (pub && pub.editor_content && Array.isArray(pub.editor_content.blocks)) return pub.editor_content;
      if (pub && Array.isArray(pub.blocks)) return pub;
    } catch (_) {}
    return getDefaultEditorData();
  }

  const HOME_JSON_HINT =
    "You're viewing the public homepage text (read-only). Open Account → Log in to load your draft and save.";

  async function loadHomepageJsonEditor(source = "auto", ref = "") {
    setStatus("Loading homepage content…");
    const hint = el("home-auth-hint");
    const jsonHint = el("home-json-auth-hint");
    const data = await loadContentRead("homepage", "", source, ref);
    if (hint) hint.classList.toggle("hidden", data.ok);
    if (!data.ok) {
      const unauthorized = data.error === "Unauthorized" || data._httpStatus === 401;
      if (unauthorized) {
        if (jsonHint) {
          jsonHint.textContent = HOME_JSON_HINT;
          jsonHint.classList.remove("hidden");
        }
        const pub = await loadPublicHomepageEditor();
        await mountEditor("admin-editor-holder-home", pub);
        state.draftDirty = false;
        setAutosaveStateLabel("Auto-save: login required", "warn");
        setStatus("Read-only baseline loaded. Use Account > Log in to load draft and save.");
        return;
      }
      if (jsonHint) jsonHint.classList.add("hidden");
      setStatus(data.error || "Load failed");
      await mountEditor("admin-editor-holder-home", getDefaultEditorData());
      return;
    }
    if (jsonHint) jsonHint.classList.add("hidden");
    await mountEditor("admin-editor-holder-home", data.editorData || getDefaultEditorData());
    state.draftDirty = false;
    setAutosaveStateLabel("Auto-save: on", "ok");
    setStatus("Homepage content loaded — edit, then Save draft and Publish when ready.");
  }

  function setRecordAuthBanner(show, message) {
    const b = el("record-auth-banner");
    if (!b) return;
    b.classList.toggle("hidden", !show);
    if (show && message) b.textContent = message;
  }

  function updateRecordHtmlHint(editorData) {
    const hint = el("record-html-hint");
    if (!hint) return;
    const blocks = Array.isArray(editorData?.blocks) ? editorData.blocks : [];
    const codeBlock = blocks.find((b) => b.type === "code");
    const c = String(codeBlock?.data?.code || "");
    const show =
      c.length > 120 &&
      (looksLikeHtml(c) || /Original HTML|content file|Record HTML/i.test(c));
    hint.classList.toggle("hidden", !show);
    if (show) {
      hint.textContent =
        "Long HTML body detected: use Source → Record HTML to edit the full page file. Visual mode is best for short blocks and summaries.";
    }
  }

  function isLongHtmlRecordEditorData(editorData) {
    const blocks = Array.isArray(editorData?.blocks) ? editorData.blocks : [];
    const codeBlock = blocks.find((b) => b.type === "code");
    const code = String(codeBlock?.data?.code || "");
    return code.length > 120 && (looksLikeHtml(code) || /Original HTML|content file|Record HTML/i.test(code));
  }

  async function loadRecordEditor(target, slug, source = "auto", ref = "") {
    const label = el("record-label");
    if (label) label.textContent = `${target === "projects" ? "Project" : "Case study"} · ${slug}`;
    setRecordAuthBanner(false, "");
    setStatus("Loading record…");
    const data = await loadContentRead(target, slug, source, ref);
    if (!data.ok) {
      const unauthorized = data.error === "Unauthorized" || data._httpStatus === 401;
      const missing = /No record found for slug/i.test(String(data.error || ""));
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
            state.draftDirty = false;
            setAutosaveStateLabel("Auto-save: login required", "warn");
            updateRecordHtmlHint(pub);
            return;
          }
        } catch (e) {
          console.warn(e);
        }
        await mountEditor("admin-editor-holder", getDefaultEditorData());
        return;
      }
      if (missing) {
        await mountEditor("admin-editor-holder", newRecordTemplate(target, slug, slug));
        setStatus(`No draft/live record found for ${slug}. Start editing blocks and Save draft to create it.`);
        return;
      }
      setStatus(data.error || "Load failed");
      await mountEditor("admin-editor-holder", getDefaultEditorData());
      return;
    }
    setRecordAuthBanner(false, "");
    const nextEditorData = data.editorData || getDefaultEditorData();
    await mountEditor("admin-editor-holder", nextEditorData);
    state.draftDirty = false;
    setAutosaveStateLabel("Auto-save: on", "ok");
    updateRecordHtmlHint(nextEditorData);
    if (isLongHtmlRecordEditorData(nextEditorData)) {
      const sourceSel = el("source-format");
      if (sourceSel) sourceSel.value = "record-html";
      if (!state.sourceMode) {
        state.sourceMode = true;
        showPanels();
        await openSourceMode();
        setStatus("Loaded full page HTML in Text mode for line-by-line editing.");
        return;
      }
    }
    setStatus("Loaded — Save draft, then Publish to live to update the public site.");
  }

  async function ribSave() {
    if (state.sourceMode) {
      if (!monacoEditor) {
        setStatus("Source editor not ready.");
        return;
      }
      if (isVirtualHomepageTextMode(sourceDoc.target, sourceDoc.mode)) {
        const editorData = plainTextToHomepageEditorData(monacoEditor.getValue());
        const out = await saveContentWrite("homepage", "", editorData);
        if (!out.ok) {
          setStatus(out.error || "Save failed");
          toast(out.error || "Save failed", "error");
          return;
        }
        if (out.unchanged) {
          setStatus("No changes detected. Draft not updated.");
          return;
        }
        setBranchHint(out.branch || "");
        setStatus(`Saved text draft · ${out.branch || "draft"}`);
        toast("Draft saved", "success");
        await ribLoad();
        return;
      }
      const out = await saveRawSource(sourceDoc.target, sourceDoc.slug, sourceDoc.mode, monacoEditor.getValue());
      if (!out.ok) {
        setStatus(out.error || "Source save failed");
        toast(out.error || "Save failed", "error");
        return;
      }
      if (out.unchanged) {
        setStatus("No changes detected. Draft not updated.");
        return;
      }
      setBranchHint(out.branch || "");
      setStatus(`Saved source · ${out.branch || "draft"}`);
      toast("Draft saved", "success");
      await ribLoad();
      return;
    }
    const s = await apiSession();
    if (!s.ok) {
      setStatus("Not logged in.");
      return;
    }

    if (state.kind === "projects-home" && state.homeTab === "titles") {
      await saveHomeUi();
      return;
    }

    if (state.kind === "projects-home" && state.homeTab === "json") {
      setStatus("Saving…");
      const out = await saveDraftForCurrentRoute();
      if (!out.ok) {
        setStatus(out.error || "Save failed");
        toast(out.error || "Save failed", "error");
        return;
      }
      if (out.unchanged) {
        state.draftDirty = false;
        setAutosaveStateLabel("Auto-save: saved", "ok");
        setStatus("No changes detected. Draft not updated.");
        await updateEditorJsonPreviewNow();
        setCenterPreviewMode("draft");
        return;
      }
      setBranchHint(out.branch || "");
      state.draftDirty = false;
      setAutosaveStateLabel("Auto-save: saved", "ok");
      setStatus(`Saved · ${out.branch || "draft"}`);
      toast("Draft saved", "success");
      await updateEditorJsonPreviewNow();
      setCenterPreviewMode("draft");
      return;
    }

    if (state.kind === "settings") {
      await saveThemeDraft();
      setStatus("Theme draft saved.");
      return;
    }

    if (state.kind === "dashboard") {
      await saveDashboardThemeDefaults();
      setStatus("Dashboard defaults saved.");
      return;
    }

    if (state.kind === "project" || state.kind === "caseStudy") {
      setStatus("Saving…");
      const out = await saveDraftForCurrentRoute();
      if (!out.ok) {
        setStatus(out.error || "Save failed");
        toast(out.error || "Save failed", "error");
        return;
      }
      if (out.unchanged) {
        state.draftDirty = false;
        setAutosaveStateLabel("Auto-save: saved", "ok");
        setStatus("No changes detected. Draft not updated.");
        await updateEditorJsonPreviewNow();
        setCenterPreviewMode("draft");
        return;
      }
      setBranchHint(out.branch || "");
      state.draftDirty = false;
      setAutosaveStateLabel("Auto-save: saved", "ok");
      setStatus(`Saved · ${out.branch || "draft"}`);
      toast("Draft saved", "success");
      await updateEditorJsonPreviewNow();
      setCenterPreviewMode("draft");
    }
  }

  async function ribPreview() {
    if (state.sourceMode) {
      setStatus("Text mode active: use center preview toggles, or switch to Blocks for visual preview.");
      return;
    }
    if ((state.kind === "projects-home" && state.homeTab === "json") || state.kind === "project" || state.kind === "caseStudy") {
      await updateEditorJsonPreviewNow();
      setCenterPreviewMode("draft");
      setStatus("Preview updated instantly (not saved yet).");
      return;
    }
    setStatus("Nothing to preview on this screen.");
  }

  async function ribLoad() {
    if (state.sourceMode) {
      await openSourceMode();
      return;
    }
    if (state.kind === "projects-home" && state.homeTab === "titles") {
      await loadHomeUiFields();
      return;
    }
    if (state.kind === "projects-home" && state.homeTab === "json") {
      await loadHomepageJsonEditor();
      return;
    }
    if (state.kind === "project" || state.kind === "caseStudy") {
      await loadRecordEditor(state.target, state.slug);
    }
  }

  function livePathForCurrentRoute() {
    const pp = PAGES.replace(/^\//, "");
    if (state.kind === "projects-home" || state.kind === "settings" || state.kind === "dashboard") {
      return `${pp}homepage.html`;
    }
    if (state.kind === "project") return `${pp}project.html?id=${encodeURIComponent(state.slug)}`;
    if (state.kind === "caseStudy") return `${pp}case-study.html?id=${encodeURIComponent(state.slug)}`;
    if (state.kind === "case-archive") return `${pp}case-studies-archive.html`;
    if (state.kind === "about") return `${pp}about.html`;
    return `${pp}homepage.html`;
  }

  function ribOpenLive() {
    try {
      const path = livePathForCurrentRoute();
      const u = new URL(path, SITE + "/");
      u.searchParams.set("_cb", String(Date.now()));
      window.open(u.toString(), "_blank", "noopener,noreferrer");
    } catch (_) {
      setStatus("Could not open live page.");
    }
  }

  function highlightNav() {
    document.querySelectorAll(".nav-item").forEach((b) => {
      const r = b.getAttribute("data-route");
      const on =
        (r === "dashboard" && state.kind === "dashboard") ||
        (r === "projects-home" && state.kind === "projects-home") ||
        (r === "settings" && state.kind === "settings") ||
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

  async function loadDashboardStats() {
    try {
      const [session, projects, cases] = await Promise.all([
        apiSession(),
        fetchJson("data/projects.json"),
        fetchJson("data/case_studies.json")
      ]);
      const ses = el("dash-session");
      const pc = el("dash-project-count");
      const cc = el("dash-case-count");
      const login = getSessionLogin(session);
      updateSessionUi(session);
      if (ses) ses.textContent = session.ok ? `Signed in (${login || "ok"})` : "Not signed in";
      if (pc) pc.textContent = Array.isArray(projects) ? String(projects.length) : "-";
      if (cc) cc.textContent = Array.isArray(cases) ? String(cases.length) : "-";
      const st = el("dash-server-time");
      if (st) st.textContent = session.serverTimeIst || "-";
      renderDashboardPublishHistory();
      await refreshBackupSelect("dash-restore-backup");
      await loadThemeSettings();
    } catch (_) {
      setStatus("Dashboard stats failed to load.");
    }
  }

  function buildSidebarLists(projects, cases) {
    if (Array.isArray(projects)) cachedSiteProjects = projects;
    if (Array.isArray(cases)) cachedSiteCases = cases;
    const pu = el("admin-sortable-projects");
    const cu = el("admin-sortable-cases");
    const baseProjects = Array.isArray(projects) ? projects : cachedSiteProjects;
    const baseCases = Array.isArray(cases) ? cases : cachedSiteCases;
    const mergedProjects = [...(localDraftRecords.projects || []), ...(baseProjects || []).filter((p) => !localDraftRecords.projects.some((lp) => lp.id === p.id))];
    const mergedCases = [...(localDraftRecords.caseStudies || []), ...(baseCases || []).filter((c) => !localDraftRecords.caseStudies.some((lc) => lc.id === c.id))];
    const q = String(el("sidebar-search")?.value || "").trim().toLowerCase();
    const projectPool = q
      ? mergedProjects.filter((p) => String(p?.title || p?.id || "").toLowerCase().includes(q) || String(p?.id || "").toLowerCase().includes(q))
      : mergedProjects;
    const casePool = q
      ? mergedCases.filter((c) => String(c?.title || c?.id || "").toLowerCase().includes(q) || String(c?.id || "").toLowerCase().includes(q))
      : mergedCases;
    const visibleProjects = state.compactListsOnSelect && state.kind === "project"
      ? (projectPool || []).filter((p) => p.id === state.slug)
      : (projectPool || []);
    const visibleCases = state.compactListsOnSelect && state.kind === "caseStudy"
      ? (casePool || []).filter((c) => c.id === state.slug)
      : (casePool || []);
    if (pu) {
      pu.innerHTML = "";
      visibleProjects.forEach((p) => {
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
      visibleCases.forEach((c) => {
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
    el("rib-logout")?.addEventListener("click", async () => {
      try {
        await fetch(`${API}/api/admin/auth/logout`, { credentials: "include" });
      } catch (_) {}
      setStatus("Logged out.");
      await refreshSessionLabel();
    });
    el("rib-session")?.addEventListener("click", async () => {
      const d = await apiSession();
      const login = getSessionLogin(d);
      updateSessionUi(d);
      setStatus(d.ok ? `Session: ${login || "ok"}` : "No session");
    });
    el("rib-refresh")?.addEventListener("click", () => {
      const f = el("admin-preview");
      if (f && f.src) f.src = f.src;
    });
    el("rib-open-live")?.addEventListener("click", ribOpenLive);
    el("rib-edit-workspace")?.addEventListener("click", () => {
      state.editWorkspace = !state.editWorkspace;
      applyWorkspaceLayout();
    });
    el("rib-save")?.addEventListener("click", ribSave);
    el("rib-preview")?.addEventListener("click", ribPreview);
    el("rib-load")?.addEventListener("click", ribLoad);
    el("btn-mode-visual")?.addEventListener("click", () => {
      closeSourceMode();
      applyRoute();
    });
    el("btn-mode-source")?.addEventListener("click", async () => {
      await openSourceMode();
    });
    el("btn-source-reload")?.addEventListener("click", async () => {
      await openSourceMode();
    });
    el("source-format")?.addEventListener("change", async () => {
      if (!state.sourceMode) return;
      await openSourceMode();
    });
    el("btn-source-main-html")?.addEventListener("click", async () => {
      await setSourceFormatAndReload("record-html");
    });
    el("btn-source-record-json")?.addEventListener("click", async () => {
      await setSourceFormatAndReload("record-json");
    });
    el("btn-source-whole-file")?.addEventListener("click", async () => {
      await setSourceFormatAndReload("file");
    });
    el("btn-source-format-doc")?.addEventListener("click", async () => {
      if (!state.sourceMode) {
        await openSourceMode();
      }
      if (!monacoEditor || !window.monaco) {
        setStatus("Text editor not ready for formatting yet.");
        return;
      }
      const action = monacoEditor.getAction("editor.action.formatDocument");
      if (!action) {
        setStatus("Formatter unavailable for current mode.");
        return;
      }
      await action.run();
      setStatus("Formatted current document.");
    });
    el("source-theme")?.addEventListener("change", () => {
      const prefs = getSourcePrefs();
      const next = { ...prefs, theme: el("source-theme")?.value === "vs" ? "vs" : "vs-dark" };
      saveSourcePrefs(next);
      if (window.monaco) window.monaco.editor.setTheme(next.theme);
    });
    el("source-wrap")?.addEventListener("change", () => {
      const prefs = getSourcePrefs();
      const next = { ...prefs, wordWrap: el("source-wrap")?.value === "off" ? "off" : "on" };
      saveSourcePrefs(next);
      monacoEditor?.updateOptions({ wordWrap: next.wordWrap });
    });
    el("source-font-size")?.addEventListener("change", () => {
      const prefs = getSourcePrefs();
      const raw = Number(el("source-font-size")?.value || 13);
      const nextSize = [12, 13, 14, 15, 16].includes(raw) ? raw : 13;
      const next = { ...prefs, fontSize: nextSize };
      saveSourcePrefs(next);
      monacoEditor?.updateOptions({ fontSize: nextSize });
    });
    el("rib-shortcuts")?.addEventListener("click", () => {
      el("shortcut-modal-backdrop")?.classList.remove("hidden");
    });
    el("btn-close-shortcuts")?.addEventListener("click", () => {
      el("shortcut-modal-backdrop")?.classList.add("hidden");
    });
    el("shortcut-modal-backdrop")?.addEventListener("click", (evt) => {
      if (evt.target && evt.target.id === "shortcut-modal-backdrop") {
        el("shortcut-modal-backdrop")?.classList.add("hidden");
      }
    });

    document.querySelectorAll(".rib-ins").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!editorInstance || !editorInstance.blocks) return;
        const type = btn.getAttribute("data-insert");
        const map = {
          paragraph: { type: "paragraph", data: { text: "" } },
          header: { type: "header", data: { text: "Heading", level: 2 } },
          list: { type: "list", data: { style: "unordered", items: ["Item"] } },
          image: { type: "image", data: { url: "", caption: "" } },
          code: { type: "code", data: { code: "" } },
          embed: { type: "embed", data: { service: "github", source: "https://github.com/", embed: "https://github.com/", width: 580, height: 320, caption: "" } }
        };
        const block = map[type];
        if (!block) return;
        try {
          if (type === "image") {
            const src = (window.prompt("Image URL (https://...):") || "").trim();
            if (!src) return;
            const caption = (window.prompt("Optional caption:") || "").trim();
            await editorInstance.blocks.insert("image", { url: src, caption });
            return;
          }
          await editorInstance.blocks.insert(block.type, block.data);
        } catch (e) {
          setStatus("Could not insert block — use + inside the editor.");
          console.warn(e);
        }
      });
    });

    el("rib-block-delete")?.addEventListener("click", async () => {
      if (!editorInstance?.blocks) return;
      try {
        const idx = editorInstance.blocks.getCurrentBlockIndex();
        await editorInstance.blocks.delete(idx);
      } catch (_) {
        setStatus("Select a block in editor first.");
      }
    });
    el("rib-block-up")?.addEventListener("click", async () => {
      if (!editorInstance?.blocks) return;
      try {
        const idx = editorInstance.blocks.getCurrentBlockIndex();
        if (idx > 0) await editorInstance.blocks.move(idx - 1, idx);
      } catch (_) {
        setStatus("Could not move block up.");
      }
    });
    el("rib-block-down")?.addEventListener("click", async () => {
      if (!editorInstance?.blocks) return;
      try {
        const idx = editorInstance.blocks.getCurrentBlockIndex();
        await editorInstance.blocks.move(idx + 1, idx);
      } catch (_) {
        setStatus("Could not move block down.");
      }
    });
    el("btn-bottom-insert")?.addEventListener("click", async () => {
      if (!editorInstance?.blocks) return;
      try {
        await editorInstance.blocks.insert("paragraph", { text: "" });
      } catch (_) {}
    });
    el("btn-bottom-delete")?.addEventListener("click", () => el("rib-block-delete")?.click());
    el("btn-bottom-up")?.addEventListener("click", () => el("rib-block-up")?.click());
    el("btn-bottom-down")?.addEventListener("click", () => el("rib-block-down")?.click());
    el("btn-open-editor")?.addEventListener("click", () => {
      state.kind = "projects-home";
      state.homeTab = "json";
      highlightNav();
      applyRoute();
    });
    el("btn-center-draft")?.addEventListener("click", () => setCenterPreviewMode("draft"));
    el("btn-center-live")?.addEventListener("click", () => setCenterPreviewMode("live"));
    el("btn-load-draft-home")?.addEventListener("click", () => loadHomepageJsonEditor("draft"));
    el("btn-load-live-home")?.addEventListener("click", () => loadHomepageJsonEditor("base"));
    el("btn-load-draft-record")?.addEventListener("click", () => loadRecordEditor(state.target, state.slug, "draft"));
    el("btn-load-live-record")?.addEventListener("click", () => loadRecordEditor(state.target, state.slug, "base"));
    el("btn-refresh-draft-commits")?.addEventListener("click", () => refreshDraftCommits());
    el("btn-load-draft-commit")?.addEventListener("click", async () => {
      const sha = el("sel-draft-commits")?.value;
      if (!sha) {
        setStatus("Choose a commit from Draft file history.");
        return;
      }
      if (!window.confirm("Load this saved version into the editor? Current unsaved edits in the panel will be replaced.")) return;
      if (state.kind === "projects-home" && state.homeTab === "json") {
        await loadHomepageJsonEditor("auto", sha);
      } else if (state.kind === "project" || state.kind === "caseStudy") {
        await loadRecordEditor(state.target, state.slug, "auto", sha);
      } else {
        return;
      }
      setStatus("Loaded a past draft save — use Save draft to continue from here, then Publish when ready.");
      await refreshDraftCommits();
    });

    window.addEventListener("keydown", (ev) => {
      const isSaveKey = (ev.ctrlKey || ev.metaKey) && String(ev.key || "").toLowerCase() === "s";
      if (!isSaveKey) return;
      ev.preventDefault();
      ribSave();
    });

    window.addEventListener("beforeunload", (ev) => {
      if (state.draftDirty && !state.sourceMode) {
        ev.preventDefault();
        ev.returnValue = "";
      }
    });
  }

  function cleanSlug(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  function updateNewRecordSlugHint() {
    const titleEl = el("new-record-title");
    const slugEl = el("new-record-slug");
    const hintEl = el("new-record-slug-hint");
    if (!hintEl) return;
    const title = (titleEl?.value || "").trim();
    const slugRaw = (slugEl?.value || "").trim();
    const computed = cleanSlug(slugRaw || title);
    hintEl.textContent = computed ? `Slug preview: ${computed}` : "Slug preview: -";
  }

  function newRecordTemplate(kind, title, slug) {
    const isCase = kind === "caseStudies";
    return {
      time: Date.now(),
      version: "2.30.7",
      blocks: [
        { type: "header", data: { text: title || "Untitled", level: 2 } },
        { type: "paragraph", data: { text: isCase ? "Short summary for this case study with decision context." : "Short summary for this project and measurable impact." } },
        { type: "header", data: { text: "Overview", level: 3 } },
        { type: "paragraph", data: { text: "Add context, goals, and why this work matters." } },
        { type: "header", data: { text: isCase ? "Method" : "Approach", level: 3 } },
        { type: "list", data: { style: "unordered", items: isCase ? ["Context", "Hypothesis", "Analysis"] : ["Data", "Method", "Validation"] } },
        { type: "header", data: { text: isCase ? "Findings" : "Outcome", level: 3 } },
        { type: "paragraph", data: { text: isCase ? "Add what changed, why it matters, and trade-offs." : "Add measurable impact, results, or learnings." } },
        { type: "code", data: { code: `<!-- Optional rich HTML section for ${kind}/${slug} -->` } }
      ]
    };
  }

  function newRecordMeta(kind, title, slug) {
    if (kind === "projects") {
      return {
        id: slug,
        title,
        category: "Analytics",
        date: String(new Date().getFullYear()),
        thumbnail: "assets/images/thumbs/01.jpg",
        images: [],
        content_path: `data/projects/${slug}.html`,
        show_apps_section: true,
        tools: [],
        featured: false
      };
    }
    return {
      id: slug,
      title,
      category: "Case Study",
      date: String(new Date().getFullYear()),
      thumbnail: "assets/images/thumbs/01.jpg",
      case_study_path: `data/case_studies/${slug}.html`,
      case_study_read_mins: 10,
      tier: "featured",
      tools: [],
      related_case_studies: []
    };
  }

  async function createNewRecord(kind, opts = {}) {
    const s = await apiSession();
    if (!s.ok) {
      setStatus("Login first.");
      return;
    }
    const label = kind === "projects" ? "project" : "case study";
    const title = (opts.title || window.prompt(`Title for your new ${label} (shown on the site):`) || "").trim();
    if (!title) return;
    const slugInput = (opts.slugInput || "").trim();
    const slug = cleanSlug(slugInput || title);
    if (!slug) {
      setStatus("Invalid slug.");
      return;
    }
    const tpl = newRecordTemplate(kind, title, slug);
    const out = await saveContentWrite(kind, slug, tpl, { meta: newRecordMeta(kind, title, slug) });
    if (!out.ok) {
      setStatus(out.error || "Could not create draft.");
      return;
    }
    const rec = { id: slug, title };
    if (kind === "projects") {
      localDraftRecords.projects.unshift(rec);
      state.kind = "project";
      state.target = "projects";
    } else {
      localDraftRecords.caseStudies.unshift(rec);
      state.kind = "caseStudy";
      state.target = "caseStudies";
    }
    state.slug = slug;
    highlightNav();
    const projects = await fetchJson("data/projects.json").catch(() => []);
    const cases = await fetchJson("data/case_studies.json").catch(() => []);
    buildSidebarLists(projects, cases);
    await applyRoute();
    setStatus(`Draft created for ${label}: ${slug}.`);
    const titleEl = el("new-record-title");
    const slugEl = el("new-record-slug");
    if (titleEl) titleEl.value = "";
    if (slugEl) slugEl.value = "";
    updateNewRecordSlugHint();
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

  function syncSourceFormatOptions() {
    const sel = el("source-format");
    if (!sel) return;
    const options = Array.from(sel.options || []);
    const isRecord = state.kind === "project" || state.kind === "caseStudy";
    const isHomeContent = state.kind === "projects-home" && state.homeTab === "json";

    options.forEach((opt) => {
      const value = opt.value;
      let show = value === "auto" || value === "file";
      if (value === "record-html" || value === "record-json") show = isRecord;
      if (value === "homepage-text") show = isHomeContent;
      opt.hidden = !show;
      opt.disabled = !show;
    });

    if (isRecord && (sel.value === "homepage-text" || sel.value === "auto")) sel.value = "record-html";
    if (isHomeContent && (sel.value === "record-html" || sel.value === "record-json")) sel.value = "homepage-text";
  }

  async function setSourceFormatAndReload(nextValue) {
    const sel = el("source-format");
    if (!sel) return;
    sel.value = nextValue;
    await openSourceMode();
  }

  function wireInspectorTabs() {
    el("tab-titles")?.addEventListener("click", () => {
      state.homeTab = "titles";
      setHomeTabStyle("titles");
      syncSourceFormatOptions();
      applyRoute();
    });
    el("tab-json")?.addEventListener("click", () => {
      state.homeTab = "json";
      setHomeTabStyle("json");
      syncSourceFormatOptions();
      applyRoute();
    });
    setHomeTabStyle(state.homeTab);
  }

  function wireNav() {
    document.querySelectorAll('.nav-item[data-route="dashboard"]').forEach((b) => {
      b.addEventListener("click", () => {
        state.kind = "dashboard";
        state.slug = "";
        highlightNav();
        syncSourceFormatOptions();
        applyRoute();
      });
    });
    document.querySelectorAll('.nav-item[data-route="projects-home"]').forEach((b) => {
      b.addEventListener("click", () => {
        state.kind = "projects-home";
        state.slug = "";
        state.homeTab = "json";
        setHomeTabStyle("json");
        highlightNav();
        syncSourceFormatOptions();
        applyRoute();
      });
    });
    document.querySelectorAll('.nav-item[data-route="settings"]').forEach((b) => {
      b.addEventListener("click", () => {
        state.kind = "settings";
        state.slug = "";
        highlightNav();
        syncSourceFormatOptions();
        applyRoute();
      });
    });
    document.querySelectorAll('.nav-item[data-route="case-archive"]').forEach((b) => {
      b.addEventListener("click", () => {
        state.kind = "case-archive";
        state.slug = "";
        highlightNav();
        syncSourceFormatOptions();
        applyRoute();
      });
    });
    document.querySelectorAll('.nav-item[data-route="about"]').forEach((b) => {
      b.addEventListener("click", () => {
        state.kind = "about";
        state.slug = "";
        highlightNav();
        syncSourceFormatOptions();
        applyRoute();
      });
    });
  }

  function wireWorkspacePrefs() {
    const search = el("sidebar-search");
    search?.addEventListener("input", () => {
      buildSidebarLists(cachedSiteProjects, cachedSiteCases);
    });
    const compact = el("toggle-compact-lists");
    if (compact) compact.checked = !!state.compactListsOnSelect;
    compact?.addEventListener("change", () => {
      state.compactListsOnSelect = !!compact.checked;
      buildSidebarLists(cachedSiteProjects, cachedSiteCases);
    });
  }

  function wireKeyboardShortcuts() {
    document.addEventListener("keydown", async (evt) => {
      const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
      const mod = isMac ? evt.metaKey : evt.ctrlKey;
      if (!mod) {
        if (evt.key === "Escape") el("shortcut-modal-backdrop")?.classList.add("hidden");
        return;
      }
      const key = String(evt.key || "").toLowerCase();
      if (key === "s" && !evt.shiftKey) {
        evt.preventDefault();
        await ribSave();
        return;
      }
      if (key === "p" && evt.shiftKey) {
        evt.preventDefault();
        await ribPublish();
        return;
      }
      if (key === "l" && evt.shiftKey) {
        evt.preventDefault();
        await ribLoad();
        return;
      }
      if (key === "e" && evt.shiftKey) {
        evt.preventDefault();
        if (state.sourceMode) {
          closeSourceMode();
          await applyRoute();
        } else {
          await openSourceMode();
        }
      }
    });
  }

  el("btn-save-ui")?.addEventListener("click", saveHomeUi);
  el("btn-new-project")?.addEventListener("click", () => createNewRecord("projects"));
  el("btn-new-case")?.addEventListener("click", () => createNewRecord("caseStudies"));
  el("new-record-title")?.addEventListener("input", updateNewRecordSlugHint);
  el("new-record-slug")?.addEventListener("input", updateNewRecordSlugHint);
  el("new-record-kind")?.addEventListener("change", updateNewRecordSlugHint);
  el("btn-create-record")?.addEventListener("click", async () => {
    const kind = el("new-record-kind")?.value === "caseStudies" ? "caseStudies" : "projects";
    const title = (el("new-record-title")?.value || "").trim();
    const slugInput = (el("new-record-slug")?.value || "").trim();
    if (!title) {
      setStatus("Enter a title to create a draft.");
      return;
    }
    await createNewRecord(kind, { title, slugInput });
  });
  updateNewRecordSlugHint();

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
    const dm = el("theme-default-mode");
    const dc = el("theme-default-color");
    if (pri) pri.value = theme.primary || "#3B4CCA";
    if (acc) acc.value = theme.accent || "#2CB1A6";
    if (fs) fs.value = theme.baseFontSizePx || 16;
    if (ff) ff.value = theme.fontFamily || "Inter, system-ui, sans-serif";
    if (dm) dm.value = theme.defaultMode || "system";
    if (dc) dc.value = theme.defaultColorTheme || "theme-custom";
    const dDm = el("dash-theme-mode");
    const dDc = el("dash-theme-color");
    if (dDm) dDm.value = theme.defaultMode || "system";
    if (dDc) dDc.value = theme.defaultColorTheme || "theme-custom";
    if (msg) msg.textContent = "Loaded.";
  }

  async function saveThemeDraft() {
    const msg = el("msg-theme");
    const pri = el("theme-primary")?.value || "#3B4CCA";
    const acc = el("theme-accent")?.value || "#2CB1A6";
    const fs = Number(el("theme-font-size")?.value || 16);
    const ff = el("theme-font-family")?.value || "Inter, system-ui, sans-serif";
    const dm = el("theme-default-mode")?.value || "system";
    const dc = el("theme-default-color")?.value || "theme-custom";
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
            { type: "code", data: { code: JSON.stringify({ schemaVersion: 1, theme: { primary: pri, accent: acc, baseFontSizePx: fs, fontFamily: ff, defaultMode: dm, defaultColorTheme: dc } }, null, 2) } }
          ]
        }
      })
    });
    const data = await res.json();
    if (!data.ok) {
      if (msg) msg.textContent = data.error || "Save failed";
      return;
    }
    setBranchHint(data.branch || "");
    if (msg) msg.textContent = `Saved draft (${data.branch || "draft"}).`;
  }

  async function saveDashboardThemeDefaults() {
    const msg = el("msg-dash-theme");
    const mode = el("dash-theme-mode")?.value || "system";
    const color = el("dash-theme-color")?.value || "theme-custom";
    const pri = el("theme-primary")?.value || "#3B4CCA";
    const acc = el("theme-accent")?.value || "#2CB1A6";
    const fs = Number(el("theme-font-size")?.value || 16);
    const ff = el("theme-font-family")?.value || "Inter, system-ui, sans-serif";
    if (msg) msg.textContent = "Saving defaults…";
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
            { type: "code", data: { code: JSON.stringify({ schemaVersion: 1, theme: { primary: pri, accent: acc, baseFontSizePx: fs, fontFamily: ff, defaultMode: mode, defaultColorTheme: color } }, null, 2) } }
          ]
        }
      })
    });
    const data = await res.json();
    if (!data.ok) {
      if (msg) msg.textContent = data.error || "Save failed";
      return;
    }
    setBranchHint(data.branch || "");
    const sDm = el("theme-default-mode");
    const sDc = el("theme-default-color");
    if (sDm) sDm.value = mode;
    if (sDc) sDc.value = color;
    if (msg) msg.textContent = `Saved defaults (${data.branch || "draft"}).`;
  }

  el("btn-theme-load")?.addEventListener("click", () => loadThemeSettings());
  el("btn-theme-save")?.addEventListener("click", () => saveThemeDraft());
  el("btn-dash-theme-save")?.addEventListener("click", () => saveDashboardThemeDefaults());
  el("btn-theme-publish")?.addEventListener("click", async () => {
    const s = await apiSession();
    if (!s.ok) {
      setStatus("Login first.");
      return;
    }
    if (!window.confirm("Publish theme changes to the live site?")) return;
    setStatus("Publishing…");
    const out = await apiPublish("siteTheme");
    if (out.ok) {
      recordPublishSuccess("siteTheme");
      updateLastPublishedLabel();
      toast("Published to live site", "success");
    } else {
      toast(out.error || "Publish failed", "error");
    }
    setStatus(out.ok ? "Published theme to live." : out.error || "Publish failed");
    if (out.ok) {
      refreshPreviewIframe();
      setCenterPreviewMode("live");
    }
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

  async function refreshBackupSelect(selectId = "sel-restore-backup") {
    const sel = el(selectId);
    if (!sel) return;
    sel.innerHTML = '<option value="">Loading…</option>';
    const data = await apiListBackups();
    sel.innerHTML = '<option value="">Select backup…</option>';
    if (!data.ok || !Array.isArray(data.backups)) {
      sel.innerHTML = '<option value="">No backups or unauthorized</option>';
      syncDashboardRestoreState();
      return;
    }
    data.backups.forEach((b) => {
      const opt = document.createElement("option");
      opt.value = b.path;
      opt.textContent = formatBackupOptionLabel(b);
      sel.appendChild(opt);
    });
    syncDashboardRestoreState();
  }

  function formatBackupOptionLabel(backup) {
    const name = String(backup?.name || "");
    const m = /^backup-([^-]+)-(live|draft|baseline)-(.+)\.json$/i.exec(name);
    if (!m) return name;
    const [, target, snapType, rawTs] = m;
    const tsMatch = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/.exec(rawTs);
    const whenIso = tsMatch
      ? `${tsMatch[1]}T${tsMatch[2]}:${tsMatch[3]}:${tsMatch[4]}.${tsMatch[5]}Z`
      : rawTs;
    const d = new Date(whenIso);
    const when = Number.isNaN(d.getTime()) ? rawTs : d.toLocaleString();
    const targetLabel = labelForPublishTarget(target);
    const snapLabel = snapType === "live" ? "Live before publish" : snapType === "draft" ? "Draft snapshot" : "Baseline snapshot";
    return `${targetLabel} · ${snapLabel} · ${when}`;
  }

  function syncDashboardRestoreState() {
    const sel = el("dash-restore-backup");
    const btn = el("btn-dash-restore");
    const hint = el("dash-restore-hint");
    if (!btn) return;
    const selected = !!(sel && sel.value);
    btn.disabled = !selected;
    if (hint) {
      hint.textContent = selected
        ? "Selected backup will be restored to live after confirmation."
        : "Select a backup first.";
    }
  }

  el("rib-publish")?.addEventListener("click", async () => {
    const s = await apiSession();
    if (!s.ok) {
      setStatus("Log in under Account first, then Publish.");
      return;
    }
    let target = null;
    if (state.kind === "project") target = "projects";
    else if (state.kind === "caseStudy") target = "caseStudies";
    else if (state.kind === "projects-home") {
      target = state.homeTab === "json" ? "homepage" : "homepageUi";
    } else if (state.kind === "settings" || state.kind === "dashboard") {
      target = "siteTheme";
    }
    if (!target) {
      setStatus("Choose a supported page first.");
      return;
    }
    if (
      !window.confirm(
        "Publish your saved draft to the live website? A backup of the current live file is created when possible."
      )
    ) {
      return;
    }
    setStatus("Publishing…");
    const out = await apiPublish(target);
    if (!out.ok) {
      setStatus(out.error || "Publish failed");
      toast(out.error || "Publish failed", "error");
      return;
    }
    recordPublishSuccess(target);
    updateLastPublishedLabel();
    const backupLabel = Array.isArray(out.backupPaths) && out.backupPaths.length
      ? `Backups: ${out.backupPaths.length}`
      : out.backupPath
        ? `Backup: ${out.backupPath}`
        : "";
    setStatus(`Published to ${out.baseBranch || "live"}. ${backupLabel}`);
    toast("Published to live site", "success");
    refreshPreviewIframe();
    setCenterPreviewMode("live");
  });

  el("btn-publish-home-ui")?.addEventListener("click", async () => {
    const s = await apiSession();
    if (!s.ok) {
      setStatus("Login first.");
      return;
    }
    if (!window.confirm("Publish section title changes to the live site?")) return;
    setStatus("Publishing…");
    const out = await apiPublish("homepageUi");
    if (out.ok) {
      recordPublishSuccess("homepageUi");
      updateLastPublishedLabel();
      toast("Published section titles", "success");
    } else {
      toast(out.error || "Publish failed", "error");
    }
    const homeUiBackupLabel = Array.isArray(out.backupPaths) && out.backupPaths.length
      ? `Backups: ${out.backupPaths.length}`
      : out.backupPath || "";
    setStatus(out.ok ? `Published. ${homeUiBackupLabel}` : out.error || "Failed");
    if (out.ok) {
      refreshPreviewIframe();
      setCenterPreviewMode("live");
    }
  });

  el("btn-publish-home-json")?.addEventListener("click", async () => {
    const s = await apiSession();
    if (!s.ok) {
      setStatus("Login first.");
      return;
    }
    if (!window.confirm("Publish homepage text to the live site?")) return;
    setStatus("Publishing…");
    const out = await apiPublish("homepage");
    if (out.ok) {
      recordPublishSuccess("homepage");
      updateLastPublishedLabel();
      toast("Published homepage content", "success");
    } else {
      toast(out.error || "Publish failed", "error");
    }
    const homeBackupLabel = Array.isArray(out.backupPaths) && out.backupPaths.length
      ? `Backups: ${out.backupPaths.length}`
      : out.backupPath || "";
    setStatus(out.ok ? `Published. ${homeBackupLabel}` : out.error || "Failed");
    if (out.ok) {
      refreshPreviewIframe();
      setCenterPreviewMode("live");
    }
  });

  el("btn-refresh-backups")?.addEventListener("click", () => refreshBackupSelect());
  el("btn-dash-refresh-history")?.addEventListener("click", () => renderDashboardPublishHistory());
  el("btn-dash-refresh-backups")?.addEventListener("click", () => refreshBackupSelect("dash-restore-backup"));
  el("dash-restore-backup")?.addEventListener("change", () => syncDashboardRestoreState());
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
      refreshPreviewIframe();
      await ribLoad();
    }
  });
  el("btn-dash-restore")?.addEventListener("click", async () => {
    const s = await apiSession();
    if (!s.ok) {
      setStatus("Login first.");
      return;
    }
    const path = el("dash-restore-backup")?.value;
    if (!path) {
      setStatus("Select a backup.");
      return;
    }
    const selectedText = el("dash-restore-backup")?.selectedOptions?.[0]?.textContent || "the selected backup";
    if (!window.confirm(`Restore ${selectedText} to LIVE branch now?`)) return;
    setStatus("Restoring…");
    const out = await apiRestore(path);
    setStatus(out.ok ? `Restored ${out.path}` : out.error || "Restore failed");
    if (out.ok) {
      toast("Backup restored to live", "success");
      refreshPreviewIframe();
      await applyRoute();
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
    const sess = await applyRibbonChromeOnly();
    const login = getSessionLogin(sess);
    const ts = sess.serverTimeIst ? ` · IST ${sess.serverTimeIst}` : "";
    setStatus(sess.ok ? `Signed in · ${login || "ok"}${ts}` : `Not signed in — use Login to load drafts & save.${ts}`);
    const hint = el("home-auth-hint");
    if (hint && state.kind === "projects-home") {
      hint.classList.toggle("hidden", sess.ok);
    }
    const jsonHint = el("home-json-auth-hint");
    if (jsonHint && state.kind === "projects-home" && state.homeTab === "json") {
      jsonHint.classList.toggle("hidden", sess.ok);
      if (!sess.ok && !jsonHint.textContent) jsonHint.textContent = HOME_JSON_HINT;
    }
  }

  async function ensureAdminGate() {
    const gate = await apiGateStatus();
    if (!gate.ok || !gate.required || gate.verified) return true;
    for (let i = 0; i < 3; i += 1) {
      const pwd = window.prompt("Enter admin password to access this workspace:");
      if (!pwd) break;
      const out = await apiGateVerify(pwd);
      if (out.ok) {
        setStatus("Admin password verified.");
        return true;
      }
      setStatus(out.error || "Invalid admin password.");
    }
    setStatus("Admin password required. Reload and try again.");
    return false;
  }

  window.addEventListener("DOMContentLoaded", async () => {
    const gateOk = await ensureAdminGate();
    if (!gateOk) return;
    wireRibbon();
    wireInspectorTabs();
    wireNav();
    wireWorkspacePrefs();
    wireKeyboardShortcuts();
    syncSourcePrefsUi();
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
    syncSourceFormatOptions();
    await applyRoute();
    await refreshSessionLabel();
    await refreshBackupSelect();
  });
})();
