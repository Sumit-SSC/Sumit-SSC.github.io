/**
 * Portfolio admin dashboard (admin/index.html).
 * Kept external so Content-Security-Policy on the host cannot block inline scripts.
 */
(function () {
  "use strict";

  var API = "https://admin-api.sumit.indevs.in";

  function el(id) {
    return document.getElementById(id);
  }

  function onClick(id, handler) {
    var node = el(id);
    if (!node) {
      console.warn("[admin-home] missing element:", id);
      return;
    }
    node.addEventListener("click", handler);
  }

  function loginName(sess) {
    if (!sess || !sess.user) return "";
    if (typeof sess.user === "string") return sess.user;
    return sess.user.login || "";
  }

  function fmtBytes(v) {
    var n = Number(v || 0);
    if (n < 1024) return String(n) + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(2) + " MB";
  }

  function setCheck(id, ok, detailOk, detailFail) {
    detailOk = detailOk || "OK";
    detailFail = detailFail || "Issue";
    var node = el(id);
    if (!node) return;
    node.textContent = ok ? detailOk : detailFail;
    node.className = ok ? "text-emerald-300" : "text-rose-300";
  }

  function fmtIst(iso) {
    if (!iso) return "-";
    var d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
  }

  function setGateHelp(msg, show) {
    var n = el("gate-help");
    if (!n) return;
    n.textContent = msg || "";
    n.classList.toggle("hidden", !show);
  }

  function setGithubLoginEnabled(on) {
    var b = el("btn-login");
    if (!b) return;
    b.disabled = !on;
    if (on) {
      b.className = "rounded px-3 py-2 text-sm font-medium bg-indigo-700 hover:bg-indigo-600 text-white";
      b.removeAttribute("title");
    } else {
      b.className = "rounded px-3 py-2 text-sm font-medium bg-slate-800 text-slate-500 cursor-not-allowed";
      b.title = "Unlock with the site password first";
    }
  }

  function refreshHealth() {
    return fetch(API + "/api/admin/health", { credentials: "include" })
      .then(function (r) {
        var health = el("api-health");
        if (health) health.textContent = r.ok ? "Healthy" : "HTTP " + r.status;
        setCheck("check-api", r.ok, "Healthy", r.ok ? "Healthy" : "HTTP " + r.status);
      })
      .catch(function (e) {
        var health = el("api-health");
        if (health) health.textContent = "Error: " + String(e && e.message ? e.message : e);
        setCheck("check-api", false, "Healthy", "Offline");
      });
  }

  function refreshSession() {
    return fetch(API + "/api/admin/session", { credentials: "include" })
      .then(function (res) {
        return res.json().then(function (s) {
          var home = el("home-session");
          var time = el("home-server-time");
          if (home) {
            home.textContent = s.ok
              ? "Signed in as " + (loginName(s) || "unknown") + " (" + (s.role || "admin") + ")"
              : "Not signed in";
          }
          if (time) time.textContent = s.serverTimeIst ? "Server IST: " + s.serverTimeIst : "";
          setCheck("check-session", !!s.ok, "Signed in", "Not signed in");
        });
      })
      .catch(function (e) {
        var home = el("home-session");
        var time = el("home-server-time");
        if (home) home.textContent = "Session check failed";
        if (time) time.textContent = String(e && e.message ? e.message : e);
        setCheck("check-session", false, "Signed in", "Failed");
      });
  }

  function refreshGateStatus() {
    return fetch(API + "/api/admin/gate/status", { credentials: "include" })
      .then(function (r) {
        return r.json();
      })
      .then(function (g) {
        var ok = !!g.ok;
        var required = !!g.required;
        var verified = !!g.verified;
        var gateEl = el("gate-status");
        if (gateEl) {
          gateEl.textContent = !ok ? "Unknown" : !required ? "Disabled" : verified ? "Unlocked" : "Locked";
        }
        setCheck("check-gate", ok && (!required || verified), !required ? "Disabled" : "Unlocked", "Locked");
        var canGithub = ok && (!required || verified);
        setGithubLoginEnabled(canGithub);
        if (required && !verified) {
          setGateHelp(
            "Gate is locked: enter the Worker password and click Unlock. If clicks do nothing, open DevTools → Console for errors. If Unlock fails silently, set Worker ALLOWED_ORIGINS or ALLOW_ORIGIN_SUFFIX for this page’s origin.",
            true
          );
        } else {
          setGateHelp("", false);
        }
        return canGithub;
      })
      .catch(function () {
        setCheck("check-gate", false, "Unlocked", "Unknown");
        setGithubLoginEnabled(false);
        setGateHelp("Could not reach gate status. Check API URL, network, and CORS.", true);
        return false;
      });
  }

  function verifyGateWithPassword(pwd) {
    return fetch(API + "/api/admin/gate/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password: pwd })
    }).then(function (res) {
      return res.json().catch(function () {
        return {};
      }).then(function (out) {
        return res.ok && !!out.ok;
      });
    });
  }

  function ensureGateUnlocked() {
    return fetch(API + "/api/admin/gate/status", { credentials: "include" })
      .then(function (r) {
        return r.json();
      })
      .then(function (g) {
        if (!g.ok) return false;
        if (!g.required || g.verified) return true;
        var home = el("home-session");
        if (home) {
          home.textContent =
            "Unlock with the site password first (password field + Unlock), then try again.";
        }
        return false;
      });
  }

  function refreshStats() {
    return fetch(API + "/api/admin/stats", { credentials: "include" })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        // Show diagnostics block if GitHub responses failed
        var errBanner = el("admin-js-error");
        if (d.debug && (d.debug.pagesStatus !== 200 || d.debug.commitsStatus !== 200)) {
          if (errBanner) {
            errBanner.innerHTML = `
              <div class="space-y-1">
                <p class="font-bold text-rose-200">⚠️ GitHub API Error (Status ${d.debug.pagesStatus || d.debug.commitsStatus})</p>
                <ul class="list-disc pl-4 text-xs space-y-1 text-rose-300">
                  <li>Repository: <code>${d.debug.repoOwner}/${d.debug.repoName}</code></li>
                  <li>Base Branch: <code>${d.debug.baseBranch}</code></li>
                  <li>Token configured in Cloudflare: <code>${d.debug.hasToken ? 'Yes (length ' + d.debug.tokenLength + ')' : 'No'}</code></li>
                  <li>Pages Query Status: <strong>${d.debug.pagesStatus}</strong></li>
                  <li>Commits Query Status: <strong>${d.debug.commitsStatus}</strong></li>
                  <li>Response details: <code class="bg-rose-950/80 px-1 py-0.5 rounded text-[10px] break-all">${d.debug.pagesError || d.debug.commitsError || 'None'}</code></li>
                </ul>
                <p class="text-[11px] text-rose-400 mt-2 font-medium">Please double check that GITHUB_TOKEN_FOR_CONTENT_WRITES is set in your Cloudflare dashboard and has access to this repo.</p>
              </div>
            `;
            errBanner.classList.remove("hidden");
          }
        } else if (errBanner) {
          errBanner.classList.add("hidden");
        }

        if (!d.ok) {
          var lu = el("stat-last-update");
          var lm = el("stat-last-message");
          if (lu) lu.textContent = d.error || "Stats unavailable";
          if (lm) lm.textContent = "-";
          setCheck("check-stats", false, "Loaded", "Unavailable");
          return;
        }
        var hc = el("stat-html-count");
        var hs = el("stat-html-size");
        if (hc) hc.textContent = d.pages && d.pages.htmlCount != null ? String(d.pages.htmlCount) : "-";
        if (hs) hs.textContent = fmtBytes(d.pages ? d.pages.totalHtmlBytes : 0);
        var lc = d.deploy ? d.deploy.lastCommit : null;
        var lu2 = el("stat-last-update");
        var lm2 = el("stat-last-message");
        if (lu2) {
          lu2.textContent = lc ? (lc.atIst || "-") + " (" + String(lc.sha || "").slice(0, 7) + ")" : "-";
        }
        if (lm2) lm2.textContent = lc && lc.message ? lc.message : "-";
        var bb = el("stat-base-branch");
        var db = el("stat-draft-branch");
        if (bb) bb.textContent = d.deploy && d.deploy.baseBranch ? d.deploy.baseBranch : "-";
        if (db) db.textContent = d.deploy && d.deploy.draftBranch ? d.deploy.draftBranch : "content/drafts";
        var tr = el("stat-traffic");
        if (tr) {
          tr.textContent =
              d.traffic && d.traffic.cfLast24h != null
                  ? String(d.traffic.cfLast24h)
                  : d.traffic && d.traffic.note
                      ? d.traffic.note
                      : "Not configured";
        }
        setCheck("check-stats", true, "Loaded", "Unavailable");
      })
      .catch(function (e) {
        var lu = el("stat-last-update");
        var lm = el("stat-last-message");
        if (lu) lu.textContent = String(e && e.message ? e.message : e);
        if (lm) lm.textContent = "-";
        setCheck("check-stats", false, "Loaded", "Error");
      });
  }

  function refreshRecentCommits() {
    var root = el("recent-commits");
    if (!root) return Promise.resolve();
    root.innerHTML = "<p class=\"text-slate-400\">Loading commit history…</p>";
    var targets = [
      { id: "homepage", label: "Homepage" },
      { id: "projects", label: "Projects" },
      { id: "caseStudies", label: "Case studies" }
    ];
    return fetch(API + "/api/admin/session", { credentials: "include" })
      .then(function (r) {
        return r.json();
      })
      .then(function (sess) {
        if (!sess.ok) {
          root.innerHTML =
            "<p class=\"text-slate-400\">Sign in with GitHub to load draft-branch commit history.</p>";
          return;
        }
        var rows = [];
        var i = 0;
        function next() {
          if (i >= targets.length) {
            rows.sort(function (a, b) {
              return new Date(b.date).getTime() - new Date(a.date).getTime();
            });
            var top = rows.slice(0, 8);
            if (!top.length) {
              root.innerHTML = "<p class=\"text-slate-400\">No recent editor commits found yet.</p>";
              return;
            }
            root.innerHTML = top
              .map(function (rrow) {
                return (
                  "<div class=\"rounded border border-slate-700 p-2\">" +
                  "<p class=\"text-slate-200\">" +
                  String(rrow.message).replace(/</g, "&lt;") +
                  "</p>" +
                  "<p class=\"text-xs text-slate-400 mt-1\">" +
                  rrow.target +
                  " • " +
                  rrow.shortSha +
                  " • " +
                  (rrow.author || "unknown") +
                  " • " +
                  fmtIst(rrow.date) +
                  "</p></div>"
                );
              })
              .join("");
            return;
          }
          var t = targets[i];
          i += 1;
          fetch(
            API + "/api/admin/content/commits?target=" + encodeURIComponent(t.id) + "&per_page=3",
            { credentials: "include" }
          )
            .then(function (res) {
              return res.json().then(function (data) {
                return { res: res, data: data };
              });
            })
            .then(function (pack) {
              if (pack.res.status === 401) {
                root.innerHTML =
                  "<p class=\"text-slate-400\">Sign in with GitHub to load commit history.</p>";
                return;
              }
              var data = pack.data;
              if (data.ok && Array.isArray(data.commits)) {
                for (var j = 0; j < data.commits.length; j += 1) {
                  var c = data.commits[j];
                  rows.push({
                    target: t.label,
                    shortSha: c.shortSha || String(c.sha || "").slice(0, 7),
                    message: c.message || "(no message)",
                    date: c.date || "",
                    author: c.author || ""
                  });
                }
              }
              return next();
            })
            .catch(function (e) {
              root.innerHTML =
                "<p class=\"text-rose-300\">Commit history unavailable: " +
                String(e && e.message ? e.message : e) +
                "</p>";
            });
        }
        next();
      })
      .catch(function (e) {
        root.innerHTML =
          "<p class=\"text-rose-300\">Commit history unavailable: " +
          String(e && e.message ? e.message : e) +
          "</p>";
      });
  }

  function boot() {
    var errEl = el("admin-js-error");
    try {
      window.__PORTFOLIO_ADMIN_HOME_LOADED = true;

      onClick("btn-unlock", function () {
        var inp = el("admin-gate-password");
        var pwd = inp && inp.value ? String(inp.value).trim() : "";
        if (!pwd) {
          var home = el("home-session");
          if (home) home.textContent = "Enter the admin password in the field above, then click Unlock.";
          return;
        }
        verifyGateWithPassword(pwd).then(function (ok) {
          if (!ok) {
            var h = el("home-session");
            if (h) {
              h.textContent =
                "Unlock failed: wrong password or API/CORS error. Open the browser console (F12) for details.";
            }
            return refreshGateStatus();
          }
          var h2 = el("home-session");
          if (h2) h2.textContent = "Gate unlocked. You can use Login with GitHub next.";
          return refreshGateStatus()
            .then(function () {
              return refreshSession();
            })
            .then(function () {
              return refreshStats();
            });
        });
      });

      onClick("btn-login", function () {
        ensureGateUnlocked().then(function (ok) {
          if (!ok) return;
          window.location.href = API + "/api/admin/auth/github/start";
        });
      });

      onClick("btn-logout", function () {
        fetch(API + "/api/admin/auth/logout", { credentials: "include" })
          .catch(function () {})
          .then(function () {
            return refreshSession();
          });
      });

      onClick("btn-refresh-session", function () {
        return refreshHealth()
          .then(function () {
            return refreshGateStatus();
          })
          .then(function () {
            return refreshSession();
          })
          .then(function () {
            return refreshStats();
          })
          .then(function () {
            return refreshRecentCommits();
          });
      });

      onClick("btn-refresh-commits", function () {
        ensureGateUnlocked().then(function (ok) {
          if (!ok) return;
          return refreshRecentCommits();
        });
      });

      refreshHealth();
      refreshGateStatus();
      refreshSession();
      refreshStats();
      refreshRecentCommits();
    } catch (e) {
      console.error("[admin-home] boot error", e);
      if (errEl) {
        errEl.textContent =
          "Admin UI script failed to start: " + String(e && e.message ? e.message : e);
        errEl.classList.remove("hidden");
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
