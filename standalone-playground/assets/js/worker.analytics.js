// Reference Cloudflare Worker for analytics logging.
// This file is not executed by your site directly; copy/paste it into your
// Cloudflare Worker (analytics) in the dashboard.

const ALLOWED_ORIGIN = "https://www.colab.indevs.in";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
  "Vary": "Origin"
};

function parseBasicAuth(request) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return null;
  try {
    const decoded = atob(header.slice("Basic ".length));
    const [user, pass] = decoded.split(":", 2);
    return { user, pass };
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // Health check
    if (url.pathname === "/" && request.method === "GET") {
      return new Response("OK", {
        status: 200,
        headers: { "Content-Type": "text/plain", ...CORS_HEADERS }
      });
    }

    // /recent: Basic-auth HTML dashboard
    if (url.pathname === "/recent" && request.method === "GET") {
      const auth = parseBasicAuth(request);
      const expectedUser = env.ANALYTICS_DASHBOARD_USER || "";
      const expectedPass = env.ANALYTICS_DASHBOARD_PASS || "";

      const unauthorized = () =>
        new Response("Unauthorized", {
          status: 401,
          headers: {
            "WWW-Authenticate": 'Basic realm="Analytics"',
            "Content-Type": "text/plain",
            ...CORS_HEADERS
          }
        });

      if (!auth || auth.user !== expectedUser || auth.pass !== expectedPass) {
        return unauthorized();
      }

      if (!env.ANALYTICS_DB) {
        return new Response("No DB bound", {
          status: 200,
          headers: { "Content-Type": "text/plain", ...CORS_HEADERS }
        });
      }

      try {
        const { results } = await env.ANALYTICS_DB
          .prepare(
            `SELECT
               ts,
               site,
               event,
               path,
               referrer,
               country,
               region,
               city,
               ua_short,
               session_id,
               duration_ms,
               ip,
               asn,
               as_org,
               colo,
               timezone,
               latitude,
               longitude,
               fingerprint,
               data
             FROM events
             ORDER BY ts DESC
             LIMIT 100`
          )
          .all();

        const rowsHtml = results
          .map(r => {
            const durSec =
              r.duration_ms != null ? (r.duration_ms / 1000).toFixed(1) : "";

            let meta = {};
            try {
              meta = r.data ? JSON.parse(r.data) : {};
            } catch {
              meta = {};
            }
            const dev = meta.device || {};
            const fpTraits = meta.fpTraits || {};
            const deviceSummary = [
              dev.screenWidth && dev.screenHeight
                ? `screen: ${dev.screenWidth}×${dev.screenHeight}`
                : null,
              dev.width && dev.height
                ? `viewport: ${dev.width}×${dev.height}`
                : null,
              dev.pixelRatio ? `ratio: ${dev.pixelRatio}` : null,
              typeof dev.touch === "boolean"
                ? `touch: ${dev.touch ? "yes" : "no"}`
                : null
            ]
              .filter(Boolean)
              .join(" · ");

            const lang =
              meta.language ||
              (fpTraits.languages && fpTraits.languages[0]) ||
              "";
            const plat = meta.platform || fpTraits.platform || "";

            const ipShort =
              (r.ip || "").length > 12
                ? (r.ip || "").replace(/^(.{6}).+(.{2})$/, "$1…$2")
                : r.ip || "";

            const mapUrl =
              r.latitude != null && r.longitude != null
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${r.latitude},${r.longitude}`
                  )}`
                : null;

            const ipInfoUrl = r.ip
              ? `https://whatismyipaddress.com/ip/${encodeURIComponent(r.ip)}`
              : null;

            const fpLines = [];
            if (fpTraits.hardwareConcurrency != null)
              fpLines.push(`cores: ${fpTraits.hardwareConcurrency}`);
            if (fpTraits.deviceMemory != null)
              fpLines.push(`mem: ${fpTraits.deviceMemory} GB`);
            if (fpTraits.colorDepth != null)
              fpLines.push(`colorDepth: ${fpTraits.colorDepth}`);
            if (fpTraits.maxTouchPoints != null)
              fpLines.push(`touchPoints: ${fpTraits.maxTouchPoints}`);
            if (fpTraits.pointerCoarse != null)
              fpLines.push(
                `pointer: ${fpTraits.pointerCoarse ? "coarse" : "fine"}`
              );
            if (fpTraits.timeZone)
              fpLines.push(`tz: ${fpTraits.timeZone}`);
            if (fpTraits.languages && fpTraits.languages.length)
              fpLines.push(`langs: ${fpTraits.languages.join(", ")}`);
            const fpDetailsText = fpLines.join(" · ") || "no extra traits";

            const fpSummary = r.fingerprint || "n/a";

            // Human-friendly timestamp + year progress easter egg
            let humanTs = r.ts;
            let tsMeta = "";
            try {
              const d = new Date(r.ts);
              if (!isNaN(d.getTime())) {
                const opts = {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false
                };
                humanTs = d.toLocaleString("en-IN", opts);
                const yearStart = new Date(d.getFullYear(), 0, 1);
                const yearEnd = new Date(d.getFullYear() + 1, 0, 1);
                const dayOfYear =
                  Math.floor((d - yearStart) / 86400000) + 1;
                const totalDays =
                  Math.floor((yearEnd - yearStart) / 86400000);
                const daysLeft = totalDays - dayOfYear;
                tsMeta = `Day ${dayOfYear} of ${totalDays} · ${daysLeft} days left`;
              }
            } catch (e) {}

            return `
          <tr>
            <td>${humanTs}<br/><span class="muted">${tsMeta || r.ts}</span></td>
            <td>${r.event}</td>
            <td>${r.path || ""}</td>
            <td>
              ${r.country || ""}${r.city ? ` – ${r.city}` : ""}<br/>
              <span class="muted">${r.region || ""}${
              r.timezone ? ` · ${r.timezone}` : ""
            }</span>
              ${
                mapUrl
                  ? `<br/><br/><a href="${mapUrl}" target="_blank" rel="noopener" class="mini-link">📍 Maps</a>`
                  : ""
              }
            </td>
            <td>
              ip: ${(r.ip || "").replace(/^(.{3}).+(.{2})$/, "$1…$2") || "n/a"}<br/>
              <span class="muted">asn: ${r.asn || "n/a"}${
              r.as_org ? ` · ${r.as_org}` : ""
            }${r.colo ? ` · ${r.colo}` : ""}</span>
              ${
                ipInfoUrl
                  ? `<br/><br/><a href="${ipInfoUrl}" target="_blank" rel="noopener" class="mini-link">IP details ↗</a>`
                  : ""
              }
            </td>
            <td>
              <div class="sub-label-inline">Env</div>
              <div class="sub-value-inline">
                platform: ${plat || "n/a"} · lang: ${lang || "n/a"}
              </div>
              <div class="sub-label-inline">Device</div>
              <div class="sub-value-inline">${deviceSummary || "n/a"}</div>
              <div class="sub-label-inline">FP</div>
              <div class="sub-value-inline">
                <details class="fp-details">
                  <summary>🧬 ${fpSummary}</summary>
                  <div class="muted">${fpDetailsText}</div>
                </details>
              </div>
            </td>
            <td>
              ${(r.session_id || "").slice(0, 8)}<br/>
              <span class="muted">${durSec || ""}</span>
            </td>
          </tr>`;
          })
          .join("");

        const prettyJson = JSON.stringify(results, null, 2);

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Analytics · Recent events</title>
  <style>
    :root {
      /* Neutral base; accent variants override below */
      --bg: #f9fafb;
      --bg-card: #ffffff;
      --bg-table-alt: #f3f4f6;
      --text-main: #0f172a;
      --text-muted: #6b7280;
      --border-soft: #e5e7eb;
      --pill-bg: #e5e7eb;
      --pill-text: #111827;
      --accent: #3b82f6;
      --code-bg: #020617;
      --code-text: #e5e7eb;
    }

    /* Cool (blue) accent */
    [data-accent="cool"] {
      --bg: #eef2ff;
      --bg-table-alt: #e0f2fe;
      --pill-bg: #3b82f6;
      --pill-text: #eff6ff;
      --accent: #1d4ed8;
    }

    /* Warm (orange) accent */
    [data-accent="warm"] {
      --bg: #fef9f5;
      --bg-table-alt: #fef3c7;
      --pill-bg: #f97316;
      --pill-text: #fff7ed;
      --accent: #ea580c;
    }

    /* Emerald (green) accent */
    [data-accent="emerald"] {
      --bg: #ecfdf5;
      --bg-table-alt: #d1fae5;
      --pill-bg: #10b981;
      --pill-text: #ecfdf5;
      --accent: #047857;
    }

    /* Rose (pink) accent */
    [data-accent="rose"] {
      --bg: #fdf2f8;
      --bg-table-alt: #ffe4e6;
      --pill-bg: #f43f5e;
      --pill-text: #fff1f2;
      --accent: #be123c;
    }

    /* Slate (neutral) accent */
    [data-accent="slate"] {
      --bg: #f8fafc;
      --bg-table-alt: #e2e8f0;
      --pill-bg: #64748b;
      --pill-text: #f9fafb;
      --accent: #334155;
    }
    [data-theme="dark"] {
      --bg: #020617;
      --bg-card: #020617;
      --bg-table-alt: #0f172a;
      --text-main: #e5e7eb;
      --text-muted: #9ca3af;
      --border-soft: #1f2937;
      --pill-bg: #1d4ed8;
      --pill-text: #bfdbfe;
      --accent: #60a5fa;
      --code-bg: #020617;
      --code-text: #e5e7eb;
    }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      margin: 0;
      padding: 12px 24px;
      color: var(--text-main);
      background: radial-gradient(circle at top left, #e0f2fe 0, transparent 40%), var(--bg);
    }
    .shell {
      max-width: 1320px;
      margin: 0 auto;
    }
    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-radius: 999px;
      background: rgba(15,23,42,0.05);
      border: 1px solid rgba(148,163,184,0.4);
      backdrop-filter: blur(8px);
      gap: 0.75rem;
    }
    .topbar-title {
      font-size: 0.95rem;
      font-weight: 600;
    }
    .topbar-sub {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .theme-toggle {
      border-radius: 999px;
      border: 1px solid var(--border-soft);
      padding: 0.25rem 0.6rem;
      font-size: 0.75rem;
      background: var(--bg-card);
      color: var(--text-main);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }
    .theme-toggle span {
      font-size: 0.9rem;
    }
    h1 {
      font-size: 1.5rem;
      margin: 1rem 0 0.25rem;
    }
    .pill {
      display: inline-block;
      padding: 0.1rem 0.4rem;
      border-radius: 999px;
      background: var(--pill-bg);
      color: var(--pill-text);
      font-size: 0.7rem;
      font-weight: 600;
      margin-left: 0.4rem;
    }
    .card {
      margin-top: 1rem;
      background: var(--bg-card);
      border-radius: 0.9rem;
      border: 1px solid rgba(148,163,184,0.6);
      box-shadow: 0 12px 35px rgba(15,23,42,0.12);
      overflow: hidden;
    }
    .card-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-soft);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .card-header-title {
      font-size: 0.9rem;
      font-weight: 600;
    }
    .card-header-sub {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      padding: 0.6rem 0.85rem;
      border-bottom: 1px solid rgba(148,163,184,0.5);
      font-size: 0.8rem;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: rgba(248,250,252,0.9);
      font-weight: 600;
      color: var(--text-main);
    }
    /* Stronger header contrast in dark mode */
    [data-theme="dark"] th {
      background: #020617;
      color: #e5e7eb;
    }
    tr:nth-child(even) td {
      background: var(--bg-table-alt);
    }
    .muted { color: var(--text-muted); font-size: 0.72rem; }
    .sub-label-inline {
      font-weight: 600;
      font-size: 0.72rem;
      color: var(--text-muted);
      margin-top: 2px;
    }
    .sub-value-inline {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.75rem;
    }
    .mini-link {
      font-size: 0.72rem;
      color: var(--accent);
      text-decoration: none;
    }
    .mini-link:hover {
      text-decoration: underline;
    }
    details.fp-details summary {
      cursor: pointer;
      list-style: none;
    }
    details.fp-details summary::-webkit-details-marker {
      display: none;
    }
    details.fp-details summary::after {
      content: " 🔽";
      font-size: 0.7rem;
      color: var(--text-muted);
    }
    details.fp-details[open] summary::after {
      content: " 🔼";
    }
    details.fp-details div {
      margin-top: 2px;
    }
    pre {
      margin: 1.5rem 0 0;
      padding: 1rem;
      background: var(--code-bg);
      color: var(--code-text);
      border-radius: 0.75rem;
      max-height: 360px;
      overflow: auto;
      font-size: 0.8rem;
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="topbar">
      <div>
        <div class="topbar-title">Analytics dashboard</div>
        <div class="topbar-sub">Private viewer · Basic auth protected</div>
      </div>
      <div style="display:flex; gap:0.4rem;">
        <button class="theme-toggle" id="theme-toggle">
          <span id="theme-icon">🌙</span>
          <span id="theme-label">Dark</span>
        </button>
        <button class="theme-toggle" id="accent-toggle">
          <span id="accent-label">Cool</span>
        </button>
      </div>
    </div>

    <h1>Recent analytics events <span class="pill">last ${results.length}</span></h1>

    <div class="card">
      <div class="card-header">
        <div>
          <div class="card-header-title">Sessions & requests</div>
          <div class="card-header-sub">Location, network, device, and time on page</div>
        </div>
      </div>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Event</th>
              <th>Path</th>
              <th>Location</th>
              <th>Network</th>
              <th>Device / Env / FP</th>
              <th>Session / Duration</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="7">No events yet.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>

    <pre>${prettyJson.replace(/</g, "&lt;")}</pre>
  </div>

  <script>
    (function () {
      var root = document.documentElement;
      var themeKey = "analytics_theme";
      var accentKey = "analytics_accent";
      var accentOrder = ["cool", "emerald", "rose", "warm", "slate"];
      var accentLabels = {
        cool: "Blue",
        emerald: "Green",
        rose: "Rose",
        warm: "Orange",
        slate: "Slate"
      };

      function applyTheme(theme) {
        var t = theme === "dark" ? "dark" : "light";
        root.setAttribute("data-theme", t);
        var icon = document.getElementById("theme-icon");
        var label = document.getElementById("theme-label");
        if (icon && label) {
          if (t === "dark") {
            icon.textContent = "☀️";
            label.textContent = "Light";
          } else {
            icon.textContent = "🌙";
            label.textContent = "Dark";
          }
        }
      }

      function applyAccent(accent) {
        var a = accentOrder.indexOf(accent) !== -1 ? accent : "cool";
        root.setAttribute("data-accent", a);
        var label = document.getElementById("accent-label");
        if (label) {
          label.textContent = accentLabels[a] || a;
        }
      }

      var savedTheme = null;
      try { savedTheme = localStorage.getItem(themeKey); } catch (e) {}
      if (!savedTheme) {
        var prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        savedTheme = prefersDark ? "dark" : "light";
      }
      applyTheme(savedTheme);

      var savedAccent = null;
      try { savedAccent = localStorage.getItem(accentKey); } catch (e) {}
      if (!savedAccent || accentOrder.indexOf(savedAccent) === -1) savedAccent = "cool";
      applyAccent(savedAccent);

      var themeBtn = document.getElementById("theme-toggle");
      if (themeBtn) {
        themeBtn.addEventListener("click", function () {
          var current = root.getAttribute("data-theme") || "light";
          var next = current === "dark" ? "light" : "dark";
          applyTheme(next);
          try { localStorage.setItem(themeKey, next); } catch (e) {}
        });
      }

      var accentBtn = document.getElementById("accent-toggle");
      if (accentBtn) {
        accentBtn.addEventListener("click", function () {
          var current = root.getAttribute("data-accent") || "cool";
          var idx = accentOrder.indexOf(current);
          if (idx === -1) idx = 0;
          var next = accentOrder[(idx + 1) % accentOrder.length];
          applyAccent(next);
          try { localStorage.setItem(accentKey, next); } catch (e) {}
        });
      }
    })();
  </script>
</body>
</html>`;

        return new Response(html, {
          status: 200,
          headers: { "Content-Type": "text/html; charset=utf-8", ...CORS_HEADERS }
        });
      } catch (e) {
        console.error("D1 /recent error", e);
        return new Response("[]", {
          status: 200,
          headers: { "Content-Type": "application/json", ...CORS_HEADERS }
        });
      }
    }

    // /collect: ingest from frontend
    if (url.pathname === "/collect" && request.method === "POST") {
      let text = "";
      try {
        text = await request.text();
      } catch {}

      let payload;
      try {
        payload = JSON.parse(text || "{}");
      } catch {
        return new Response("Bad JSON", {
          status: 400,
          headers: { "Content-Type": "text/plain", ...CORS_HEADERS }
        });
      }

      const cf = request.cf || {};
      const now = new Date().toISOString();
      const ip =
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-real-ip") ||
        null;

      let fingerprint = null;
      try {
        const basis = [
          ip || "",
          payload.userAgent || "",
          JSON.stringify(payload.device || {}),
          JSON.stringify(payload.fpTraits || {}),
          cf.country || ""
        ].join("|");
        const enc = new TextEncoder().encode(basis);
        const buf = await crypto.subtle.digest("SHA-256", enc);
        fingerprint = Array.from(new Uint8Array(buf))
          .slice(0, 8)
          .map(b => b.toString(16).padStart(2, "0"))
          .join("");
      } catch {
        fingerprint = null;
      }

      const row = {
        ts: now,
        site: String(payload.site || "analytics-lab"),
        event: String(payload.event || "unknown"),
        path: String(payload.path || ""),
        referrer: payload.referrer ? String(payload.referrer).slice(0, 500) : null,
        country: cf.country || null,
        region: cf.region || null,
        city: cf.city || null,
        ua_short: (payload.userAgent || "").slice(0, 160),
        session_id: payload.sessionId ? String(payload.sessionId).slice(0, 80) : null,
        duration_ms:
          typeof payload.durationMs === "number"
            ? Math.round(payload.durationMs)
            : null,
        ip,
        asn: cf.asn || null,
        as_org: cf.asOrganization || null,
        colo: cf.colo || null,
        timezone: cf.timezone || null,
        latitude: cf.latitude ? Number(cf.latitude) : null,
        longitude: cf.longitude ? Number(cf.longitude) : null,
        fingerprint,
        data: JSON.stringify({
          device: payload.device || null,
          language: payload.language || null,
          platform: payload.platform || null,
          fpTraits: payload.fpTraits || null,
          cf: {
            continent: cf.continent || null,
            regionCode: cf.regionCode || null,
            postalCode: cf.postalCode || null
          }
        })
      };

      console.log("analytics event:", JSON.stringify(row).slice(0, 200));

      if (env.ANALYTICS_DB) {
        try {
          await env.ANALYTICS_DB
            .prepare(
              `INSERT INTO events
               (ts, site, event, path, referrer,
                country, region, city, ua_short, session_id, duration_ms,
                ip, asn, as_org, colo, timezone, latitude, longitude, fingerprint,
                data)
               VALUES
               (?1, ?2, ?3, ?4, ?5,
                ?6, ?7, ?8, ?9, ?10, ?11,
                ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19,
                ?20)`
            )
            .bind(
              row.ts,
              row.site,
              row.event,
              row.path,
              row.referrer,
              row.country,
              row.region,
              row.city,
              row.ua_short,
              row.session_id,
              row.duration_ms,
              row.ip,
              row.asn,
              row.as_org,
              row.colo,
              row.timezone,
              row.latitude,
              row.longitude,
              row.fingerprint,
              row.data
            )
            .run();
        } catch (e) {
          console.error("D1 insert error", e);
        }
      }

      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS
      });
    }

    return new Response("Not found", {
      status: 404,
      headers: { "Content-Type": "text/plain", ...CORS_HEADERS }
    });
  }
};

