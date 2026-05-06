(function () {
  const API = "https://admin-api.sumit.indevs.in";
  const SITE = window.location.origin.replace(/\/$/, "");
  const LS_THEME = "new_editor_theme_v1";
  const LS_HEALTH = "new_editor_commit_health_v1";

  const $ = (id) => document.getElementById(id);
  const el = {
    status: $("status"),
    session: $("session-line"),
    theme: $("btn-theme"),
    unlock: $("btn-unlock"),
    login: $("btn-login"),
    logout: $("btn-logout"),
    gatePassword: $("gate-password"),
    target: $("target"),
    targetHelp: $("target-help"),
    shapeBanner: $("shape-banner"),
    previewSlug: $("preview-slug"),
    load: $("btn-load"),
    toggleDev: $("btn-toggle-dev"),
    devTools: $("dev-tools"),
    refreshPreviewBtn: $("btn-refresh-preview"),
    viewSmart: $("btn-view-smart"),
    viewSmart2: $("btn-view-smart-2"),
    viewJson: $("btn-view-json"),
    panelSmart: $("panel-smart"),
    panelBlocks: $("panel-blocks"),
    panelRecords: $("panel-records"),
    panelHomepageUi: $("panel-homepage-ui"),
    panelUnknown: $("panel-unknown"),
    blocksList: $("blocks-list"),
    recordSelect: $("record-select"),
    recordFields: $("record-fields"),
    homepageUiFields: $("homepage-ui-fields"),
    addParagraph: $("btn-add-paragraph"),
    addHeading: $("btn-add-heading"),
    addList: $("btn-add-list"),
    dupBlock: $("btn-dup-block"),
    delBlock: $("btn-del-block"),
    upBlock: $("btn-up-block"),
    downBlock: $("btn-down-block"),
    editor: $("json-editor"),
    save: $("btn-save"),
    savePublish: $("btn-save-publish"),
    publish: $("btn-publish"),
    openLive: $("btn-open-live"),
    autosave: $("autosave"),
    backupSelect: $("backup-select"),
    refreshBackups: $("btn-refresh-backups"),
    restore: $("btn-restore"),
    refreshCommits: $("btn-refresh-commits"),
    markAllHealthy: $("btn-mark-all-healthy"),
    commitList: $("commit-list"),
    preview: $("live-preview")
  };

  let autosaveTimer = null;
  let sessionOk = false;
  let selectedBlockIndex = -1;
  let dragFromIndex = -1;
  let devToolsVisible = false;
  /** @type {"blocks"|"records"|"homepageUi"|"unknown"} */
  let docShape = "unknown";

  function setStatus(msg) {
    if (el.status) el.status.textContent = msg || "";
  }

  function parseJsonSafe(text) {
    try {
      return { ok: true, value: JSON.parse(text || "{}") };
    } catch (e) {
      return { ok: false, error: e?.message || "Invalid JSON" };
    }
  }

  function stripHtml(html) {
    if (!html || typeof html !== "string") return "";
    const d = document.createElement("div");
    d.innerHTML = html;
    return (d.textContent || d.innerText || "").trim();
  }

  function resolveBlocksContainer(root) {
    if (root && root.editor_content && Array.isArray(root.editor_content.blocks)) {
      return { container: root.editor_content, key: "blocks" };
    }
    if (root && Array.isArray(root.blocks)) {
      return { container: root, key: "blocks" };
    }
    return null;
  }

  function detectShape(root, targetVal) {
    if (Array.isArray(root) && root.length && root[0] && typeof root[0] === "object" && root[0].id) {
      return "records";
    }
    if (resolveBlocksContainer(root)) return "blocks";
    if (targetVal === "homepageUi") return "homepageUi";
    if (root && typeof root === "object" && !Array.isArray(root) && ("featuredTitle" in root || "caseStudiesTitle" in root)) {
      return "homepageUi";
    }
    return "unknown";
  }

  function writeRootToEditor(root) {
    el.editor.value = JSON.stringify(root, null, 2);
  }

  function toggleDevTools(forceVisible) {
    devToolsVisible = typeof forceVisible === "boolean" ? forceVisible : !devToolsVisible;
    el.devTools?.classList.toggle("hidden", !devToolsVisible);
    if (el.toggleDev) el.toggleDev.textContent = devToolsVisible ? "Hide code tools" : "Show code tools";
  }

  function readBlocksFromEditor() {
    const parsed = parseJsonSafe(el.editor.value || "");
    if (!parsed.ok) return parsed;
    const ref = resolveBlocksContainer(parsed.value);
    if (!ref) return { ok: false, error: "No Editor.js blocks in this file." };
    return { ok: true, root: parsed.value, ref, blocks: ref.container[ref.key] };
  }

  function commitVisualEdit(mutator) {
    const out = readBlocksFromEditor();
    if (!out.ok) {
      setStatus(out.error);
      return false;
    }
    mutator(out.blocks, out.root);
    writeRootToEditor(out.root);
    return true;
  }

  function updateShapeUi() {
    const parsed = parseJsonSafe(el.editor.value || "{}");
    docShape = parsed.ok ? detectShape(parsed.value, el.target.value) : "unknown";

    const banner = el.shapeBanner;
    if (banner) {
      banner.classList.remove("hidden");
      const labels = {
        blocks: "Form mode: paragraph / heading / list blocks (homepage intro).",
        records: "Form mode: pick a project or case study row — edit fields without touching JSON.",
        homepageUi: "Form mode: featured section titles.",
        unknown: "Form mode unavailable — use Raw JSON."
      };
      banner.innerHTML = `<strong>${docShape}</strong> · ${labels[docShape]}`;
    }

    el.panelBlocks?.classList.toggle("hidden", docShape !== "blocks");
    el.panelRecords?.classList.toggle("hidden", docShape !== "records");
    el.panelHomepageUi?.classList.toggle("hidden", docShape !== "homepageUi");
    el.panelUnknown?.classList.toggle("hidden", docShape !== "unknown");

    if (docShape === "records") renderRecordsChrome(parsed.value);
    if (docShape === "homepageUi") renderHomepageUiChrome(parsed.value);
  }

  function renderRecordsChrome(arr) {
    if (!el.recordSelect || !Array.isArray(arr)) return;
    if (!arr.length) {
      el.recordSelect.innerHTML = "";
      if (el.recordFields) {
        el.recordFields.innerHTML = '<p class="sub">No records found in this file yet.</p>';
      }
      return;
    }
    const slug = (el.previewSlug?.value || "").trim();
    el.recordSelect.innerHTML = "";
    arr.forEach((rec, i) => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `${rec.id || "no-id"} — ${rec.title || "(untitled)"}`;
      el.recordSelect.appendChild(opt);
    });
    let pick = 0;
    if (slug) {
      const idx = arr.findIndex((r) => r && r.id === slug);
      if (idx >= 0) pick = idx;
    }
    el.recordSelect.value = String(pick);
    const row = arr[pick];
    if (row?.id && !slug) el.previewSlug.value = row.id;
    fillRecordForm(row);
    el.recordSelect.onchange = () => {
      const fresh = parseJsonSafe(el.editor.value || "");
      if (!fresh.ok || !Array.isArray(fresh.value)) return;
      const list = fresh.value;
      const i = Number(el.recordSelect.value);
      const sel = list[i];
      if (sel?.id) el.previewSlug.value = sel.id;
      fillRecordForm(sel);
      refreshPreview();
    };
  }

  function fieldTextarea(name, label, value, rows, mono) {
    const wrap = document.createElement("div");
    wrap.className = "field-group";
    const lab = document.createElement("label");
    lab.htmlFor = `rf-${name}`;
    lab.textContent = label;
    const ta = document.createElement("textarea");
    ta.id = `rf-${name}`;
    ta.dataset.field = name;
    ta.rows = rows || 3;
    if (mono) ta.classList.add("mono");
    ta.value = value ?? "";
    wrap.appendChild(lab);
    wrap.appendChild(ta);
    return wrap;
  }

  function fieldInput(name, label, value) {
    const wrap = document.createElement("div");
    wrap.className = "field-group";
    const lab = document.createElement("label");
    lab.htmlFor = `rf-${name}`;
    lab.textContent = label;
    const inp = document.createElement("input");
    inp.type = "text";
    inp.id = `rf-${name}`;
    inp.dataset.field = name;
    inp.value = value ?? "";
    wrap.appendChild(lab);
    wrap.appendChild(inp);
    return wrap;
  }

  function fieldCheckbox(name, label, checked) {
    const wrap = document.createElement("div");
    wrap.className = "checks field-group";
    const lab = document.createElement("label");
    const inp = document.createElement("input");
    inp.type = "checkbox";
    inp.id = `rf-${name}`;
    inp.dataset.field = name;
    inp.checked = !!checked;
    lab.appendChild(inp);
    lab.appendChild(document.createTextNode(label));
    wrap.appendChild(lab);
    return wrap;
  }

  function fillRecordForm(rec) {
    if (!el.recordFields) return;
    rec = rec || {};
    el.recordFields.innerHTML = "";
    const h = document.createElement("h2");
    h.textContent = el.target.value === "caseStudies" ? "Case study card" : "Project card";
    el.recordFields.appendChild(h);

    const isCase = el.target.value === "caseStudies";

    el.recordFields.appendChild(fieldInput("id", "Slug id (URL)", rec.id || ""));
    el.recordFields.appendChild(fieldInput("title", "Title", rec.title || ""));
    el.recordFields.appendChild(fieldTextarea("short_description", "Short description", rec.short_description || "", 4));
    el.recordFields.appendChild(fieldInput("category", "Category", rec.category || ""));
    el.recordFields.appendChild(fieldInput("date", "Year / date", rec.date || ""));
    el.recordFields.appendChild(fieldInput("thumbnail", "Thumbnail path", rec.thumbnail || ""));
    el.recordFields.appendChild(fieldTextarea("tools", "Tools (one per line)", Array.isArray(rec.tools) ? rec.tools.join("\n") : "", 4));

    if (isCase) {
      el.recordFields.appendChild(fieldInput("case_study_path", "Case study HTML path", rec.case_study_path || ""));
      el.recordFields.appendChild(fieldInput("tier", "Tier (e.g. featured)", rec.tier || ""));
      el.recordFields.appendChild(fieldInput("case_study_read_mins", "Read time (minutes)", String(rec.case_study_read_mins ?? "")));
      el.recordFields.appendChild(fieldTextarea("related_case_studies", "Related ids (one per line)", Array.isArray(rec.related_case_studies) ? rec.related_case_studies.join("\n") : "", 3, true));
    } else {
      el.recordFields.appendChild(fieldTextarea("full_description", "Full description (HTML)", rec.full_description || "", 8, true));
      el.recordFields.appendChild(fieldTextarea("problem_statement", "Problem (HTML)", rec.problem_statement || "", 6, true));
      el.recordFields.appendChild(fieldTextarea("approach", "Approach (HTML)", rec.approach || "", 6, true));
      el.recordFields.appendChild(fieldTextarea("insights", "Insights (HTML)", rec.insights || "", 5, true));
      el.recordFields.appendChild(fieldTextarea("media_notes", "Media notes (HTML)", rec.media_notes || "", 4, true));
      el.recordFields.appendChild(fieldTextarea("images", "Image paths (one per line)", Array.isArray(rec.images) ? rec.images.join("\n") : "", 4, true));
      el.recordFields.appendChild(fieldInput("content_path", "Content HTML path", rec.content_path || ""));
      el.recordFields.appendChild(fieldInput("github_url", "GitHub URL", rec.github_url || ""));
      el.recordFields.appendChild(fieldInput("streamlit_url", "Streamlit URL", rec.streamlit_url || ""));
      el.recordFields.appendChild(fieldInput("demo_url", "Demo URL", rec.demo_url || ""));
      el.recordFields.appendChild(fieldInput("video_url", "Video URL", rec.video_url || ""));
      el.recordFields.appendChild(fieldInput("notebook_url", "Notebook URL", rec.notebook_url || ""));
      el.recordFields.appendChild(fieldInput("powerbi_embed_url", "Power BI embed URL", rec.powerbi_embed_url || ""));
      el.recordFields.appendChild(fieldCheckbox("featured", "Featured", !!rec.featured));
      el.recordFields.appendChild(fieldCheckbox("show_apps_section", "Show apps section", rec.show_apps_section !== false));
    }

    el.recordFields.querySelectorAll("[data-field]").forEach((node) => {
      const ev = node.type === "checkbox" ? "change" : "input";
      node.addEventListener(ev, () => {
        syncRecordFormToJson();
        scheduleAutosave();
      });
    });
  }

  function syncRecordFormToJson() {
    const parsed = parseJsonSafe(el.editor.value || "");
    if (!parsed.ok || !Array.isArray(parsed.value)) return;
    const arr = parsed.value;
    const i = Number(el.recordSelect?.value);
    if (i < 0 || i >= arr.length) return;
    const rec = arr[i];
    if (!rec || typeof rec !== "object") return;
    const fields = el.recordFields?.querySelectorAll("[data-field]");
    if (!fields) return;

    const isCase = el.target.value === "caseStudies";

    fields.forEach((node) => {
      const name = node.dataset.field;
      if (!name) return;
      if (node.type === "checkbox") {
        rec[name] = !!node.checked;
        return;
      }
      const val = node.value;
      if (name === "tools") {
        rec.tools = val.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        return;
      }
      if (name === "images") {
        rec.images = val.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        return;
      }
      if (name === "related_case_studies") {
        rec.related_case_studies = val.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        return;
      }
      if (name === "case_study_read_mins") {
        const n = parseInt(val, 10);
        rec.case_study_read_mins = Number.isFinite(n) ? n : val;
        return;
      }
      rec[name] = val;
    });

    if (!isCase) {
      if (rec.show_apps_section === undefined) rec.show_apps_section = true;
    }

    writeRootToEditor(arr);
  }

  function renderHomepageUiChrome(root) {
    if (!el.homepageUiFields) return;
    el.homepageUiFields.innerHTML = "";
    const h = document.createElement("h2");
    h.textContent = "Homepage section titles";
    el.homepageUiFields.appendChild(h);

    const mk = (key, label) => {
      const wrap = document.createElement("div");
      wrap.className = "field-group";
      const lab = document.createElement("label");
      lab.htmlFor = `ui-${key}`;
      lab.textContent = label;
      const inp = document.createElement("input");
      inp.type = "text";
      inp.id = `ui-${key}`;
      inp.dataset.uiKey = key;
      inp.value = root[key] ?? "";
      wrap.appendChild(lab);
      wrap.appendChild(inp);
      inp.addEventListener("input", () => {
        syncHomepageUiToJson();
        scheduleAutosave();
      });
      return wrap;
    };

    el.homepageUiFields.appendChild(mk("featuredTitle", "Featured projects title"));
    el.homepageUiFields.appendChild(mk("caseStudiesTitle", "Case studies title"));
  }

  function syncHomepageUiToJson() {
    const parsed = parseJsonSafe(el.editor.value || "{}");
    if (!parsed.ok || Array.isArray(parsed.value)) return;
    const root = parsed.value;
    el.homepageUiFields?.querySelectorAll("[data-ui-key]").forEach((inp) => {
      const k = inp.dataset.uiKey;
      if (k) root[k] = inp.value;
    });
    writeRootToEditor(root);
  }

  function appendBlockEditor(bodyEl, kind, block, index) {
    const ta = document.createElement("textarea");
    ta.className = "block-editor-plain" + (kind === "raw" ? " mono" : "");
    ta.dataset.editKind = kind;
    ta.dataset.idx = String(index);
    if (kind === "paragraph" || kind === "header") {
      const raw = block?.data?.text ?? "";
      ta.value = stripHtml(String(raw));
      ta.rows = kind === "header" ? 2 : 4;
    } else if (kind === "list") {
      ta.value = Array.isArray(block?.data?.items) ? block.data.items.join("\n") : "";
      ta.rows = 5;
      ta.placeholder = "One bullet per line";
    } else {
      ta.value = JSON.stringify(block?.data || {}, null, 2);
      ta.rows = 8;
    }
    bodyEl.appendChild(ta);
    const apply = () => {
      commitVisualEdit((blocks) => {
        const b = blocks[index] || {};
        b.data = b.data || {};
        if (kind === "paragraph" || kind === "header") {
          b.data.text = ta.value;
          if (kind === "header" && (b.data.level === undefined || b.data.level < 1)) b.data.level = 2;
        } else if (kind === "list") {
          b.data.style = b.data.style || "unordered";
          b.data.items = String(ta.value || "")
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean);
        } else if (kind === "raw") {
          const p = parseJsonSafe(String(ta.value || "{}"));
          if (p.ok) b.data = p.value;
        }
      });
      scheduleAutosave();
    };
    ta.addEventListener("input", apply);
  }

  function renderVisualBlocks() {
    const out = readBlocksFromEditor();
    el.blocksList.innerHTML = "";
    if (!out.ok) {
      el.blocksList.innerHTML = `<p class="sub">${out.error}</p>`;
      selectedBlockIndex = -1;
      return;
    }
    if (!out.blocks.length) {
      el.blocksList.innerHTML = '<p class="sub">No blocks yet — use + Text / + Heading.</p>';
      selectedBlockIndex = -1;
      return;
    }

    out.blocks.forEach((block, idx) => {
      const type = String(block?.type || "").toLowerCase();
      const card = document.createElement("div");
      card.className = "block-card" + (idx === selectedBlockIndex ? " selected" : "");

      const top = document.createElement("div");
      top.className = "block-top";
      top.draggable = true;
      top.innerHTML = `<strong>#${idx + 1}</strong> <span>${block?.type || "?"}</span><span style="flex:1"></span><span style="opacity:.8">Drag to reorder</span>`;

      top.addEventListener("click", (e) => {
        e.preventDefault();
        selectedBlockIndex = idx;
        renderVisualBlocks();
      });

      top.addEventListener("dragstart", () => {
        dragFromIndex = idx;
      });
      top.addEventListener("dragover", (e) => e.preventDefault());
      top.addEventListener("drop", (e) => {
        e.preventDefault();
        if (dragFromIndex < 0 || dragFromIndex === idx) return;
        const ok = commitVisualEdit((blocks) => {
          const [moved] = blocks.splice(dragFromIndex, 1);
          blocks.splice(idx, 0, moved);
          selectedBlockIndex = idx;
          dragFromIndex = -1;
        });
        if (ok) renderVisualBlocks();
      });

      const body = document.createElement("div");
      body.className = "block-body";
      const editKind =
        type === "paragraph" || type === "header" ? type : type === "list" ? "list" : "raw";
      appendBlockEditor(body, editKind, block, idx);

      card.appendChild(top);
      card.appendChild(body);
      el.blocksList.appendChild(card);
    });
  }

  function setEditorView(mode) {
    const json = mode === "json";
    el.editor.classList.toggle("hidden", !json);
    el.panelSmart.classList.toggle("hidden", json);
    el.viewSmart?.classList.toggle("active", !json);
    el.viewSmart2?.classList.toggle("active", !json);
    el.viewJson?.classList.toggle("active", json);
    if (json) toggleDevTools(true);
    if (!json) {
      updateShapeUi();
      if (docShape === "blocks") renderVisualBlocks();
    }
  }

  async function loadPublicFileFallback(target) {
    const map = {
      homepage: "/data/homepage-content.json",
      homepageUi: "/data/homepage-ui.json",
      projects: "/data/projects.json",
      caseStudies: "/data/case_studies.json"
    };
    const filePath = map[target];
    if (!filePath) return null;
    try {
      const res = await fetch(SITE + filePath + "?_cb=" + Date.now(), { credentials: "omit" });
      if (!res.ok) return null;
      const text = await res.text();
      const parsed = parseJsonSafe(text);
      if (!parsed.ok) return null;
      return JSON.stringify(parsed.value, null, 2);
    } catch {
      return null;
    }
  }

  function updateTargetHelp() {
    const target = el.target.value;
    if (!el.targetHelp) return;
    const messages = {
      homepage: "Projects hub intro copy (blocks). Shown in preview with admin embed only unless you enable it on the public page.",
      homepageUi: "Titles for Featured / Case studies sections on the homepage.",
      projects: "Pick an entry, edit fields, set Preview page id to match, then Save + Publish.",
      caseStudies: "Pick a case study card (metadata). Long article HTML lives in the path shown — edit separately if needed."
    };
    el.targetHelp.textContent = messages[target] || "";
  }

  function buildLivePreviewUrl() {
    const target = el.target.value;
    const slug = (el.previewSlug?.value || "").trim();
    const path = target === "caseStudies"
      ? "/pages/case-study.html"
      : target === "projects"
        ? "/pages/project.html"
        : "/pages/homepage.html";
    const u = new URL(path, SITE + "/");
    if (target === "homepage") u.searchParams.set("admin_embed", "1");
    if ((target === "projects" || target === "caseStudies") && slug) u.searchParams.set("id", slug);
    u.searchParams.set("_cb", String(Date.now()));
    return u;
  }

  function refreshPreview() {
    el.preview.src = buildLivePreviewUrl().toString();
  }

  async function apiJson(path, opts = {}) {
    const res = await fetch(API + path, { credentials: "include", ...opts });
    const data = await res.json().catch(() => ({}));
    data._httpStatus = res.status;
    data._okHttp = res.ok;
    return data;
  }

  async function refreshSession() {
    const s = await apiJson("/api/admin/session");
    sessionOk = !!s.ok;
    el.session.textContent = s.ok
      ? `Signed in as ${typeof s.user === "string" ? s.user : (s.user?.login || "?")} (${s.role || "admin"})`
      : "Not signed in — unlock gate, then GitHub.";
    return s;
  }

  async function unlockGate() {
    const pwd = (el.gatePassword.value || "").trim();
    if (!pwd) return setStatus("Enter admin password.");
    const out = await apiJson("/api/admin/gate/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd })
    });
    setStatus(out.ok ? "Gate unlocked." : (out.error || "Unlock failed."));
    await refreshSession();
  }

  async function loadJsonFile() {
    const target = el.target.value;
    const q = new URLSearchParams({ target, mode: "file" });
    const out = await apiJson("/api/admin/content/raw?" + q.toString());
    if (!out.ok) {
      const fallback = await loadPublicFileFallback(target);
      if (!fallback) {
        setStatus((out.error || "Load failed") + " (unlock + login first, then Reload file)");
        return;
      }
      el.editor.value = fallback;
      selectedBlockIndex = -1;
      updateShapeUi();
      if (docShape === "blocks") renderVisualBlocks();
      setStatus("Loaded public file (read baseline). Unlock + GitHub login to save.");
      refreshPreview();
      return;
    }
    el.editor.value = out.text || "";
    selectedBlockIndex = -1;
    setStatus(`Loaded ${target}.`);
    updateShapeUi();
    if (docShape === "blocks") renderVisualBlocks();
    refreshPreview();
    await refreshBackups();
    await refreshCommits();
  }

  async function saveDraft() {
    if (docShape === "records") syncRecordFormToJson();
    if (docShape === "homepageUi") syncHomepageUiToJson();

    const target = el.target.value;
    const text = el.editor.value || "";
    const out = await apiJson("/api/admin/content/raw/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, mode: "file", text })
    });
    if (!out.ok) {
      setStatus(out.error || "Save failed");
      return false;
    }
    setStatus(out.unchanged ? "No file changes to commit." : "Draft saved on GitHub.");
    await refreshCommits();
    return true;
  }

  async function publishLive() {
    const target = el.target.value;
    const out = await apiJson("/api/admin/content/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target })
    });
    if (!out.ok) {
      setStatus(out.error || "Publish failed");
      return false;
    }
    setStatus("Published. Preview refreshed.");
    refreshPreview();
    await refreshBackups();
    await refreshCommits();
    return true;
  }

  async function saveAndPublish() {
    const saved = await saveDraft();
    if (!saved) return;
    await publishLive();
  }

  async function refreshBackups() {
    const target = el.target.value;
    const out = await apiJson("/api/admin/content/backups");
    el.backupSelect.innerHTML = "";
    if (!out.ok || !Array.isArray(out.backups)) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No backups";
      el.backupSelect.appendChild(opt);
      return;
    }
    const matches = out.backups.filter((b) => String(b.name || "").includes(`backup-${target}-`));
    if (!matches.length) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No backups for this file yet";
      el.backupSelect.appendChild(opt);
      return;
    }
    const ph = document.createElement("option");
    ph.value = "";
    ph.textContent = "Choose backup…";
    el.backupSelect.appendChild(ph);
    matches.forEach((b) => {
      const opt = document.createElement("option");
      opt.value = b.path;
      opt.textContent = b.name;
      el.backupSelect.appendChild(opt);
    });
  }

  async function restoreBackup() {
    const p = el.backupSelect.value;
    if (!p) return setStatus("Pick a backup.");
    if (!window.confirm("Restore this backup to live?")) return;
    const out = await apiJson("/api/admin/content/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backupPath: p })
    });
    if (!out.ok) return setStatus(out.error || "Restore failed");
    setStatus("Restored.");
    refreshPreview();
    await refreshCommits();
  }

  function renderCommits(data) {
    const map = readHealthMap();
    el.commitList.innerHTML = "";
    if (!data.ok || !Array.isArray(data.commits) || !data.commits.length) {
      el.commitList.innerHTML = '<div class="sub">No commits or not logged in.</div>';
      return;
    }
    data.commits.forEach((c) => {
      const row = document.createElement("div");
      row.className = "commit-item";
      const health = map[c.sha] || "";
      row.innerHTML = `
        <div><strong>${c.shortSha || String(c.sha || "").slice(0, 7)}</strong> · ${new Date(c.date || Date.now()).toLocaleString()}</div>
        <div class="sub" style="margin:6px 0;">${c.message || ""}</div>
        <div class="row" style="margin:0;">
          <button type="button" class="tiny" data-sha="${c.sha}" data-h="healthy">OK</button>
          <button type="button" class="tiny" data-sha="${c.sha}" data-h="broken">Bad</button>
          <button type="button" class="tiny" data-sha="${c.sha}" data-h="needs-edit">Edit</button>
          <span class="badge ${health === "healthy" ? "b-healthy" : health === "broken" ? "b-broken" : "b-needs"}">${health || "—"}</span>
        </div>
      `;
      row.querySelectorAll("button[data-sha]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const sha = btn.getAttribute("data-sha");
          const h = btn.getAttribute("data-h");
          const next = readHealthMap();
          next[sha] = h;
          writeHealthMap(next);
          renderCommits(data);
        });
      });
      el.commitList.appendChild(row);
    });
  }

  function readHealthMap() {
    try {
      const raw = localStorage.getItem(LS_HEALTH);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  function writeHealthMap(map) {
    try { localStorage.setItem(LS_HEALTH, JSON.stringify(map || {})); } catch {}
  }

  async function refreshCommits() {
    const target = el.target.value;
    const out = await apiJson("/api/admin/content/commits?" + new URLSearchParams({ target, per_page: "20" }).toString());
    renderCommits(out);
  }

  function scheduleAutosave() {
    if (!el.autosave.checked) return;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      if (sessionOk) saveDraft();
    }, 1600);
  }

  function addBlock(type) {
    const ok = commitVisualEdit((blocks) => {
      if (type === "paragraph") blocks.push({ type: "paragraph", data: { text: "" } });
      else if (type === "header") blocks.push({ type: "header", data: { text: "Heading", level: 2 } });
      else if (type === "list") blocks.push({ type: "list", data: { style: "unordered", items: ["First point"] } });
      selectedBlockIndex = blocks.length - 1;
    });
    if (ok) renderVisualBlocks();
    scheduleAutosave();
  }

  function duplicateSelectedBlock() {
    if (selectedBlockIndex < 0) return setStatus("Select a block (click its gray bar).");
    const ok = commitVisualEdit((blocks) => {
      const clone = JSON.parse(JSON.stringify(blocks[selectedBlockIndex]));
      blocks.splice(selectedBlockIndex + 1, 0, clone);
      selectedBlockIndex += 1;
    });
    if (ok) renderVisualBlocks();
  }

  function deleteSelectedBlock() {
    if (selectedBlockIndex < 0) return setStatus("Select a block first.");
    const ok = commitVisualEdit((blocks) => {
      blocks.splice(selectedBlockIndex, 1);
      selectedBlockIndex = Math.min(selectedBlockIndex, blocks.length - 1);
    });
    if (ok) renderVisualBlocks();
    scheduleAutosave();
  }

  function moveSelected(delta) {
    if (selectedBlockIndex < 0) return setStatus("Select a block first.");
    const out = readBlocksFromEditor();
    if (!out.ok) return;
    const to = selectedBlockIndex + delta;
    if (to < 0 || to >= out.blocks.length) return;
    commitVisualEdit((blocks) => {
      const [item] = blocks.splice(selectedBlockIndex, 1);
      blocks.splice(to, 0, item);
      selectedBlockIndex = to;
    });
    renderVisualBlocks();
    scheduleAutosave();
  }

  function getTheme() {
    try {
      return localStorage.getItem(LS_THEME) === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  }

  function setTheme(t) {
    try { localStorage.setItem(LS_THEME, t); } catch {}
    document.body.classList.toggle("theme-dark", t === "dark");
    document.body.classList.toggle("theme-light", t !== "dark");
    el.theme.textContent = t === "dark" ? "Light" : "Dark";
  }

  function wire() {
    el.theme.addEventListener("click", () => setTheme(getTheme() === "dark" ? "light" : "dark"));
    el.unlock.addEventListener("click", unlockGate);
    el.login.addEventListener("click", () => { window.location.href = API + "/api/admin/auth/github/start"; });
    el.logout.addEventListener("click", async () => {
      await apiJson("/api/admin/auth/logout");
      await refreshSession();
      setStatus("Logged out.");
    });
    el.load.addEventListener("click", loadJsonFile);
    el.refreshPreviewBtn?.addEventListener("click", refreshPreview);

    el.viewSmart?.addEventListener("click", () => setEditorView("smart"));
    el.viewSmart2?.addEventListener("click", () => setEditorView("smart"));
    el.viewJson?.addEventListener("click", () => setEditorView("json"));
    el.toggleDev?.addEventListener("click", () => toggleDevTools());

    el.addParagraph?.addEventListener("click", () => addBlock("paragraph"));
    el.addHeading?.addEventListener("click", () => addBlock("header"));
    el.addList?.addEventListener("click", () => addBlock("list"));
    el.dupBlock?.addEventListener("click", duplicateSelectedBlock);
    el.delBlock?.addEventListener("click", deleteSelectedBlock);
    el.upBlock?.addEventListener("click", () => moveSelected(-1));
    el.downBlock?.addEventListener("click", () => moveSelected(1));

    el.save.addEventListener("click", saveDraft);
    el.savePublish.addEventListener("click", saveAndPublish);
    el.publish.addEventListener("click", publishLive);
    el.openLive.addEventListener("click", () => window.open(buildLivePreviewUrl().toString(), "_blank", "noopener,noreferrer"));

    el.refreshBackups.addEventListener("click", refreshBackups);
    el.restore.addEventListener("click", restoreBackup);
    el.refreshCommits.addEventListener("click", refreshCommits);
    el.markAllHealthy.addEventListener("click", async () => {
      const target = el.target.value;
      const out = await apiJson("/api/admin/content/commits?" + new URLSearchParams({ target, per_page: "20" }).toString());
      if (!out.ok || !Array.isArray(out.commits)) return;
      const map = readHealthMap();
      out.commits.forEach((c) => { map[c.sha] = "healthy"; });
      writeHealthMap(map);
      renderCommits(out);
    });

    el.target.addEventListener("change", () => {
      updateTargetHelp();
      loadJsonFile();
    });
    el.previewSlug?.addEventListener("change", refreshPreview);

    el.editor.addEventListener("input", () => {
      updateShapeUi();
      if (docShape === "blocks") renderVisualBlocks();
      scheduleAutosave();
    });
  }

  async function boot() {
    setTheme(getTheme());
    wire();
    toggleDevTools(false);
    updateTargetHelp();
    setEditorView("smart");
    try {
      await refreshSession();
      await loadJsonFile();
      setStatus("Pick a file, edit in Visual editor, then Save + Publish.");
    } catch (e) {
      setStatus("Startup error: " + String(e?.message || e));
    }
  }

  boot().catch((e) => setStatus(String(e?.message || e)));
})();
