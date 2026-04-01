const ADMIN_API_BASE = (window.__ADMIN_CONFIG__ && window.__ADMIN_CONFIG__.apiBase)
  ? window.__ADMIN_CONFIG__.apiBase
  : "https://portfolio-admin-api.YOUR_SUBDOMAIN.workers.dev";

const THEME_TOKENS = {
  textSize: ["sm", "base", "lg", "xl"],
  textColor: ["default", "muted", "primary", "accent"],
  align: ["left", "center", "right"],
  imagePreset: ["thumbnail", "banner", "hero", "inline"]
};

let selectedTarget = "homepage";
let editorInstance = null;

function getDefaultEditorData() {
  return {
    time: Date.now(),
    blocks: [
      { type: "header", data: { text: "Start editing your content", level: 2 } },
      { type: "paragraph", data: { text: "Use this as your secure content editing workspace." } }
    ],
    version: "2.30.7"
  };
}

function sanitizeEditorPayload(editorData) {
  const allowedTypes = new Set(["paragraph", "header", "list", "code"]);
  const blocks = (editorData.blocks || [])
    .filter((block) => allowedTypes.has(block.type))
    .map((block) => ({ type: block.type, data: block.data || {} }));

  return {
    schemaVersion: 1,
    target: selectedTarget,
    content: {
      ...editorData,
      blocks
    }
  };
}

async function renderPreview() {
  const preview = document.getElementById("payloadPreview");
  if (!editorInstance) return;
  const data = await editorInstance.save();
  const payload = sanitizeEditorPayload(data);
  preview.textContent = JSON.stringify(payload, null, 2);
}

async function initEditor() {
  editorInstance = new EditorJS({
    holder: "editorHolder",
    data: getDefaultEditorData(),
    tools: {
      header: Header,
      list: EditorjsList,
      code: CodeTool
    },
    onChange: async () => {
      await renderPreview();
    }
  });
  await renderPreview();
}

function bindTargetButtons() {
  const buttons = document.querySelectorAll(".content-target");
  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      selectedTarget = btn.dataset.target || "homepage";
      await renderPreview();
    });
  });
}

async function checkSession() {
  const res = await fetch(`${ADMIN_API_BASE}/api/admin/session`, {
    credentials: "include"
  });
  const data = await res.json();
  alert(data.ok ? `Session active for ${data.user || "editor"}` : "No active session");
}

function startGithubLogin() {
  window.location.href = `${ADMIN_API_BASE}/api/admin/auth/github/start`;
}

async function loadContent() {
  const slug = document.getElementById("slugInput").value.trim();
  const url = `${ADMIN_API_BASE}/api/admin/content/read?target=${encodeURIComponent(selectedTarget)}&slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json();
  if (!data.ok) {
    alert(data.error || "Unable to load content");
    return;
  }

  await editorInstance.render(data.editorData || getDefaultEditorData());
  await renderPreview();
}

async function saveContent() {
  const slug = document.getElementById("slugInput").value.trim();
  const editorData = await editorInstance.save();
  const payload = sanitizeEditorPayload(editorData);
  payload.slug = slug;
  payload.themeTokens = THEME_TOKENS;

  const res = await fetch(`${ADMIN_API_BASE}/api/admin/content/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data.ok) {
    alert(data.error || "Save failed");
    return;
  }

  alert(`Saved on branch: ${data.branch || "content/drafts"}`);
}

window.addEventListener("DOMContentLoaded", async () => {
  bindTargetButtons();
  document.getElementById("btnLogin").addEventListener("click", startGithubLogin);
  document.getElementById("btnSession").addEventListener("click", checkSession);
  document.getElementById("btnLoad").addEventListener("click", loadContent);
  document.getElementById("btnSave").addEventListener("click", saveContent);

  await initEditor();
});
