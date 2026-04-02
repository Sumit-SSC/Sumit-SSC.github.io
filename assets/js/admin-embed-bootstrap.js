/**
 * When ?admin_embed=1 (set by the admin workspace iframe), show a slim preview strip.
 * Safe on all portfolio pages; no-op without the param.
 */
(function () {
  try {
    const p = new URLSearchParams(window.location.search || "");
    if (p.get("admin_embed") !== "1") return;

    document.documentElement.style.setProperty("--admin-embed-strip-height", "38px");
    const strip = document.createElement("div");
    strip.id = "admin-embed-strip";
    strip.setAttribute("role", "status");
    strip.setAttribute(
      "style",
      [
        "position:fixed",
        "top:0",
        "left:0",
        "right:0",
        "z-index:2147483000",
        "height:var(--admin-embed-strip-height,38px)",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "gap:12px",
        "padding:0 12px",
        "font:12px/1.2 system-ui,Segoe UI,sans-serif",
        "background:linear-gradient(90deg,#0f172a,#1e1b4b)",
        "color:#e2e8f0",
        "border-bottom:1px solid rgba(148,163,184,.35)",
        "box-sizing:border-box"
      ].join(";")
    );
    strip.innerHTML =
      '<span style="opacity:.85">Live preview</span><span style="opacity:.55">·</span><span style="font-weight:600">Admin workspace</span>';

    const pad = strip.offsetHeight || 38;
    document.body.style.paddingTop = pad + "px";

    if (document.body) {
      document.body.insertBefore(strip, document.body.firstChild);
    } else {
      document.addEventListener("DOMContentLoaded", function once() {
        document.removeEventListener("DOMContentLoaded", once);
        document.body.style.paddingTop = pad + "px";
        document.body.insertBefore(strip, document.body.firstChild);
      });
    }
  } catch (_) {}
})();
