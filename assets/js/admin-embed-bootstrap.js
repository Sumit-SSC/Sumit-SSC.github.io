/**
 * When ?admin_embed=1 (set by the admin workspace iframe), show a slim preview strip
 * and enable in-context inline editing (Medium/MS Word style).
 * Safe on all portfolio pages; no-op without the param.
 */
(function () {
  try {
    const urlParams = new URLSearchParams(window.location.search || "");
    if (urlParams.get("admin_embed") !== "1") return;

    // 1. Inject Styles
    const style = document.createElement("style");
    style.textContent = `
      [data-inline-editable="true"] {
        position: relative !important;
        outline: 1.5px dashed rgba(61, 184, 184, 0.5) !important;
        transition: outline 0.15s ease-in-out, background 0.15s ease-in-out !important;
      }
      [data-inline-editable="true"]:hover {
        outline: 2.5px dashed rgba(61, 184, 184, 0.9) !important;
        background: rgba(61, 184, 184, 0.04) !important;
        cursor: text !important;
      }
      [data-inline-editable="true"]:focus {
        outline: 2.5px solid #3db8b8 !important;
        background: rgba(61, 184, 184, 0.08) !important;
        box-shadow: 0 0 12px rgba(61, 184, 184, 0.25) !important;
      }
      /* Reorder controls positioning */
      .admin-card-container {
        position: relative !important;
      }
      .admin-reorder-overlay {
        position: absolute !important;
        top: 8px !important;
        right: 8px !important;
        display: flex !important;
        gap: 4px !important;
        z-index: 99999 !important;
        background: rgba(15, 23, 42, 0.85) !important;
        border: 1px solid rgba(255, 255, 255, 0.2) !important;
        padding: 4px !important;
        border-radius: 6px !important;
        opacity: 0 !important;
        transition: opacity 0.2s ease-in-out !important;
      }
      .project-card-modern:hover .admin-reorder-overlay,
      .featured-split-card:hover .admin-reorder-overlay,
      .featured-hero-row:hover .admin-reorder-overlay,
      .featured-split-row:hover .admin-reorder-overlay {
        opacity: 1 !important;
      }
      .admin-reorder-btn {
        background: #1e293b !important;
        color: #f8fafc !important;
        border: 1px solid #475569 !important;
        border-radius: 4px !important;
        width: 24px !important;
        height: 24px !important;
        font-size: 12px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        padding: 0 !important;
        margin: 0 !important;
        font-weight: bold !important;
        transition: background 0.15s !important;
      }
      .admin-reorder-btn:hover {
        background: #3db8b8 !important;
        color: #0f172a !important;
      }
    `;
    document.head.appendChild(style);

    // 2. Add visual Admin Workspace strip
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
      '<span style="opacity:.85">Live preview</span><span style="opacity:.55">·</span><span style="font-weight:600">Admin workspace (Click text blocks directly to edit inline)</span>';

    const pad = 38;
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

    // 3. Enable inline editing & message pass-through
    const pathname = window.location.pathname;

    function sendUpdateMessage(type, elementId, content, slug = null) {
      window.parent.postMessage({
        type: "inline-edit",
        pagePath: pathname,
        slug: slug || urlParams.get("id"),
        elementId: elementId,
        html: content
      }, "*");
    }

    // Setup contenteditable listeners
    function bindEditableRegion(element, elementId, slug = null) {
      if (element.getAttribute("data-inline-editable") === "true") return;
      element.setAttribute("data-inline-editable", "true");
      element.setAttribute("contenteditable", "true");
      element.setAttribute("spellcheck", "false");

      let saveTimer = null;
      element.addEventListener("input", () => {
        clearTimeout(saveTimer);
        // Debounce sending updates to parent shell (500ms) to avoid lagging
        saveTimer = setTimeout(() => {
          sendUpdateMessage("edit", elementId, element.innerHTML, slug);
        }, 500);
      });
    }

    // A. Static pages: About & Resume
    if (pathname.includes("/about.html")) {
      const sections = document.querySelectorAll(".about-section .content");
      sections.forEach((sec, idx) => {
        // Edit each main section paragraph block individually to respect template formatting
        const paragraphs = sec.querySelectorAll("p, h2, h3");
        paragraphs.forEach((p, pIdx) => {
          bindEditableRegion(p, `about-section-${idx}-p-${pIdx}`);
        });
      });
    } else if (pathname.includes("/resume.html")) {
      // Allow editing section headers & descriptions on the resume
      const headers = document.querySelectorAll("h2, h3, p:not(embed p)");
      headers.forEach((h, idx) => {
        bindEditableRegion(h, `resume-text-${idx}`);
      });
    }

    // B. Project / Case Study detail pages
    if (pathname.includes("/project.html") || pathname.includes("/case-study.html")) {
      const containerId = "project-main";
      const observer = new MutationObserver(() => {
        const root = document.getElementById(containerId);
        if (!root) return;

        // Dynamic HTML sections injected into #project-main
        const sections = root.querySelectorAll("section[id]");
        sections.forEach((sec) => {
          bindEditableRegion(sec, sec.id);
        });
      });

      const targetNode = document.getElementById(containerId) || document.body;
      observer.observe(targetNode, { childList: true, subtree: true });
    }

    // C. Homepage card reordering
    if (pathname.includes("/homepage.html")) {
      // Poller to find loaded cards dynamically
      setInterval(() => {
        const cards = document.querySelectorAll(".project-card-modern, .featured-hero-row > div, .featured-split-card > div");
        cards.forEach((card) => {
          if (card.querySelector(".admin-reorder-overlay") || card.classList.contains("admin-card-container")) return;
          card.classList.add("admin-card-container");

          // Extract project/case study ID from details link
          const link = card.querySelector("a[href*='?id=']");
          if (!link) return;

          const match = link.href.match(/[?&]id=([^&#]+)/);
          if (!match) return;
          const itemId = match[1];
          const isCaseStudy = link.href.includes("case-study.html");

          // Inject overlay buttons
          const overlay = document.createElement("div");
          overlay.className = "admin-reorder-overlay";

          const btnUp = document.createElement("button");
          btnUp.type = "button";
          btnUp.className = "admin-reorder-btn";
          btnUp.innerHTML = "↑";
          btnUp.title = "Move Up";
          btnUp.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.parent.postMessage({
              type: "reorder-item",
              target: isCaseStudy ? "caseStudies" : "projects",
              id: itemId,
              direction: "up"
            }, "*");
          };

          const btnDown = document.createElement("button");
          btnDown.type = "button";
          btnDown.className = "admin-reorder-btn";
          btnDown.innerHTML = "↓";
          btnDown.title = "Move Down";
          btnDown.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.parent.postMessage({
              type: "reorder-item",
              target: isCaseStudy ? "caseStudies" : "projects",
              id: itemId,
              direction: "down"
            }, "*");
          };

          overlay.appendChild(btnUp);
          overlay.appendChild(btnDown);
          card.appendChild(overlay);
        });
      }, 800);
    }

  } catch (e) {
    console.error("Error in admin bootstrap:", e);
  }
})();
