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
  let blockNavSortable = null;

  const state = {
    kind: "dashboard",
    target: "homepage",
    slug: "",
    homeTab: "titles",
    editWorkspace: false,
    compactListsOnSelect: true,
    centerPreviewMode: "live",
    sourceMode: false
  };
  let monacoEditor = null;
  let monacoReady = null;
  let sourceDoc = { target: "", slug: "", mode: "file", language: "json" };
  const localDraftRecords = {
    projects: [],
    caseStudies: []
  };

  const el = (id) => document.getElementById(id);

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

  function setBranchHint(branch) {
    lastBranchHint = branch && String(branch).trim() ? String(branch).trim() : "";
    const hintEl = el("rib-branch-hint");
    if (hintEl) {
      hintEl.textContent = lastBranchHint ? `Draft: ${lastBranchHint}` : "";
      hintEl.classList.toggle("hidden", !lastBranchHint);
      hintEl.title = lastBranchHint ? `Last saved draft branch: ${lastBranchHint}` : "";
    }
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
    if (lbl) lbl.textContent = state.centerPreviewMode === "draft" ? "Draft preview" : "Live page preview";
    if (bd) bd.classList.toggle("bg-indigo-700", state.centerPreviewMode === "draft");
    if (bl) bl.classList.toggle("bg-indigo-700", state.centerPreviewMode === "live");
    setCenterView(state.kind === "dashboard" ? "dashboard" : "preview");
  }

  function applyWorkspaceLayout() {
    const previewPane = el("workspace-preview-pane");
    const inspector = el("workspace-inspector");
    const toggleBtn = el("rib-edit-workspace");
    const bottom = el("preview-bottom-actions");
    const sidebar = document.querySelector("#workspace-main > aside");
    const active = state.editWorkspace && isEditingRoute();

    if (previewPane) previewPane.classList.toggle("hidden", active);
    if (inspector) inspector.classList.toggle("w-[min(100%,420px)]", !active);
    if (inspector) inspector.classList.toggle("w-full", active);
    if (toggleBtn) {
      toggleBtn.classList.toggle("hidden", !isEditingRoute());
      toggleBtn.textContent = active ? "Split view" : "Focus editor";
      toggleBtn.classList.toggle("bg-slate-700", active);
      toggleBtn.classList.toggle("text-white", active);
    }
    if (bottom) bottom.classList.toggle("hidden", !isEditingRoute());
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
      themeTokens: THEME_TOKENS,
      meta: options.meta && typeof options.meta === "object" ? options.meta : undefined
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
    const embedTool = pickToolConstructor("Embed", "EmbedTool", "Embedder", "EditorjsEmbed");

    if (headerTool) tools.header = headerTool;
    if (paragraphTool) tools.paragraph = paragraphTool;
    if (listTool) tools.list = listTool;
    if (codeTool) tools.code = codeTool;
    if (embedTool) tools.embed = embedTool;

    if (!tools.paragraph || !tools.header) {
      const keys = Object.keys(window || {}).filter((k) => /header|paragraph|editor|list|code|embed/i.test(k));
      console.warn("[admin-app] Editor.js tool globals partial match:", keys.slice(0, 40));
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
        const t = escHtml(d.text || "");
        out.push(
          `<div data-block-index="${i}" data-block-type="paragraph" data-preview-editable="1" class="preview-block mb-5 cursor-pointer rounded-md px-1 -mx-1 hover:bg-black/5 transition-colors"><p class="font-serif text-lg leading-8 text-gray-800">${t.replace(/\n/g, "<br/>")}</p></div>`
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
    if (!previewEl || !editorInstance) return;
    try {
      const data = await editorInstance.save();
      previewEl.textContent = JSON.stringify(data, null, 2);
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
      previewEl.textContent = String(e && e.message ? e.message : e);
    }
  }

  function scheduleEditorJsonPreview() {
    if (editorPreviewTimer) clearTimeout(editorPreviewTimer);
    editorPreviewTimer = setTimeout(() => updateEditorJsonPreviewNow(), 500);
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
    list.innerHTML = "";
    blocks.forEach((b, i) => {
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
    if (window.Sortable && !blockNavSortable) {
      blockNavSortable = Sortable.create(list, {
        animation: 150,
        onEnd: async (evt) => {
          if (!editorInstance?.blocks) return;
          const from = evt.oldIndex;
          const to = evt.newIndex;
          if (typeof from !== "number" || typeof to !== "number" || from === to) return;
          try {
            await editorInstance.blocks.move(to, from);
            await updateEditorJsonPreviewNow();
          } catch (_) {}
        }
      });
    }
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
    if (state.kind === "project") {
      return { target: "projects", slug: state.slug, mode: el("source-format")?.value || "record-json", language: "json" };
    }
    if (state.kind === "caseStudy") {
      return { target: "caseStudies", slug: state.slug, mode: el("source-format")?.value || "record-json", language: "json" };
    }
    if (state.kind === "projects-home") {
      if (state.homeTab === "titles") return { target: "homepageUi", slug: "", mode: "file", language: "json" };
      return { target: "homepage", slug: "", mode: "file", language: "json" };
    }
    if (state.kind === "settings") return { target: "siteTheme", slug: "", mode: "file", language: "json" };
    return null;
  }

  async function openSourceMode() {
    const req = currentSourceRequest();
    if (!req) {
      setStatus("Source mode is available for editable targets only.");
      return;
    }
    state.sourceMode = true;
    showPanels();
    await ensureMonaco();
    const holder = el("source-editor-holder");
    if (!holder) return;
    const data = await loadRawSource(req.target, req.slug, req.mode === "auto" ? "record-json" : req.mode);
    if (!data.ok) {
      setStatus(data.error || "Failed to load source.");
      return;
    }
    sourceDoc = { target: req.target, slug: req.slug, mode: data.mode || req.mode, language: data.language || req.language || "json" };
    if (!monacoEditor) {
      monacoEditor = window.monaco.editor.create(holder, {
        value: data.text || "",
        language: sourceDoc.language,
        theme: "vs-dark",
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 13
      });
    } else {
      const model = monacoEditor.getModel();
      if (model) window.monaco.editor.setModelLanguage(model, sourceDoc.language);
      monacoEditor.setValue(data.text || "");
    }
    setStatus(`Source loaded (${sourceDoc.mode}).`);
  }

  function closeSourceMode() {
    state.sourceMode = false;
    showPanels();
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
    const ribIns = el("rib-insert-group");
    const ribBlock = el("rib-block-group");
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
    if (ribIns) ribIns.classList.toggle("hidden", !((isHome && state.homeTab === "json") || isRecord));
    if (ribBlock) ribBlock.classList.toggle("hidden", !((isHome && state.homeTab === "json") || isRecord));
    if (sideLists) sideLists.classList.toggle("hidden", state.kind === "dashboard" || isEditingRoute());
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
  }

  async function applyRoute() {
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
    if (msg) msg.textContent = "Saved. Preview updated below.";
    setIframe(`${PAGES}homepage.html`.replace(/^\//, ""), true);
  }

  async function loadHomepageJsonEditor(source = "auto", ref = "") {
    setStatus("Loading homepage JSON…");
    const hint = el("home-auth-hint");
    const data = await loadContentRead("homepage", "", source, ref);
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
    await mountEditor("admin-editor-holder", data.editorData || getDefaultEditorData());
    updateRecordHtmlHint(data.editorData || getDefaultEditorData());
    setStatus("Loaded — Save draft, then Publish to live to update the public site.");
  }

  async function ribSave() {
    if (state.sourceMode) {
      if (!monacoEditor) {
        setStatus("Source editor not ready.");
        return;
      }
      const out = await saveRawSource(sourceDoc.target, sourceDoc.slug, sourceDoc.mode, monacoEditor.getValue());
      if (!out.ok) {
        setStatus(out.error || "Source save failed");
        return;
      }
      if (out.unchanged) {
        setStatus("No changes detected. Draft not updated.");
        return;
      }
      setBranchHint(out.branch || "");
      setStatus(`Saved source · ${out.branch || "draft"}`);
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
      if (!editorInstance) return;
      const d = await editorInstance.save();
      setStatus("Saving…");
      const out = await saveContentWrite("homepage", "", d);
      if (!out.ok) {
        setStatus(out.error || "Save failed");
        return;
      }
      if (out.unchanged) {
        setStatus("No changes detected. Draft not updated.");
        return;
      }
      setBranchHint(out.branch || "");
      setStatus(`Saved · ${out.branch || "draft"}`);
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
      if (!editorInstance) return;
      const d = await editorInstance.save();
      setStatus("Saving…");
      const out = await saveContentWrite(state.target, state.slug, d);
      if (!out.ok) {
        setStatus(out.error || "Save failed");
        return;
      }
      if (out.unchanged) {
        setStatus("No changes detected. Draft not updated.");
        return;
      }
      setBranchHint(out.branch || "");
      setStatus(`Saved · ${out.branch || "draft"}`);
    }
  }

  async function ribPreview() {
    if (state.sourceMode) {
      setStatus("Source mode preview: use Live page toggle.");
      return;
    }
    if ((state.kind === "projects-home" && state.homeTab === "json") || state.kind === "project" || state.kind === "caseStudy") {
      await updateEditorJsonPreviewNow();
      setCenterPreviewMode("draft");
      setStatus("Preview updated (not saved).");
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
      await loadThemeSettings();
    } catch (_) {
      setStatus("Dashboard stats failed to load.");
    }
  }

  function buildSidebarLists(projects, cases) {
    const pu = el("admin-sortable-projects");
    const cu = el("admin-sortable-cases");
    const mergedProjects = [...(localDraftRecords.projects || []), ...(projects || []).filter((p) => !localDraftRecords.projects.some((lp) => lp.id === p.id))];
    const mergedCases = [...(localDraftRecords.caseStudies || []), ...(cases || []).filter((c) => !localDraftRecords.caseStudies.some((lc) => lc.id === c.id))];
    const visibleProjects = state.compactListsOnSelect && state.kind === "project"
      ? (mergedProjects || []).filter((p) => p.id === state.slug)
      : (mergedProjects || []);
    const visibleCases = state.compactListsOnSelect && state.kind === "caseStudy"
      ? (mergedCases || []).filter((c) => c.id === state.slug)
      : (mergedCases || []);
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

    document.querySelectorAll(".rib-ins").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!editorInstance || !editorInstance.blocks) return;
        const type = btn.getAttribute("data-insert");
        const map = {
          paragraph: { type: "paragraph", data: { text: "" } },
          header: { type: "header", data: { text: "Heading", level: 2 } },
          list: { type: "list", data: { style: "unordered", items: ["Item"] } },
          code: { type: "code", data: { code: "" } },
          embed: { type: "embed", data: { service: "github", source: "https://github.com/", embed: "https://github.com/", width: 580, height: 320, caption: "" } }
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
  }

  function cleanSlug(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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

  async function createNewRecord(kind) {
    const s = await apiSession();
    if (!s.ok) {
      setStatus("Login first.");
      return;
    }
    const label = kind === "projects" ? "project" : "case study";
    const title = (window.prompt(`Title for your new ${label} (shown on the site):`) || "").trim();
    if (!title) return;
    const slugInput = (window.prompt(`URL slug (optional, e.g. my-analytics-project). Leave blank to derive from title:`) || "").trim();
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
    document.querySelectorAll('.nav-item[data-route="dashboard"]').forEach((b) => {
      b.addEventListener("click", () => {
        state.kind = "dashboard";
        state.slug = "";
        highlightNav();
        applyRoute();
      });
    });
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
  el("btn-new-project")?.addEventListener("click", () => createNewRecord("projects"));
  el("btn-new-case")?.addEventListener("click", () => createNewRecord("caseStudies"));

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
    if (!window.confirm("Publish site-theme.json draft to live?")) return;
    setStatus("Publishing…");
    const out = await apiPublish("siteTheme");
    setStatus(out.ok ? "Published theme to live." : out.error || "Publish failed");
    if (out.ok) refreshPreviewIframe();
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
    } else if (state.kind === "settings" || state.kind === "dashboard") {
      target = "siteTheme";
    }
    if (!target) {
      setStatus("Choose a supported page first.");
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
    refreshPreviewIframe();
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
    if (out.ok) refreshPreviewIframe();
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
    if (out.ok) refreshPreviewIframe();
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
      refreshPreviewIframe();
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
    const login = getSessionLogin(sess);
    updateSessionUi(sess);
    const ts = sess.serverTimeIst ? ` · IST ${sess.serverTimeIst}` : "";
    setStatus(sess.ok ? `Signed in · ${login || "ok"}${ts}` : `Not signed in — use Login to load drafts & save.${ts}`);
    const hint = el("home-auth-hint");
    if (hint && state.kind === "projects-home") {
      hint.classList.toggle("hidden", sess.ok);
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
