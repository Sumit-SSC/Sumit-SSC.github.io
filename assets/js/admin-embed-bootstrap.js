/**
 * Portfolio visual inline editor (admin-embed-bootstrap.js).
 * Consolidates all Notion/Medium-style inline text editing, block reordering/deletion,
 * homepage card reordering, debounced background saving, and publishing controls.
 * Safe on all portfolio pages; active only when authenticated or ?admin_edit=1 is set.
 */
(function () {
  "use strict";

  var API_BASE = "https://admin-api.sumit.indevs.in";
  var urlParams = new URLSearchParams(window.location.search || "");
  var isAdminEdit = urlParams.get("admin_edit") === "1" || urlParams.get("admin_embed") === "1";

  // Check if we should initialize
  if (!isAdminEdit) {
    // Check if the user is already logged in by checking the session endpoint
    fetch(API_BASE + "/api/admin/session", { credentials: "include" })
      .then(r => r.json())
      .then(s => {
        if (s && s.ok) {
          // If logged in, reload the page with ?admin_edit=1 to start editing
          var url = new URL(window.location.href);
          url.searchParams.set("admin_edit", "1");
          window.location.href = url.toString();
        }
      }).catch(() => {});
    return;
  }

  // 1. Inject Styles
  var style = document.createElement("style");
  style.textContent = `
    /* Admin Top Toolbar */
    #admin-top-toolbar {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      height: 48px !important;
      z-index: 2147483647 !important;
      background: #0f172a !important;
      border-bottom: 1px solid #1e293b !important;
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      padding: 0 16px !important;
      color: #f8fafc !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
      box-sizing: border-box !important;
    }
    body.admin-editing-active {
      padding-top: 48px !important;
    }
    .toolbar-group {
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
    }
    .toolbar-group.center {
      font-size: 13px !important;
      color: #94a3b8 !important;
      font-weight: 500 !important;
    }
    #admin-status-text {
      transition: color 0.2s !important;
    }
    .session-label {
      font-size: 12px !important;
      color: #94a3b8 !important;
      margin-right: 8px !important;
    }
    .toolbar-divider {
      width: 1px !important;
      height: 20px !important;
      background: #334155 !important;
      margin: 0 4px !important;
    }
    .admin-select {
      background: #1e293b !important;
      color: #f8fafc !important;
      border: 1px solid #475569 !important;
      border-radius: 4px !important;
      padding: 4px 8px !important;
      font-size: 12px !important;
      font-family: inherit !important;
      outline: none !important;
      cursor: pointer !important;
    }
    .admin-toolbar-btn {
      background: transparent !important;
      color: #94a3b8 !important;
      border: none !important;
      border-radius: 4px !important;
      width: 28px !important;
      height: 28px !important;
      font-size: 13px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      padding: 0 !important;
      margin: 0 !important;
      font-family: inherit !important;
      transition: background 0.15s, color 0.15s !important;
    }
    .admin-toolbar-btn:hover {
      background: #1e293b !important;
      color: #f8fafc !important;
    }
    .admin-toolbar-btn.is-active {
      background: #3db8b8 !important;
      color: #0f172a !important;
      font-weight: bold !important;
    }
    .admin-toolbar-btn.delete:hover {
      background: #ef4444 !important;
      color: #ffffff !important;
    }
    .admin-action-btn {
      background: #3db8b8 !important;
      color: #0f172a !important;
      border: none !important;
      padding: 6px 12px !important;
      border-radius: 4px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: background 0.2s, transform 0.1s !important;
    }
    .admin-action-btn:hover {
      background: #2ea0a0 !important;
    }
    .admin-action-btn:active {
      transform: scale(0.98) !important;
    }
    .admin-action-btn.secondary {
      background: #334155 !important;
      color: #f8fafc !important;
    }
    .admin-action-btn.secondary:hover {
      background: #475569 !important;
    }

    /* Inline Editable Elements */
    [data-inline-editable="true"] {
      position: relative !important;
      outline: 1.5px dashed rgba(61, 184, 184, 0.4) !important;
      transition: outline 0.15s ease-in-out, background 0.15s ease-in-out !important;
    }
    [data-inline-editable="true"]:hover {
      outline: 2.5px dashed rgba(61, 184, 184, 0.8) !important;
      background: rgba(61, 184, 184, 0.04) !important;
    }
    [data-inline-editable="true"]:focus {
      outline: 2.5px solid #3db8b8 !important;
      background: rgba(61, 184, 184, 0.08) !important;
      box-shadow: 0 0 12px rgba(61, 184, 184, 0.25) !important;
    }

    /* Homepage Cards Reordering Overlays */
    .admin-card-container {
      position: relative !important;
    }
    .admin-reorder-overlay {
      position: absolute !important;
      top: 8px !important;
      right: 8px !important;
      display: flex !important;
      gap: 4px !important;
      z-index: 10000 !important;
      background: rgba(15, 23, 42, 0.85) !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
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

  // 2. Create Top Toolbar Element (Google Docs Style)
  var toolbar = document.createElement("div");
  toolbar.id = "admin-top-toolbar";
  toolbar.style.display = "none"; // Visible only after auth verification
  toolbar.innerHTML = `
    <!-- Left Group: Formatting and Block Actions -->
    <div class="toolbar-group left">
      <select id="admin-block-select" class="admin-select" title="Change Block Format">
        <option value="">Format...</option>
        <option value="p">Paragraph</option>
        <option value="h2">Heading 2</option>
        <option value="h3">Heading 3</option>
      </select>
      <div class="toolbar-divider"></div>
      <button type="button" class="admin-toolbar-btn bold" title="Bold">B</button>
      <button type="button" class="admin-toolbar-btn italic" title="Italic">I</button>
      <button type="button" class="admin-toolbar-btn underline" title="Underline">U</button>
      <button type="button" class="admin-toolbar-btn link" title="Insert Link">🔗</button>
      <button type="button" class="admin-toolbar-btn unlink" title="Remove Link">⌧</button>
      <div class="toolbar-divider"></div>
      <button type="button" class="admin-toolbar-btn move-up" title="Move Block Up">↑</button>
      <button type="button" class="admin-toolbar-btn move-down" title="Move Block Down">↓</button>
      <button type="button" class="admin-toolbar-btn insert" title="Insert Paragraph Below">+</button>
      <button type="button" class="admin-toolbar-btn delete" title="Delete Block">🗑️</button>
    </div>

    <!-- Center Group: Cloud saving indicator -->
    <div class="toolbar-group center">
      <span class="status-icon">☁️</span>
      <span id="admin-status-text">Idle</span>
    </div>

    <!-- Right Group: Sessions and Actions -->
    <div class="toolbar-group right">
      <span id="admin-session-user" class="session-label">Checking...</span>
      <button type="button" id="admin-publish-btn" class="admin-action-btn" style="display:none;">Publish Live</button>
      <button type="button" id="admin-exit-btn" class="admin-action-btn secondary">Exit Editor</button>
    </div>
  `;
  document.body.appendChild(toolbar);

  // 4. API Request Helper
  function apiJson(endpoint, options) {
    options = options || {};
    options.credentials = "include";
    if (options.body && typeof options.body === "object") {
      options.body = JSON.stringify(options.body);
      options.headers = options.headers || {};
      options.headers["Content-Type"] = "application/json";
    }
    return fetch(API_BASE + endpoint, options)
      .then(function (r) {
        return r.json().catch(function () { return { ok: false, error: "JSON Parse Error" }; });
      })
      .catch(function (e) {
        return { ok: false, error: String(e.message || e) };
      });
  }

  // 5. Update Status Dashboard UI
  var sessionVal = document.getElementById("admin-session-user");
  var statusVal = document.getElementById("admin-status-text");
  var publishBtn = document.getElementById("admin-publish-btn");

  function setDockStatus(status, typeClass) {
    if (!statusVal) return;
    statusVal.textContent = status;
    statusVal.className = "status-val " + (typeClass || "");
  }

  // 6. Check Auth Session
  var isAuthenticated = false;
  apiJson("/api/admin/session")
    .then(function (s) {
      if (s && s.ok) {
        isAuthenticated = true;
        if (sessionVal) sessionVal.textContent = "Admin: " + (s.user || "Sumit");
        if (publishBtn) publishBtn.style.display = "block";
        toolbar.style.display = "flex";
        document.body.classList.add("admin-editing-active");
        initializeEditor();
      } else {
        if (sessionVal) {
          sessionVal.textContent = "Locked";
          sessionVal.className = "status-val error";
        }
        setDockStatus("Offline (Log in at /admin)", "error");
      }
    })
    .catch(function () {
      if (sessionVal) sessionVal.textContent = "Offline";
      setDockStatus("Connection Error", "error");
    });

  // 7. Visual Inline Editing Core
  var activeElement = null;
  var pathname = window.location.pathname;
  var targetPageType = "unknown";
  var pageSlug = urlParams.get("id") || "";

  if (pathname.includes("/about.html")) targetPageType = "about";
  else if (pathname.includes("/resume.html")) targetPageType = "resume";
  else if (pathname.includes("/project.html")) targetPageType = "projects";
  else if (pathname.includes("/case-study.html")) targetPageType = "caseStudies";
  else if (pathname.includes("/contact.html")) targetPageType = "contact";
  else if (pathname.includes("/playground.html")) targetPageType = "playground";
  else if (pathname.endsWith("/") || pathname.includes("/index.html")) targetPageType = "index";
  else if (pathname.includes("/homepage.html")) targetPageType = "homepage";

  // Check caret position style states to update toolbar buttons highlighting
  function updateToolbarStates() {
    if (!activeElement) return;

    var toolbarNode = document.getElementById("admin-top-toolbar");
    if (!toolbarNode) return;

    // 1. Text commands state checks
    var commands = ["bold", "italic", "underline"];
    commands.forEach(function (cmd) {
      var btn = toolbarNode.querySelector("." + cmd);
      if (!btn) return;
      var isActive = false;
      try {
        isActive = document.queryCommandState(cmd);
      } catch (err) {}
      btn.classList.toggle("is-active", isActive);
    });

    // 2. Link active state check (check if selection has an anchor parent)
    var btnLink = toolbarNode.querySelector(".link");
    if (btnLink) {
      var isLink = false;
      try {
        var sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          var node = sel.getRangeAt(0).commonAncestorContainer;
          if (node.nodeType === 3) node = node.parentNode;
          isLink = !!node.closest("a");
        }
      } catch (err) {}
      btnLink.classList.toggle("is-active", isLink);
    }

    // 3. Update element tag select dropdown
    var select = document.getElementById("admin-block-select");
    if (select) {
      var tag = activeElement.tagName.toLowerCase();
      if (tag === "h2" || tag === "h3" || tag === "p") {
        select.value = tag;
      } else {
        select.value = "";
      }
    }
  }

  function changeBlockTag(el, nextTag) {
    if (!el || !nextTag) return;
    var currentTag = el.tagName.toLowerCase();
    if (currentTag === nextTag) return;

    var newEl = document.createElement(nextTag);
    newEl.innerHTML = el.innerHTML;

    // Copy attributes
    for (var i = 0; i < el.attributes.length; i++) {
      var attr = el.attributes[i];
      if (attr.name !== "contenteditable" && attr.name !== "data-inline-editable") {
        newEl.setAttribute(attr.name, attr.value);
      }
    }

    el.parentNode.replaceChild(newEl, el);
    bindEditableRegion(newEl, newEl.id || "block-" + Date.now());
    activeElement = newEl;
    newEl.focus();
    updateToolbarStates();
    triggerFullContainerSave();
  }

  function initializeEditor() {
    var toolbarNode = document.getElementById("admin-top-toolbar");
    if (!toolbarNode) return;

    // Exit edit mode button
    document.getElementById("admin-exit-btn").addEventListener("click", function () {
      var url = new URL(window.location.href);
      url.searchParams.delete("admin_edit");
      url.searchParams.delete("admin_embed");
      window.location.href = url.toString();
    });

    // Publish live button
    document.getElementById("admin-publish-btn").addEventListener("click", async function () {
      if (!confirm("Are you sure you want to publish all saved draft commits to your live site?")) return;
      setDockStatus("Publishing...", "saving");
      var out = await apiJson("/api/admin/content/publish", {
        method: "POST",
        body: { target: "projects" }
      });
      if (out.ok) {
        setDockStatus("Published!", "saved");
        alert("Success! Your static site is building on GitHub Pages.");
      } else {
        setDockStatus("Publish failed: " + (out.error || "unknown"), "error");
      }
    });

    // Setup Top Toolbar formatting commands via mousedown (with preventDefault to maintain caret focus)
    var bindings = [
      { selector: ".bold", command: "bold" },
      { selector: ".italic", command: "italic" },
      { selector: ".underline", command: "underline" },
      { selector: ".unlink", command: "unlink" }
    ];

    bindings.forEach(function (b) {
      var btn = toolbarNode.querySelector(b.selector);
      if (btn) {
        btn.addEventListener("mousedown", function (e) {
          e.preventDefault();
          if (!activeElement) return;
          document.execCommand(b.command);
          updateToolbarStates();
        });
      }
    });

    // Custom Link action handler
    var btnLink = toolbarNode.querySelector(".link");
    if (btnLink) {
      btnLink.addEventListener("mousedown", function (e) {
        e.preventDefault();
        if (!activeElement) return;
        var url = prompt("Enter URL link:");
        if (url) {
          document.execCommand("createLink", false, url);
          updateToolbarStates();
        }
      });
    }

    // Dropdown change handler for Block format type
    var select = document.getElementById("admin-block-select");
    if (select) {
      select.addEventListener("change", function () {
        if (!activeElement) return;
        changeBlockTag(activeElement, select.value);
      });
    }

    // Bind block actions
    toolbarNode.querySelector(".move-up").onclick = function (e) { e.preventDefault(); moveActiveBlock(-1); };
    toolbarNode.querySelector(".move-down").onclick = function (e) { e.preventDefault(); moveActiveBlock(1); };
    toolbarNode.querySelector(".insert").onclick = function (e) { e.preventDefault(); insertActiveBlock(); };
    toolbarNode.querySelector(".delete").onclick = function (e) { e.preventDefault(); deleteActiveBlock(); };

    // Track selection changes to highlight formatting states dynamically
    document.addEventListener("selectionchange", updateToolbarStates);

    // Setup actual editable regions based on page
    if (targetPageType === "about") {
      var contents = document.querySelectorAll(".about-section .content");
      contents.forEach(function (sec, idx) {
        var pars = sec.querySelectorAll("p, h2, h3");
        pars.forEach(function (p, pIdx) {
          bindEditableRegion(p, "about-section-" + idx + "-p-" + pIdx);
        });
      });
    } else if (targetPageType === "resume") {
      var elements = document.querySelectorAll("h2, h3, p:not(embed p)");
      elements.forEach(function (el, idx) {
        bindEditableRegion(el, "resume-text-" + idx);
      });
    } else if (targetPageType === "contact") {
      var elements = document.querySelectorAll("h1, h2, h3, p:not(embed p)");
      elements.forEach(function (el, idx) {
        bindEditableRegion(el, "contact-text-" + idx);
      });
    } else if (targetPageType === "playground") {
      var elements = document.querySelectorAll("h1, h2, h3, p:not(embed p)");
      elements.forEach(function (el, idx) {
        bindEditableRegion(el, "playground-text-" + idx);
      });
    } else if (targetPageType === "index") {
      var elements = document.querySelectorAll("h1, h2, h3, p:not(embed p)");
      elements.forEach(function (el, idx) {
        bindEditableRegion(el, "index-text-" + idx);
      });
    } else if (targetPageType === "projects" || targetPageType === "caseStudies") {
      // Detail sections load dynamically
      var observer = new MutationObserver(function () {
        var root = document.getElementById("project-main");
        if (root) {
          var sections = root.querySelectorAll("section[id]");
          sections.forEach(function (sec) {
            bindEditableRegion(sec, sec.id);
          });
        }
        var heroTitle = document.getElementById("project-hero-title");
        if (heroTitle) {
          bindEditableRegion(heroTitle, "project-hero-title");
        }
        var heroDesc = document.getElementById("project-hero-desc");
        if (heroDesc) {
          bindEditableRegion(heroDesc, "project-hero-desc");
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    // Dynamic Homepage project card reordering
    if (pathname.includes("/homepage.html")) {
      setInterval(setupHomepageCardReordering, 800);
    }
  }

  // Visual element bindings
  function bindEditableRegion(element, elementId) {
    if (element.getAttribute("data-inline-editable") === "true") return;
    element.setAttribute("data-inline-editable", "true");
    element.setAttribute("contenteditable", "true");
    element.setAttribute("spellcheck", "false");

    element.addEventListener("focus", function () {
      activeElement = element;
      updateToolbarStates();
    });

    element.addEventListener("keyup", updateToolbarStates);
    element.addEventListener("mouseup", updateToolbarStates);

    var saveDebounceTimer = null;
    element.addEventListener("input", function () {
      setDockStatus("Saving draft...", "saving");
      clearTimeout(saveDebounceTimer);
      saveDebounceTimer = setTimeout(function () {
        triggerBackgroundSave(elementId, element.innerHTML);
      }, 1500);
    });

    element.addEventListener("blur", function () {
      clearTimeout(saveDebounceTimer);
      triggerBackgroundSave(elementId, element.innerHTML);
    });
  }

  // Background Autosaving
  async function triggerBackgroundSave(elementId, html) {
    if (!isAuthenticated) return;
    setDockStatus("Saving...", "saving");

    // Check if editing project metadata (title/short_description in JSON database)
    if (elementId === "project-hero-title" || elementId === "project-hero-desc") {
      if (!pageSlug) return setDockStatus("Missing slug ID", "error");
      var q = new URLSearchParams({ target: targetPageType, mode: "file" });
      var out = await apiJson("/api/admin/content/raw?" + q.toString());
      if (!out.ok) return setDockStatus("Load metadata error", "error");

      var list = [];
      try {
        list = JSON.parse(out.text || "[]");
      } catch (err) {
        return setDockStatus("JSON parse error", "error");
      }

      var item = list.find(function(x) { return x.id === pageSlug; });
      if (item) {
        // Strip tags for saving plain text to JSON metadata
        var cleanText = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
        if (elementId === "project-hero-title") item.title = cleanText;
        if (elementId === "project-hero-desc") item.short_description = cleanText;

        var saveOut = await apiJson("/api/admin/content/raw/save", {
          method: "POST",
          body: { target: targetPageType, mode: "file", text: JSON.stringify(list, null, 2) }
        });

        if (saveOut.ok) setDockStatus(saveOut.unchanged ? "Unchanged" : "Saved title/desc", "saved");
        else setDockStatus("Save failed", "error");
      } else {
        setDockStatus("Project not found in JSON", "error");
      }
      return;
    }

    if (targetPageType === "about" || targetPageType === "resume" || targetPageType === "contact" || targetPageType === "playground" || targetPageType === "index") {
      var q = new URLSearchParams({ target: targetPageType, mode: "file" });
      var out = await apiJson("/api/admin/content/raw?" + q.toString());
      if (!out.ok) return setDockStatus("Load error", "error");

      var parser = new DOMParser();
      var doc = parser.parseFromString(out.text || "", "text/html");
      var found = false;

      if (targetPageType === "about") {
        var sections = doc.querySelectorAll(".about-section .content");
        sections.forEach(function (sec, idx) {
          var paragraphs = sec.querySelectorAll("p, h2, h3");
          paragraphs.forEach(function (p, pIdx) {
            if ("about-section-" + idx + "-p-" + pIdx === elementId) {
              p.innerHTML = html;
              found = true;
            }
          });
        });
      } else if (targetPageType === "resume") {
        var headers = doc.querySelectorAll("h2, h3, p:not(embed p)");
        headers.forEach(function (h, idx) {
          if ("resume-text-" + idx === elementId) {
            h.innerHTML = html;
            found = true;
          }
        });
      } else if (targetPageType === "contact") {
        var headers = doc.querySelectorAll("h1, h2, h3, p:not(embed p)");
        headers.forEach(function (h, idx) {
          if ("contact-text-" + idx === elementId) {
            h.innerHTML = html;
            found = true;
          }
        });
      } else if (targetPageType === "playground") {
        var headers = doc.querySelectorAll("h1, h2, h3, p:not(embed p)");
        headers.forEach(function (h, idx) {
          if ("playground-text-" + idx === elementId) {
            h.innerHTML = html;
            found = true;
          }
        });
      } else if (targetPageType === "index") {
        var headers = doc.querySelectorAll("h1, h2, h3, p:not(embed p)");
        headers.forEach(function (h, idx) {
          if ("index-text-" + idx === elementId) {
            h.innerHTML = html;
            found = true;
          }
        });
      }

      if (!found) return setDockStatus("Element not mapped", "error");

      var newHtmlText = "<!DOCTYPE HTML>\n" + doc.documentElement.outerHTML;
      var saveOut = await apiJson("/api/admin/content/raw/save", {
        method: "POST",
        body: { target: targetPageType, mode: "file", text: newHtmlText }
      });

      if (saveOut.ok) setDockStatus(saveOut.unchanged ? "Unchanged" : "Saved draft", "saved");
      else setDockStatus("Save failed", "error");

    } else if (targetPageType === "projects" || targetPageType === "caseStudies") {
      if (!pageSlug) return setDockStatus("Missing slug ID", "error");
      var q = new URLSearchParams({ target: targetPageType, slug: pageSlug, mode: "record-html" });
      var out = await apiJson("/api/admin/content/raw?" + q.toString());
      if (!out.ok) return setDockStatus("Load error", "error");

      var parser = new DOMParser();
      var doc = parser.parseFromString(out.text || "", "text/html");
      var sec = doc.getElementById(elementId);
      if (!sec) return setDockStatus("Section " + elementId + " missing", "error");

      sec.innerHTML = html;
      var newHtmlText = Array.from(doc.body.children).map(c => c.outerHTML).join("\n\n");

      var saveOut = await apiJson("/api/admin/content/raw/save", {
        method: "POST",
        body: { target: targetPageType, slug: pageSlug, mode: "record-html", text: newHtmlText }
      });

      if (saveOut.ok) setDockStatus(saveOut.unchanged ? "Unchanged" : "Saved section", "saved");
      else setDockStatus("Save failed", "error");
    }
  }

  // Block Mutations (Move, Delete, Insert)
  async function triggerFullContainerSave() {
    if (!activeElement) return;
    setDockStatus("Saving block structure...", "saving");

    if (targetPageType === "about" || targetPageType === "resume") {
      // For static pages, we serialize the entire live document body!
      // But we must NOT serialize the admin floating controls or tools overlays!
      var cleanDocText = document.documentElement.outerHTML;

      // Parse current page clone, strip admin elements, and serialize
      var parser = new DOMParser();
      var doc = parser.parseFromString(cleanDocText, "text/html");
      var embedStrip = doc.getElementById("admin-embed-strip");
      if (embedStrip) embedStrip.remove();
      var topToolbar = doc.getElementById("admin-top-toolbar");
      if (topToolbar) topToolbar.remove();
      doc.body.classList.remove("admin-editing-active");

      // Clean inline attributes from content
      doc.querySelectorAll('[data-inline-editable]').forEach(function (node) {
        node.removeAttribute("data-inline-editable");
        node.removeAttribute("contenteditable");
        node.removeAttribute("spellcheck");
      });

      var newHtmlText = "<!DOCTYPE HTML>\n" + doc.documentElement.outerHTML;
      var saveOut = await apiJson("/api/admin/content/raw/save", {
        method: "POST",
        body: { target: targetPageType, mode: "file", text: newHtmlText }
      });

      if (saveOut.ok) {
        setDockStatus("Structure saved", "saved");
        // Reload to re-index all paragraph IDs cleanly
        setTimeout(() => { window.location.reload(); }, 500);
      } else {
        setDockStatus("Save failed", "error");
      }
    } else if (targetPageType === "projects" || targetPageType === "caseStudies") {
      // For snippet files, read all sections inside `#project-main`
      var root = document.getElementById("project-main");
      if (!root || !pageSlug) return;

      var sections = root.querySelectorAll("section[id]");
      var clonedSectionsText = Array.from(sections).map(function (sec) {
        var clone = sec.cloneNode(true);
        clone.removeAttribute("data-inline-editable");
        clone.removeAttribute("contenteditable");
        clone.removeAttribute("spellcheck");
        return clone.outerHTML;
      }).join("\n\n");

      var saveOut = await apiJson("/api/admin/content/raw/save", {
        method: "POST",
        body: { target: targetPageType, slug: pageSlug, mode: "record-html", text: clonedSectionsText }
      });

      if (saveOut.ok) {
        setDockStatus("Snippet saved", "saved");
        setTimeout(() => { window.location.reload(); }, 500);
      } else {
        setDockStatus("Save failed", "error");
      }
    }
  }
  function moveActiveBlock(direction) {
    if (!activeElement) return;
    var sibling = direction < 0 ? activeElement.previousElementSibling : activeElement.nextElementSibling;
    if (!sibling || sibling.getAttribute("data-inline-editable") !== "true") return;

    if (direction < 0) {
      activeElement.parentNode.insertBefore(activeElement, sibling);
    } else {
      activeElement.parentNode.insertBefore(sibling, activeElement);
    }
    activeElement.focus();
    triggerFullContainerSave();
  }

  function deleteActiveBlock() {
    if (!activeElement) return;
    if (!confirm("Are you sure you want to delete this text block?")) return;
    activeElement.remove();
    activeElement = null;
    updateToolbarStates();
    triggerFullContainerSave();
  }

  function insertActiveBlock() {
    if (!activeElement) return;
    var newP = document.createElement("p");
    newP.innerHTML = "New paragraph content. Click here to edit.";
    activeElement.parentNode.insertBefore(newP, activeElement.nextElementSibling);
    var newId = "inserted-paragraph-" + Date.now();
    bindEditableRegion(newP, newId);
    newP.focus();
    activeElement = newP;
    updateToolbarStates();
    triggerFullContainerSave();
  }

  // 8. Card Reordering on Homepage
  function setupHomepageCardReordering() {
    var cards = document.querySelectorAll(".project-card-modern, .featured-hero-row > div, .featured-split-card, .featured-split-row > div");
    cards.forEach(function (card) {
      if (card.querySelector(".admin-reorder-overlay") || card.classList.contains("admin-card-container")) return;
      card.classList.add("admin-card-container");

      var link = card.querySelector("a[href*='?id=']");
      if (!link) return;

      var match = link.href.match(/[?&]id=([^&#]+)/);
      if (!match) return;
      var itemId = match[1];
      var isCaseStudy = link.href.includes("case-study.html");

      var overlay = document.createElement("div");
      overlay.className = "admin-reorder-overlay";

      var btnUp = document.createElement("button");
      btnUp.type = "button";
      btnUp.className = "admin-reorder-btn";
      btnUp.innerHTML = "↑";
      btnUp.title = "Move Up";
      btnUp.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        triggerCardReorder(isCaseStudy ? "caseStudies" : "projects", itemId, -1);
      };

      var btnDown = document.createElement("button");
      btnDown.type = "button";
      btnDown.className = "admin-reorder-btn";
      btnDown.innerHTML = "↓";
      btnDown.title = "Move Down";
      btnDown.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        triggerCardReorder(isCaseStudy ? "caseStudies" : "projects", itemId, 1);
      };

      overlay.appendChild(btnUp);
      overlay.appendChild(btnDown);
      card.appendChild(overlay);
    });
  }

  async function triggerCardReorder(target, id, delta) {
    if (!isAuthenticated) return;
    setDockStatus("Reordering...", "saving");

    // Fetch the raw list array
    var q = new URLSearchParams({ target: target, mode: "file" });
    var out = await apiJson("/api/admin/content/raw?" + q.toString());
    if (!out.ok) return setDockStatus("Load list error", "error");

    var arr = JSON.parse(out.text || "[]");
    var i = arr.findIndex(function (item) { return item && item.id === id; });
    if (i < 0) return setDockStatus("Item not found", "error");

    var nextIdx = i + delta;
    if (nextIdx < 0 || nextIdx >= arr.length) return setDockStatus("Boundary reach", "error");

    // Swap
    var temp = arr[i];
    arr[i] = arr[nextIdx];
    arr[nextIdx] = temp;

    var saveOut = await apiJson("/api/admin/content/raw/save", {
      method: "POST",
      body: { target: target, mode: "file", text: JSON.stringify(arr, null, 2) }
    });

    if (saveOut.ok) {
      setDockStatus("Reordered card", "saved");
      // Reload page to redraw list dynamically
      setTimeout(function () { window.location.reload(); }, 500);
    } else {
      setDockStatus("Reorder failed", "error");
    }
  }

})();
