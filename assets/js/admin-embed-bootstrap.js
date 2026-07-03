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

    /* Floating Block Toolbar */
    #admin-block-tools {
      position: absolute !important;
      display: none;
      gap: 3px !important;
      z-index: 2147483640 !important;
      background: #1e293b !important;
      border: 1px solid #475569 !important;
      padding: 3px !important;
      border-radius: 6px !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
    }
    .admin-tool-btn {
      background: #334155 !important;
      color: #f8fafc !important;
      border: none !important;
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
      font-family: inherit !important;
      transition: background 0.15s !important;
    }
    .admin-tool-btn:hover {
      background: #3db8b8 !important;
      color: #0f172a !important;
    }
    .admin-tool-btn.delete:hover {
      background: #ef4444 !important;
      color: #ffffff !important;
    }

    /* Floating Editor Control Dock */
    #admin-floating-dock {
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      z-index: 2147483500 !important;
      background: rgba(15, 23, 42, 0.85) !important;
      backdrop-filter: blur(12px) !important;
      border: 1px solid rgba(255, 255, 255, 0.15) !important;
      padding: 12px 16px !important;
      border-radius: 12px !important;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3), 0 8px 10px -6px rgba(0,0,0,0.3) !important;
      color: #f8fafc !important;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 10px !important;
      min-width: 250px !important;
      max-width: 320px !important;
      box-sizing: border-box !important;
    }
    #admin-floating-dock h4 {
      font-size: 14px !important;
      font-weight: 700 !important;
      margin: 0 !important;
      color: #3db8b8 !important;
      display: flex !important;
      align-items: center !important;
      gap: 6px !important;
    }
    #admin-floating-dock .status-row {
      font-size: 12px !important;
      color: #94a3b8 !important;
      margin: 0 !important;
      display: flex !important;
      justify-content: space-between !important;
    }
    #admin-floating-dock .status-val {
      font-weight: 600 !important;
      color: #cbd5e1 !important;
    }
    #admin-floating-dock .status-val.saving { color: #f59e0b !important; }
    #admin-floating-dock .status-val.saved { color: #10b981 !important; }
    #admin-floating-dock .status-val.error { color: #ef4444 !important; }

    #admin-floating-dock .action-btn {
      background: #3db8b8 !important;
      color: #0f172a !important;
      border: none !important;
      padding: 8px 12px !important;
      border-radius: 6px !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      text-align: center !important;
      transition: background 0.2s, transform 0.1s !important;
    }
    #admin-floating-dock .action-btn:hover {
      background: #2ea0a0 !important;
    }
    #admin-floating-dock .action-btn:active {
      transform: scale(0.98) !important;
    }
    #admin-floating-dock .action-btn.secondary {
      background: #334155 !important;
      color: #f8fafc !important;
    }
    #admin-floating-dock .action-btn.secondary:hover {
      background: #475569 !important;
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

  // 2. Create Floating Dock Elements
  var dock = document.createElement("div");
  dock.id = "admin-floating-dock";
  dock.innerHTML = `
    <h4>✏️ Site Editor (Live)</h4>
    <p class="status-row">Session: <span id="dock-session-val" class="status-val">Checking...</span></p>
    <p class="status-row">Status: <span id="dock-status-val" class="status-val">Idle</span></p>
    <button type="button" id="dock-publish-btn" class="action-btn" style="display:none;">Publish Live</button>
    <button type="button" id="dock-exit-btn" class="action-btn secondary">Exit Edit Mode</button>
  `;
  document.body.appendChild(dock);

  // 3. Create Block Tools Floating Toolbar
  var blockTools = document.createElement("div");
  blockTools.id = "admin-block-tools";
  blockTools.innerHTML = `
    <button type="button" class="admin-tool-btn move-up" title="Move Up">↑</button>
    <button type="button" class="admin-tool-btn move-down" title="Move Down">↓</button>
    <button type="button" class="admin-tool-btn cycle-type" title="Cycle Block Type (H2 / H3 / P)">T</button>
    <button type="button" class="admin-tool-btn delete" title="Delete Block">🗑️</button>
    <button type="button" class="admin-tool-btn insert" title="Insert Paragraph Below">+</button>
  `;
  document.body.appendChild(blockTools);

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
  var sessionVal = document.getElementById("dock-session-val");
  var statusVal = document.getElementById("dock-status-val");
  var publishBtn = document.getElementById("dock-publish-btn");

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
        if (sessionVal) sessionVal.textContent = "Admin (" + (s.user || "Sumit") + ")";
        if (publishBtn) publishBtn.style.display = "block";
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

  // Exit edit mode button
  document.getElementById("dock-exit-btn").addEventListener("click", function () {
    var url = new URL(window.location.href);
    url.searchParams.delete("admin_edit");
    url.searchParams.delete("admin_embed");
    window.location.href = url.toString();
  });

  // Publish live button
  publishBtn.addEventListener("click", async function () {
    if (!confirm("Are you sure you want to publish all saved draft commits to your live site?")) return;
    setDockStatus("Publishing...", "saving");
    var out = await apiJson("/api/admin/content/publish", {
      method: "POST",
      body: { target: "projects" } // Triggering publish logic
    });
    if (out.ok) {
      setDockStatus("Published!", "saved");
      alert("Success! Your static site is building on GitHub Pages.");
    } else {
      setDockStatus("Publish failed: " + (out.error || "unknown"), "error");
    }
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

  // Cycle H2 -> H3 -> P type
  function cycleElementType() {
    if (!activeElement) return;
    var currentTag = activeElement.tagName.toLowerCase();
    var nextTag = "p";
    if (currentTag === "p") nextTag = "h2";
    else if (currentTag === "h2") nextTag = "h3";
    else if (currentTag === "h3") nextTag = "p";

    var newEl = document.createElement(nextTag);
    newEl.innerHTML = activeElement.innerHTML;

    // Copy attributes
    for (var i = 0; i < activeElement.attributes.length; i++) {
      var attr = activeElement.attributes[i];
      if (attr.name !== "contenteditable" && attr.name !== "data-inline-editable") {
        newEl.setAttribute(attr.name, attr.value);
      }
    }

    activeElement.parentNode.replaceChild(newEl, activeElement);
    bindEditableRegion(newEl, newEl.id || "cycled-block-" + Date.now());
    showToolbar(newEl);
    newEl.focus();
    triggerFullContainerSave();
  }

  // Floating Selection Text Formatting Bubble (Medium-Style)
  function showFormattingBubble(rect) {
    var bubble = document.getElementById("admin-format-bubble");
    if (!bubble) {
      bubble = document.createElement("div");
      bubble.id = "admin-format-bubble";
      bubble.innerHTML = `
        <button type="button" class="admin-tool-btn bold" title="Bold" style="font-weight:bold !important;">B</button>
        <button type="button" class="admin-tool-btn italic" title="Italic" style="font-style:italic !important;">I</button>
        <button type="button" class="admin-tool-btn underline" title="Underline" style="text-decoration:underline !important;">U</button>
        <button type="button" class="admin-tool-btn link" title="Link">🔗</button>
        <button type="button" class="admin-tool-btn unlink" title="Unlink">⌧</button>
      `;
      document.body.appendChild(bubble);

      bubble.style.position = "absolute";
      bubble.style.display = "none";
      bubble.style.gap = "4px";
      bubble.style.zIndex = "2147483641";
      bubble.style.background = "#0f172a";
      bubble.style.border = "1px solid #334155";
      bubble.style.padding = "4px";
      bubble.style.borderRadius = "6px";
      bubble.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";

      bubble.querySelector(".bold").onclick = function (e) { e.preventDefault(); document.execCommand("bold"); };
      bubble.querySelector(".italic").onclick = function (e) { e.preventDefault(); document.execCommand("italic"); };
      bubble.querySelector(".underline").onclick = function (e) { e.preventDefault(); document.execCommand("underline"); };
      bubble.querySelector(".link").onclick = function (e) {
        e.preventDefault();
        var url = prompt("Enter URL link:");
        if (url) document.execCommand("createLink", false, url);
      };
      bubble.querySelector(".unlink").onclick = function (e) { e.preventDefault(); document.execCommand("unlink"); };
    }

    bubble.style.display = "flex";
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    var bubbleHeight = bubble.offsetHeight || 32;
    var bubbleWidth = bubble.offsetWidth || 150;

    var topPos = rect.top + scrollTop - bubbleHeight - 8;
    var leftPos = rect.left + scrollLeft + (rect.width / 2) - (bubbleWidth / 2);

    bubble.style.top = topPos + "px";
    bubble.style.left = leftPos + "px";
  }

  function hideFormattingBubble() {
    var bubble = document.getElementById("admin-format-bubble");
    if (bubble) bubble.style.display = "none";
  }

  function initializeEditor() {
    // Setup selection formatting bubble trigger
    document.addEventListener("selectionchange", function () {
      var sel = window.getSelection();
      if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
        var range = sel.getRangeAt(0);
        var node = range.commonAncestorContainer;
        if (node.nodeType === 3) node = node.parentNode;
        var editable = node.closest('[data-inline-editable="true"]');
        if (editable) {
          var rect = range.getBoundingClientRect();
          showFormattingBubble(rect);
          return;
        }
      }
      hideFormattingBubble();
    });

    // Setup toolbar reposition on hover
    document.addEventListener("mouseover", function (e) {
      var editable = e.target.closest('[data-inline-editable="true"]');
      if (!editable) return;
      showToolbar(editable);
    });

    document.addEventListener("mouseleave", function (e) {
      if (!e.relatedTarget || (!e.relatedTarget.closest('[data-inline-editable="true"]') && !e.relatedTarget.closest('#admin-block-tools'))) {
        blockTools.style.display = "none";
      }
    }, true);

    // Setup Block Action Handlers
    blockTools.querySelector(".move-up").onclick = function () { moveActiveBlock(-1); };
    blockTools.querySelector(".move-down").onclick = function () { moveActiveBlock(1); };
    blockTools.querySelector(".cycle-type").onclick = function () { cycleElementType(); };
    blockTools.querySelector(".delete").onclick = function () { deleteActiveBlock(); };
    blockTools.querySelector(".insert").onclick = function () { insertActiveBlock(); };

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
    } else if (targetPageType === "projects" || targetPageType === "caseStudies") {
      // Detail sections load dynamically
      var containerId = "project-main";
      var observer = new MutationObserver(function () {
        var root = document.getElementById(containerId);
        if (!root) return;
        var sections = root.querySelectorAll("section[id]");
        sections.forEach(function (sec) {
          bindEditableRegion(sec, sec.id);
        });
      });
      observer.observe(document.getElementById(containerId) || document.body, { childList: true, subtree: true });
    }

    // Dynamic Homepage project card reordering
    if (pathname.includes("/homepage.html")) {
      setInterval(setupHomepageCardReordering, 800);
    }
  }

  // Positioning floating element tools
  function showToolbar(el) {
    activeElement = el;
    blockTools.style.display = "flex";
    var rect = el.getBoundingClientRect();
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    blockTools.style.top = (rect.top + scrollTop - 32) + "px";
    blockTools.style.left = (rect.left + scrollLeft) + "px";
  }

  // Visual element bindings
  function bindEditableRegion(element, elementId) {
    if (element.getAttribute("data-inline-editable") === "true") return;
    element.setAttribute("data-inline-editable", "true");
    element.setAttribute("contenteditable", "true");
    element.setAttribute("spellcheck", "false");

    var saveDebounceTimer = null;
    element.addEventListener("input", function () {
      setDockStatus("Typing...", "saving");
      clearTimeout(saveDebounceTimer);
      saveDebounceTimer = setTimeout(function () {
        triggerBackgroundSave(elementId, element.innerHTML);
      }, 2500);
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

    if (targetPageType === "about" || targetPageType === "resume") {
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
      var fDock = doc.getElementById("admin-floating-dock");
      if (fDock) fDock.remove();
      var bTools = doc.getElementById("admin-block-tools");
      if (bTools) bTools.remove();

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
    showToolbar(activeElement);
    triggerFullContainerSave();
  }

  function deleteActiveBlock() {
    if (!activeElement) return;
    if (!confirm("Are you sure you want to delete this text block?")) return;
    var parent = activeElement.parentNode;
    activeElement.remove();
    blockTools.style.display = "none";
    activeElement = null;
    triggerFullContainerSave();
  }

  function insertActiveBlock() {
    if (!activeElement) return;
    var newP = document.createElement("p");
    newP.innerHTML = "New paragraph content. Click here to edit.";
    activeElement.parentNode.insertBefore(newP, activeElement.nextElementSibling);
    bindEditableRegion(newP, "inserted-paragraph-" + Date.now());
    showToolbar(newP);
    newP.focus();
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
