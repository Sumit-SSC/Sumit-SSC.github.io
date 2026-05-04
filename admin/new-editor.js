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
    load: $("btn-load"),
    editor: $("json-editor"),
    save: $("btn-save"),
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

  function setStatus(msg) {
    if (el.status) el.status.textContent = msg || "";
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

  function getTheme() {
    try {
      const t = localStorage.getItem(LS_THEME);
      return t === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  }

  function setTheme(t) {
    try { localStorage.setItem(LS_THEME, t); } catch {}
    document.body.classList.toggle("theme-dark", t === "dark");
    document.body.classList.toggle("theme-light", t !== "dark");
    if (el.theme) el.theme.textContent = t === "dark" ? "Light mode" : "Dark mode";
  }

  function livePathForTarget(target) {
    if (target === "caseStudies") return "/pages/case-study.html";
    if (target === "projects") return "/pages/project.html";
    return "/pages/homepage.html";
  }

  function refreshPreview() {
    const target = el.target.value;
    const u = new URL(livePathForTarget(target), SITE + "/");
    u.searchParams.set("_cb", String(Date.now()));
    el.preview.src = u.toString();
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
      ? `Session: signed in as ${typeof s.user === "string" ? s.user : (s.user?.login || "unknown")} (${s.role || "admin"})`
      : "Session: not signed in";
    return s;
  }

  async function unlockGate() {
    const pwd = (el.gatePassword.value || "").trim();
    if (!pwd) {
      setStatus("Enter admin password first.");
      return;
    }
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
      setStatus(out.error || "Load failed");
      return;
    }
    el.editor.value = out.text || "";
    setStatus(`Loaded ${target} JSON. Edit and Save draft.`);
    refreshPreview();
    await refreshBackups();
    await refreshCommits();
  }

  async function saveDraft() {
    const target = el.target.value;
    const text = el.editor.value || "";
    const out = await apiJson("/api/admin/content/raw/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target, mode: "file", text })
    });
    if (!out.ok) {
      setStatus(out.error || "Save failed");
      return;
    }
    setStatus(out.unchanged ? "No changes to save." : "Draft saved to GitHub.");
    await refreshCommits();
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
      return;
    }
    setStatus("Published live. Backups captured.");
    refreshPreview();
    await refreshBackups();
    await refreshCommits();
  }

  async function refreshBackups() {
    const target = el.target.value;
    const out = await apiJson("/api/admin/content/backups");
    el.backupSelect.innerHTML = "";
    if (!out.ok || !Array.isArray(out.backups)) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No backups available";
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
    ph.textContent = "Pick a backup";
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
    if (!p) {
      setStatus("Pick a backup first.");
      return;
    }
    if (!window.confirm("Restore selected backup to live branch now?")) return;
    const out = await apiJson("/api/admin/content/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backupPath: p })
    });
    if (!out.ok) {
      setStatus(out.error || "Restore failed");
      return;
    }
    setStatus("Backup restored to live.");
    refreshPreview();
    await refreshCommits();
  }

  function renderCommits(data) {
    const map = readHealthMap();
    el.commitList.innerHTML = "";
    if (!data.ok || !Array.isArray(data.commits) || !data.commits.length) {
      el.commitList.innerHTML = '<div class="small">No commits yet (or not logged in).</div>';
      return;
    }
    data.commits.forEach((c) => {
      const row = document.createElement("div");
      row.className = "commit-item";
      const health = map[c.sha] || "";
      row.innerHTML = `
        <div><strong>${c.shortSha || String(c.sha || "").slice(0, 7)}</strong> · ${new Date(c.date || Date.now()).toLocaleString()}</div>
        <div class="small" style="margin:4px 0 8px;">${c.message || "(no message)"}</div>
        <div class="row" style="margin:0;">
          <button type="button" data-sha="${c.sha}" data-h="healthy">Healthy</button>
          <button type="button" data-sha="${c.sha}" data-h="broken">Broken</button>
          <button type="button" data-sha="${c.sha}" data-h="needs-edit">Needs edit</button>
          <span class="badge ${health === "healthy" ? "b-healthy" : health === "broken" ? "b-broken" : "b-needs"}">${health || "unmarked"}</span>
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
    }, 1500);
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
    el.save.addEventListener("click", saveDraft);
    el.publish.addEventListener("click", publishLive);
    el.openLive.addEventListener("click", () => {
      const u = new URL(livePathForTarget(el.target.value), SITE + "/");
      u.searchParams.set("_cb", String(Date.now()));
      window.open(u.toString(), "_blank", "noopener,noreferrer");
    });
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
      setStatus("Marked all listed commits as healthy.");
    });
    el.target.addEventListener("change", () => {
      loadJsonFile();
    });
    el.editor.addEventListener("input", scheduleAutosave);
  }

  async function boot() {
    setTheme(getTheme());
    wire();
    await refreshSession();
    await loadJsonFile();
    setStatus("Ready. Edit JSON, Save draft, Publish.");
  }

  boot().catch((e) => setStatus(String(e && e.message ? e.message : e)));
})();
