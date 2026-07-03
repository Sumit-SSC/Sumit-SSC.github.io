  const JSON_HEADERS = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  };
  const COOKIE_SESSION = "portfolio_admin_session";
  const COOKIE_STATE = "portfolio_admin_state";
  const COOKIE_GATE = "portfolio_admin_gate";
  const SESSION_TTL_SECONDS = 60 * 60 * 8;
  const GATE_TTL_SECONDS = 60 * 60 * 12;

  export default {
    async fetch(request, env) {
      const url = new URL(request.url);
      const { pathname } = url;
      const host = (url.hostname || "").toLowerCase();

      if (request.method === "OPTIONS") {
        return withCors(request, env, new Response(null, { status: 204 }));
      }

      try {
        // Optional redirect: allow dedicated admin hosts to route to the admin UI,
        // without requiring GitHub Pages to serve that hostname.
        // This only works if Cloudflare routes these hosts to this Worker.
        if (host === "admin.sumit.indevs.in" || host === "event.sumit.indevs.in") {
          const target = env.ADMIN_UI_REDIRECT || "https://admin.sumit.indevs.in/admin/index.html";
          const headers = new Headers();
          headers.set("Location", target);
          return new Response(null, { status: 302, headers });
        }

        if (pathname === "/api/admin/health") {
          return withCors(request, env, json({ ok: true, service: "portfolio-admin-api" }));
        }
        if (pathname === "/api/admin/auth/github/start") {
          return withCors(request, env, await startGithubAuth(request, env));
        }
        if (pathname === "/api/admin/auth/github/callback") {
          return withCors(request, env, await githubCallback(request, env));
        }
        if (pathname === "/api/admin/auth/logout") {
          return withCors(request, env, await logout(request, env));
        }
        if (pathname === "/api/admin/session") {
          return withCors(request, env, await getSessionStatus(request, env));
        }
        if (pathname === "/api/admin/stats" && request.method === "GET") {
          return withCors(request, env, await getAdminStats(request, env));
        }
        if (pathname === "/api/admin/gate/status") {
          return withCors(request, env, await getGateStatus(request, env));
        }
        if (pathname === "/api/admin/gate/verify" && request.method === "POST") {
          return withCors(request, env, await verifyAdminGate(request, env));
        }
        if (pathname === "/api/admin/content/read" && request.method === "GET") {
          return withCors(request, env, await readContent(url, request, env));
        }
        if (pathname === "/api/admin/content/commits" && request.method === "GET") {
          return withCors(request, env, await listContentCommits(url, request, env));
        }
        if (pathname === "/api/admin/content/raw" && request.method === "GET") {
          return withCors(request, env, await readRawContent(url, request, env));
        }
        if (pathname === "/api/admin/content/save" && request.method === "POST") {
          return withCors(request, env, await saveContent(request, env));
        }
        if (pathname === "/api/admin/content/raw/save" && request.method === "POST") {
          return withCors(request, env, await saveRawContent(request, env));
        }
        if (pathname === "/api/admin/images/upload" && request.method === "POST") {
          return withCors(request, env, await uploadImage(request, env));
        }
        if (pathname === "/api/admin/homepage-ui" && request.method === "GET") {
          return withCors(request, env, await getHomepageUi(request, env));
        }
        if (pathname === "/api/admin/homepage-ui" && request.method === "POST") {
          return withCors(request, env, await saveHomepageUi(request, env));
        }
        if (pathname === "/api/admin/content/publish" && request.method === "POST") {
          return withCors(request, env, await publishContent(request, env));
        }
        if (pathname === "/api/admin/content/backups" && request.method === "GET") {
          return withCors(request, env, await listBackups(url, request, env));
        }
        if (pathname === "/api/admin/content/restore" && request.method === "POST") {
          return withCors(request, env, await restoreFromBackup(request, env));
        }
        return withCors(request, env, json({ ok: false, error: "Not found" }, 404));
      } catch (error) {
        return withCors(request, env, json({ ok: false, error: error.message || "Unknown error" }, 500));
      }
    }
  };

  function parseCommaList(raw) {
    return String(raw || "")
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  }

  /**
   * CORS allow-list. Exact match on ALLOWED_ORIGINS, plus optional suffix match on
   * ALLOW_ORIGIN_SUFFIX (comma-separated), e.g. ".sumit.indevs.in" so every https
   * admin GitHub Pages host works without listing each subdomain in the dashboard.
   */
  function getAllowedOrigin(request, env) {
    const origin = (request.headers.get("origin") || "").trim();
    const allowlist = parseCommaList(env.ALLOWED_ORIGINS);
    if (!origin) {
      // No Origin (curl, same-origin Worker tests): use first allowlist entry so we never send * with credentials.
      return allowlist[0] || "*";
    }
    if (!allowlist.length) return origin;
    if (allowlist.includes(origin)) return origin;
    const suffixes = parseCommaList(env.ALLOW_ORIGIN_SUFFIX);
    if (suffixes.length && /^https:/i.test(origin)) {
      try {
        const host = new URL(origin).hostname.toLowerCase();
        for (const suf of suffixes) {
          const s = suf.toLowerCase().startsWith(".") ? suf.toLowerCase() : `.${suf.toLowerCase()}`;
          const bare = s.slice(1);
          if (host === bare || host.endsWith(s)) return origin;
        }
      } catch (_) {
        /* ignore */
      }
    }
    // Disallowed: do not echo Origin and do not send the literal "null" (breaks credentialed fetches).
    return "";
  }

  function withCors(request, env, response) {
    const allowedOrigin = getAllowedOrigin(request, env);
    // Response.redirect() and some Responses use immutable headers; copy then extend.
    const headers = new Headers(response.headers);
    if (allowedOrigin && allowedOrigin !== "*") {
      headers.set("access-control-allow-origin", allowedOrigin);
      headers.set("access-control-allow-credentials", "true");
    } else if (allowedOrigin === "*") {
      headers.set("access-control-allow-origin", "*");
    }
    headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
    headers.set("access-control-allow-headers", "content-type,authorization");
    headers.set("vary", "origin");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }

  function json(payload, status = 200) {
    return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
  }

  function parseCookieMap(request) {
    const raw = request.headers.get("cookie") || "";
    const pairs = raw.split(";").map((p) => p.trim()).filter(Boolean);
    const out = {};
    for (const pair of pairs) {
      const idx = pair.indexOf("=");
      if (idx < 0) continue;
      const key = pair.slice(0, idx);
      const value = pair.slice(idx + 1);
      out[key] = decodeURIComponent(value);
    }
    return out;
  }

  async function hmacHex(secret, value) {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
    return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function b64Encode(obj) {
    return btoa(JSON.stringify(obj));
  }

  function b64Decode(raw) {
    return JSON.parse(atob(raw));
  }

  async function createSignedToken(payload, secret) {
    const encoded = b64Encode(payload);
    const sig = await hmacHex(secret, encoded);
    return `${encoded}.${sig}`;
  }

  async function verifySignedToken(token, secret) {
    if (!token || !token.includes(".")) return null;
    const [encoded, sig] = token.split(".");
    const expected = await hmacHex(secret, encoded);
    if (expected !== sig) return null;
    const payload = b64Decode(encoded);
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  }

  function makeCookie(name, value, maxAgeSeconds, request) {
    let domainAttr = "";
    if (request) {
      const url = new URL(request.url);
      const host = url.hostname;
      if (host.endsWith(".sumit.indevs.in")) {
        domainAttr = "; Domain=.sumit.indevs.in";
      }
    }
    return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}${domainAttr}`;
  }

  function clearCookie(name, request) {
    let domainAttr = "";
    if (request) {
      const url = new URL(request.url);
      const host = url.hostname;
      if (host.endsWith(".sumit.indevs.in")) {
        domainAttr = "; Domain=.sumit.indevs.in";
      }
    }
    return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0${domainAttr}`;
  }

  function formatIstTimestamp(ms = Date.now()) {
    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(new Date(ms));
  }

  async function startGithubAuth(request, env) {
    const url = new URL(request.url);
    const redirect = `${url.origin}/api/admin/auth/github/callback`;
    const state = crypto.randomUUID();
    const signedState = await createSignedToken(
      { state, exp: Date.now() + 10 * 60 * 1000 },
      env.SESSION_SIGNING_KEY
    );

    const githubUrl = new URL("https://github.com/login/oauth/authorize");
    githubUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID || "");
    githubUrl.searchParams.set("redirect_uri", redirect);
    githubUrl.searchParams.set("scope", env.GITHUB_OAUTH_SCOPES || "read:user");
    githubUrl.searchParams.set("state", state);

    const headers = new Headers();
    headers.set("Location", githubUrl.toString());
    headers.append("set-cookie", makeCookie(COOKIE_STATE, signedState, 600, request));
    return new Response(null, { status: 302, headers });
  }

  async function githubCallback(request, env) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) return json({ ok: false, error: "Missing oauth code/state" }, 400);

    const cookies = parseCookieMap(request);
    const stateToken = cookies[COOKIE_STATE];
    const parsedState = await verifySignedToken(stateToken, env.SESSION_SIGNING_KEY);
    if (!parsedState || parsedState.state !== state) return json({ ok: false, error: "Invalid oauth state" }, 401);

    const callbackUrl = `${url.origin}/api/admin/auth/github/callback`;
    const tokenResp = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "content-type": "application/json", "accept": "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: callbackUrl
      })
    });
    const tokenJson = await tokenResp.json();
    if (!tokenJson.access_token) return json({ ok: false, error: "OAuth token exchange failed" }, 401);

    const userResp = await fetch("https://api.github.com/user", {
      headers: {
        authorization: `Bearer ${tokenJson.access_token}`,
        accept: "application/vnd.github+json",
        "user-agent": "portfolio-admin-api"
      }
    });
    const user = await userResp.json();
    const login = String(user.login || "");
    if (!isUserAllowed(login, env.ALLOWED_GITHUB_USERS || "")) {
      return json({ ok: false, error: "User not allowed" }, 403);
    }

    const sessionToken = await createSignedToken(
      { user: login, exp: Date.now() + SESSION_TTL_SECONDS * 1000 },
      env.SESSION_SIGNING_KEY
    );
    // Prefer `/admin/` even if Cloudflare variables still contain an old legacy value.
    let successRedirect = env.ADMIN_SUCCESS_REDIRECT || getDefaultSuccessRedirect(env);
    if (!String(successRedirect).includes("/admin/")) {
      successRedirect = getDefaultSuccessRedirect(env);
    }
    const headers = new Headers();
    headers.set("Location", successRedirect);
    headers.append("set-cookie", makeCookie(COOKIE_SESSION, sessionToken, SESSION_TTL_SECONDS, request));
    headers.append("set-cookie", clearCookie(COOKIE_STATE, request));
    return new Response(null, { status: 302, headers });
  }

  async function logout(request, env) {
    const headers = new Headers(JSON_HEADERS);
    headers.append("set-cookie", clearCookie(COOKIE_SESSION, request));
    headers.append("set-cookie", clearCookie(COOKIE_GATE, request));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  async function isGateVerified(request, env) {
    const gate = String(env.ADMIN_PANEL_PASSWORD || "").trim();
    if (!gate) return true;
    const cookies = parseCookieMap(request);
    const token = cookies[COOKIE_GATE];
    const parsed = await verifySignedToken(token, env.SESSION_SIGNING_KEY);
    return !!(parsed && parsed.gate === "ok");
  }

  async function getGateStatus(request, env) {
    const required = !!String(env.ADMIN_PANEL_PASSWORD || "").trim();
    if (!required) {
      return json({ ok: true, required: false, verified: true });
    }
    const verified = await isGateVerified(request, env);
    return json({ ok: true, required: true, verified });
  }

  async function verifyAdminGate(request, env) {
    const requiredPass = String(env.ADMIN_PANEL_PASSWORD || "").trim();
    if (!requiredPass) return json({ ok: true, required: false, verified: true });
    const body = await request.json().catch(() => ({}));
    const pass = String(body.password || "");
    if (!pass || pass !== requiredPass) {
      return json({ ok: false, error: "Invalid admin password" }, 401);
    }
    const token = await createSignedToken(
      { gate: "ok", exp: Date.now() + GATE_TTL_SECONDS * 1000 },
      env.SESSION_SIGNING_KEY
    );
    const headers = new Headers(JSON_HEADERS);
    headers.append("set-cookie", makeCookie(COOKIE_GATE, token, GATE_TTL_SECONDS, request));
    return new Response(JSON.stringify({ ok: true, required: true, verified: true }), { status: 200, headers });
  }

  async function getSessionUser(request, env) {
    if (!(await isGateVerified(request, env))) return null;
    const cookies = parseCookieMap(request);
    const token = cookies[COOKIE_SESSION];
    const session = await verifySignedToken(token, env.SESSION_SIGNING_KEY);
    if (!session || !session.user) return null;
    return session.user;
  }

  async function getSessionStatus(request, env) {
    const gateRequired = !!String(env.ADMIN_PANEL_PASSWORD || "").trim();
    const gateVerified = await isGateVerified(request, env);
    const user = await getSessionUser(request, env);
    return json({
      ok: !!user,
      user: user || null,
      github: user ? { login: user } : null,
      role: user ? "admin" : null,
      gateRequired,
      gateVerified,
      serverTimeUtc: new Date().toISOString(),
      serverTimeIst: formatIstTimestamp()
    });
  }

  async function getAdminStats(request, env) {
    if (!(await isGateVerified(request, env))) {
      return json({ ok: false, error: "Admin password verification required" }, 401);
    }
    const baseBranch = getContentBaseBranch(env);
    
    // Diagnostic tracking
    const debug = {
      baseBranch,
      repoOwner: env.GITHUB_REPO_OWNER,
      repoName: env.GITHUB_REPO_NAME,
      hasToken: !!env.GITHUB_TOKEN_FOR_CONTENT_WRITES,
      tokenLength: env.GITHUB_TOKEN_FOR_CONTENT_WRITES ? env.GITHUB_TOKEN_FOR_CONTENT_WRITES.length : 0
    };

    const pagesRes = await githubApi(
      env,
      `/contents/pages?ref=${encodeURIComponent(baseBranch)}`
    );
    
    debug.pagesStatus = pagesRes.status;
    
    let htmlPages = [];
    if (pagesRes.ok) {
      const arr = await pagesRes.json();
      if (Array.isArray(arr)) {
        htmlPages = arr.filter((f) => f.type === "file" && String(f.name).endsWith(".html"));
      }
    } else {
      debug.pagesError = await pagesRes.text().catch(() => "");
    }

    const totalHtmlBytes = htmlPages.reduce((sum, f) => sum + Number(f.size || 0), 0);

    const lastCommitRes = await githubApi(
      env,
      `/commits?sha=${encodeURIComponent(baseBranch)}&per_page=1`
    );
    
    debug.commitsStatus = lastCommitRes.status;
    
    let lastCommit = null;
    if (lastCommitRes.ok) {
      const rows = await lastCommitRes.json();
      const c = Array.isArray(rows) ? rows[0] : null;
      if (c) {
        const iso = c.commit?.author?.date || null;
        lastCommit = {
          sha: c.sha || null,
          message: c.commit?.message || "",
          atUtc: iso,
          atIst: iso ? formatIstTimestamp(Date.parse(iso)) : null
        };
      }
    } else {
      debug.commitsError = await lastCommitRes.text().catch(() => "");
    }

    const traffic = await getCloudflareTrafficLast24h(env);

    return json({
      ok: true,
      generatedAtUtc: new Date().toISOString(),
      generatedAtIst: formatIstTimestamp(),
      pages: {
        htmlCount: htmlPages.length,
        totalHtmlBytes
      },
      deploy: {
        baseBranch,
        draftBranch: env.CONTENT_DRAFT_BRANCH || "content/drafts",
        lastCommit
      },
      traffic,
      debug
    });
  }

  async function getCloudflareTrafficLast24h(env) {
    const apiToken = env.CF_ANALYTICS_API_TOKEN;
    const accountTag = env.CF_ACCOUNT_ID;
    const zoneTag = env.CF_ZONE_ID || env.CF_ZONE_TAG;
    if (!apiToken || !accountTag || !zoneTag) {
      return {
        cfLast24h: null,
        note: "Cloudflare analytics not configured. Set CF_ANALYTICS_API_TOKEN, CF_ACCOUNT_ID, and CF_ZONE_ID."
      };
    }

    const now = Date.now();
    const since = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const until = new Date(now).toISOString();

    const query = `
      query GetZoneTraffic($accountTag: String!, $zoneTag: String!, $since: Time!, $until: Time!) {
        viewer {
          accounts(filter: { accountTag: $accountTag }) {
            zones(filter: { zoneTag: $zoneTag }) {
              httpRequests1hGroups(
                limit: 24
                filter: { datetime_geq: $since, datetime_lt: $until }
              ) {
                sum {
                  requests
                }
              }
            }
          }
        }
      }
    `;

    try {
      const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiToken}`
        },
        body: JSON.stringify({
          query,
          variables: { accountTag, zoneTag, since, until }
        })
      });

      if (!res.ok) {
        return {
          cfLast24h: null,
          note: `Cloudflare analytics HTTP ${res.status}`
        };
      }

      const body = await res.json();
      if (Array.isArray(body?.errors) && body.errors.length) {
        return {
          cfLast24h: null,
          note: `Cloudflare analytics error: ${body.errors[0]?.message || "unknown"}`
        };
      }

      const groups =
        body?.data?.viewer?.accounts?.[0]?.zones?.[0]?.httpRequests1hGroups || [];
      const cfLast24h = groups.reduce((sum, row) => sum + Number(row?.sum?.requests || 0), 0);
      return { cfLast24h, note: null };
    } catch (error) {
      return {
        cfLast24h: null,
        note: `Cloudflare analytics fetch failed: ${error?.message || "unknown"}`
      };
    }
  }

  function isUserAllowed(login, allowListRaw) {
    const allowed = allowListRaw.split(",").map((v) => v.trim().toLowerCase()).filter(Boolean);
    return allowed.includes(String(login || "").toLowerCase());
  }

  const HOMEPAGE_UI_PATH = "data/homepage-ui.json";

  function getContentBaseBranch(env) {
    const b = env.CONTENT_BASE_BRANCH;
    if (!b || !String(b).trim()) {
      throw new Error(
        "CONTENT_BASE_BRANCH is not set. In Cloudflare Worker → Settings → Variables, set it to the same branch GitHub Pages builds from (e.g. feature/cf-admin-editor-foundation or dev)."
      );
    }
    return String(b).trim();
  }

  function getDefaultSuccessRedirect(env) {
    const firstAllowedOrigin = (env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((v) => v.trim())
      .find((v) => v.startsWith("https://"));
    if (firstAllowedOrigin) {
      return `${firstAllowedOrigin}/admin/index.html`;
    }
    return "https://admin.sumit.indevs.in/admin/index.html";
  }

  const BACKUPS_DIR = "data/_admin_backups";

  function mapTargetPath(target) {
    if (target === "projects") return "data/projects.json";
    if (target === "caseStudies") return "data/case_studies.json";
    if (target === "homepage") return "data/homepage-content.json";
    if (target === "homepageUi") return HOMEPAGE_UI_PATH;
    if (target === "siteTheme") return "data/site-theme.json";
    if (target === "about") return "pages/about.html";
    if (target === "resume") return "pages/resume.html";
    throw new Error("Unsupported target");
  }

  async function githubApi(env, path, init = {}) {
    const token = env.GITHUB_TOKEN_FOR_CONTENT_WRITES;
    if (!token) throw new Error("Missing GITHUB_TOKEN_FOR_CONTENT_WRITES secret");
    const repo = `${env.GITHUB_REPO_OWNER}/${env.GITHUB_REPO_NAME}`;
    const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "user-agent": "portfolio-admin-api",
        ...(init.headers || {})
      }
    });
    return res;
  }

  async function getBranchSha(env, branch) {
    const res = await githubApi(env, `/git/refs/heads/${encodeURIComponent(branch)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Could not read branch ref");
    const jsonData = await res.json();
    return jsonData.object.sha;
  }

  async function ensureBranchExists(env, branch, baseBranch) {
    const branchSha = await getBranchSha(env, branch);
    if (branchSha) return branchSha;
    const baseSha = await getBranchSha(env, baseBranch);
    if (!baseSha) throw new Error(`Base branch not found: ${baseBranch}`);
    const create = await githubApi(env, "/git/refs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha })
    });
    if (!create.ok) throw new Error("Failed to create draft branch");
    return baseSha;
  }

  async function getFileFromGithub(env, path, ref) {
    const res = await githubApi(env, `/contents/${path}?ref=${encodeURIComponent(ref)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to read ${path}`);
    const file = await res.json();
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\n/g, "")), (c) => c.charCodeAt(0)));
    return { sha: file.sha, text: decoded };
  }

  async function putFileToGithub(env, path, contentText, branch, message, sha = null, contentBase64Override = null) {
    const encodedContent = contentBase64Override || btoa(unescape(encodeURIComponent(contentText)));
    const body = {
      message,
      branch,
      content: encodedContent
    };
    if (sha) body.sha = sha;

    const res = await githubApi(env, `/contents/${path}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GitHub write failed: ${errText}`);
    }
    return res.json();
  }

  function toEditorDataFromRecord(record) {
    const blocks = [
      { type: "header", data: { text: record.title || record.id || "Untitled", level: 2 } },
      { type: "paragraph", data: { text: record.short_description || "No description yet." } }
    ];
    if (record.full_description) {
      blocks.push({ type: "code", data: { code: String(record.full_description) } });
    }
    return { time: Date.now(), blocks, version: "2.30.7" };
  }

  function updateRecordFromEditor(record, editorPayload) {
    const blocks = editorPayload.content.blocks || [];
    const header = blocks.find((b) => b.type === "header");
    const paragraph = blocks.find((b) => b.type === "paragraph");
    const codeBlock = blocks.find((b) => b.type === "code");
    const next = { ...record };
    if (header?.data?.text) next.title = header.data.text;
    if (paragraph?.data?.text) next.short_description = paragraph.data.text;
    if (codeBlock?.data?.code) next.full_description = codeBlock.data.code;
    next.editor_content = editorPayload.content;
    next.updated_at = new Date().toISOString();
    return next;
  }

  function buildReadContentResponse(parsed, target, slug) {
    if (Array.isArray(parsed)) {
      if (!slug) return json({ ok: false, error: "slug is required for list content" }, 400);
      const found = parsed.find((r) => r.id === slug);
      if (!found) return json({ ok: false, error: `No record found for slug: ${slug}` }, 404);
      return json({ ok: true, target, slug, editorData: found.editor_content || toEditorDataFromRecord(found) });
    }
    if (target === "siteTheme") {
      return json({
        ok: true,
        target,
        slug,
        editorData: {
          time: Date.now(),
          version: "2.30.7",
          blocks: [
            { type: "header", data: { text: "Site Theme", level: 2 } },
            { type: "paragraph", data: { text: "Edit the JSON below, then Save draft and Publish to apply on the live site." } },
            { type: "code", data: { code: JSON.stringify(parsed, null, 2) } }
          ]
        }
      });
    }
    return json({ ok: true, target, slug, editorData: parsed.editor_content || parsed });
  }

  async function listContentCommits(url, request, env) {
    const user = await getSessionUser(request, env);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    const target = url.searchParams.get("target") || "homepage";
    try {
      mapTargetPath(target);
    } catch (e) {
      return json({ ok: false, error: e.message || "Unsupported target" }, 400);
    }
    const branch = env.CONTENT_DRAFT_BRANCH || "content/drafts";
    const base = getContentBaseBranch(env);
    await ensureBranchExists(env, branch, base);
    const path = mapTargetPath(target);
    const perPage = Math.min(30, Math.max(1, Number(url.searchParams.get("per_page") || 15)));
    const res = await githubApi(
      env,
      `/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}&per_page=${perPage}`
    );
    if (!res.ok) {
      const errText = await res.text();
      return json({ ok: false, error: `GitHub commits failed: ${errText}` }, 502);
    }
    const commits = await res.json();
    const items = (Array.isArray(commits) ? commits : []).map((c) => ({
      sha: c.sha,
      shortSha: String(c.sha || "").slice(0, 7),
      message: c.commit && c.commit.message ? String(c.commit.message).split("\n")[0] : "",
      date: c.commit && c.commit.author && c.commit.author.date ? c.commit.author.date : "",
      author: c.author && c.author.login ? c.author.login : ""
    }));
    return json({ ok: true, path, branch, commits: items });
  }

  async function readContent(url, request, env) {
    const user = await getSessionUser(request, env);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);

    const target = url.searchParams.get("target") || "homepage";
    const slug = url.searchParams.get("slug") || "";
    const path = mapTargetPath(target);
    const refParam = String(url.searchParams.get("ref") || "").trim();

    if (refParam) {
      let file;
      try {
        file = await getFileFromGithub(env, path, refParam);
      } catch (e) {
        return json({ ok: false, error: e.message || "Read failed" }, 500);
      }
      if (!file) return json({ ok: false, error: "File not found at this revision" }, 404);
      let parsed;
      try {
        parsed = JSON.parse(file.text);
      } catch {
        return json({ ok: false, error: "Invalid JSON at this revision" }, 500);
      }
      return buildReadContentResponse(parsed, target, slug);
    }

    const branch = env.CONTENT_DRAFT_BRANCH || "content/drafts";
    const base = getContentBaseBranch(env);
    const source = String(url.searchParams.get("source") || "auto");
    await ensureBranchExists(env, branch, base);

    let file = null;
    if (source === "draft") file = await getFileFromGithub(env, path, branch);
    else if (source === "base") file = await getFileFromGithub(env, path, base);
    else file = (await getFileFromGithub(env, path, branch)) || (await getFileFromGithub(env, path, base));
    if (!file) {
      if (target === "homepage") {
        return json({
          ok: true,
          target,
          slug,
          editorData: { time: Date.now(), blocks: [{ type: "header", data: { text: "Homepage", level: 2 } }], version: "2.30.7" }
        });
      }
      return json({ ok: false, error: `File not found: ${path}` }, 404);
    }

    let parsed;
    try {
      parsed = JSON.parse(file.text);
    } catch {
      return json({ ok: false, error: `Invalid JSON in ${path}` }, 500);
    }

    return buildReadContentResponse(parsed, target, slug);
  }

  function validateSaveRequest(body) {
    if (!body || typeof body !== "object") throw new Error("Invalid payload");
    if (!body.target) throw new Error("target is required");
    if (!body.content || !Array.isArray(body.content.blocks)) throw new Error("content.blocks is required");
    const allowed = new Set(["paragraph", "header", "list", "code", "embed"]);
    for (const block of body.content.blocks) {
      if (!allowed.has(block.type)) throw new Error(`Unsupported block type: ${block.type}`);
      if (block.type === "embed") {
        const source = String(block?.data?.source || "");
        if (source && !isAllowedEmbedSource(source)) {
          throw new Error(`Embed source not allowed: ${source}`);
        }
      }
    }
  }

  function isAllowedEmbedSource(sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      const host = url.hostname.toLowerCase();
      const allow = [
        "gist.github.com",
        "github.com",
        "replit.com",
        "streamlit.app",
        "app.powerbi.com",
        "nbviewer.org",
        "www.youtube.com",
        "youtube.com"
      ];
      return allow.some((item) => host === item || host.endsWith(`.${item}`));
    } catch {
      return false;
    }
  }

  async function saveContent(request, env) {
    const user = await getSessionUser(request, env);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);

    const body = await request.json();
    validateSaveRequest(body);
    const target = body.target;
    const slug = (body.slug || "").trim();
    const path = mapTargetPath(target);
    const draftBranch = env.CONTENT_DRAFT_BRANCH || "content/drafts";
    const baseBranch = getContentBaseBranch(env);
    await ensureBranchExists(env, draftBranch, baseBranch);

    const draftFile = await getFileFromGithub(env, path, draftBranch);
    const baseFile = await getFileFromGithub(env, path, baseBranch);
    const existing = draftFile || baseFile;
    let contentObj;
    let sha = null;

    if (existing) {
      contentObj = JSON.parse(existing.text);
      if (draftFile) sha = draftFile.sha;
    } else {
      contentObj = target === "homepage" ? {} : [];
    }

    if (target === "siteTheme") {
      const blocks = body.content.blocks || [];
      const codeBlock = blocks.find((b) => b.type === "code");
      const raw = String(codeBlock?.data?.code || "").trim();
      let nextObj;
      try {
        nextObj = raw ? JSON.parse(raw) : null;
      } catch {
        return json({ ok: false, error: "Site theme JSON is invalid. Fix the JSON in the code block and try again." }, 400);
      }
      if (!nextObj || typeof nextObj !== "object") {
        return json({ ok: false, error: "Site theme JSON must be an object." }, 400);
      }
      // Ensure minimal shape
      if (!nextObj.schemaVersion) nextObj.schemaVersion = 1;
      nextObj.updated_at = new Date().toISOString();
      if (!nextObj.theme || typeof nextObj.theme !== "object") nextObj.theme = {};

      const commit = await putFileToGithub(
        env,
        path,
        JSON.stringify(nextObj, null, 2),
        draftBranch,
        `chore(theme): update site theme via admin (${user})`,
        sha
      );
      return json({
        ok: true,
        branch: draftBranch,
        path,
        commitSha: commit.commit?.sha || null
      });
    }

    if (Array.isArray(contentObj)) {
      if (!slug) return json({ ok: false, error: "slug is required for list content" }, 400);
      const idx = contentObj.findIndex((item) => item.id === slug);
      if (idx >= 0) {
        contentObj[idx] = updateRecordFromEditor(contentObj[idx], body);
      } else {
        const meta = body.meta && typeof body.meta === "object" ? body.meta : {};
        const baseRecord = {
          id: slug,
          title: meta.title || slug,
          short_description: meta.short_description || "",
          ...meta
        };
        if (!baseRecord.id) baseRecord.id = slug;
        contentObj.unshift(updateRecordFromEditor(baseRecord, body));
      }
    } else {
      contentObj = {
        ...contentObj,
        editor_content: body.content,
        updated_at: new Date().toISOString()
      };
    }

    const nextText = JSON.stringify(contentObj, null, 2);
    const prevText = existing ? existing.text : "";
    if (prevText === nextText) {
      return json({
        ok: true,
        branch: draftBranch,
        path,
        unchanged: true,
        commitSha: null
      });
    }
    const commit = await putFileToGithub(
      env,
      path,
      nextText,
      draftBranch,
      `chore(content): update ${target}${slug ? `/${slug}` : ""} via admin editor (${user})`,
      sha
    );

    return json({
      ok: true,
      branch: draftBranch,
      path,
      commitSha: commit.commit?.sha || null
    });
  }

  function getRecordPathKey(target) {
    if (target === "projects") return "content_path";
    if (target === "caseStudies") return "case_study_path";
    return null;
  }

  async function readRawContent(url, request, env) {
    const user = await getSessionUser(request, env);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    const target = url.searchParams.get("target") || "";
    const slug = url.searchParams.get("slug") || "";
    const mode = url.searchParams.get("mode") || "file";
    const path = mapTargetPath(target);
    const draftBranch = env.CONTENT_DRAFT_BRANCH || "content/drafts";
    const baseBranch = getContentBaseBranch(env);
    await ensureBranchExists(env, draftBranch, baseBranch);

    const draftFile = await getFileFromGithub(env, path, draftBranch);
    const baseFile = await getFileFromGithub(env, path, baseBranch);
    const file = draftFile || baseFile;
    if (!file) return json({ ok: false, error: `File not found: ${path}` }, 404);

    if (mode === "file") {
      return json({ ok: true, target, slug, mode, language: path.endsWith(".json") ? "json" : "html", text: file.text });
    }

    let parsed;
    try {
      parsed = JSON.parse(file.text);
    } catch {
      return json({ ok: false, error: "Raw mode requires JSON target for record editing" }, 400);
    }
    if (!Array.isArray(parsed)) return json({ ok: false, error: "record modes are only valid for list targets" }, 400);
    if (!slug) return json({ ok: false, error: "slug is required" }, 400);
    const idx = parsed.findIndex((r) => r.id === slug);
    if (idx < 0) return json({ ok: false, error: `No record found for slug: ${slug}` }, 404);
    const rec = parsed[idx];

    if (mode === "record-json") {
      return json({ ok: true, target, slug, mode, language: "json", text: JSON.stringify(rec, null, 2) });
    }
    if (mode === "record-html") {
      const key = getRecordPathKey(target);
      const htmlPath = key ? String(rec[key] || "").trim() : "";
      if (!htmlPath) return json({ ok: false, error: "No html path configured on record" }, 400);
      const draftHtml = await getFileFromGithub(env, htmlPath, draftBranch);
      const baseHtml = await getFileFromGithub(env, htmlPath, baseBranch);
      const html = draftHtml || baseHtml;
      if (!html) return json({ ok: false, error: `HTML file not found: ${htmlPath}` }, 404);
      return json({ ok: true, target, slug, mode, language: "html", path: htmlPath, text: html.text });
    }
    return json({ ok: false, error: "Invalid mode" }, 400);
  }

  async function saveRawContent(request, env) {
    const user = await getSessionUser(request, env);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    const body = await request.json();
    const target = String(body.target || "");
    const slug = String(body.slug || "");
    const mode = String(body.mode || "file");
    const text = String(body.text || "");
    const path = mapTargetPath(target);
    const draftBranch = env.CONTENT_DRAFT_BRANCH || "content/drafts";
    const baseBranch = getContentBaseBranch(env);
    await ensureBranchExists(env, draftBranch, baseBranch);

    if (mode === "file") {
      if (path.endsWith(".json")) {
        try { JSON.parse(text); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
      }
      const draftFile = await getFileFromGithub(env, path, draftBranch);
      if (draftFile && draftFile.text === text) {
        return json({ ok: true, branch: draftBranch, path, unchanged: true, commitSha: null });
      }
      const commit = await putFileToGithub(
        env,
        path,
        text,
        draftBranch,
        `chore(raw): update ${target} via source mode (${user})`,
        draftFile ? draftFile.sha : null
      );
      return json({ ok: true, branch: draftBranch, path, commitSha: commit.commit?.sha || null });
    }

    const draftFile = await getFileFromGithub(env, path, draftBranch);
    const baseFile = await getFileFromGithub(env, path, baseBranch);
    const file = draftFile || baseFile;
    if (!file) return json({ ok: false, error: `File not found: ${path}` }, 404);
    let parsed;
    try {
      parsed = JSON.parse(file.text);
    } catch {
      return json({ ok: false, error: "List target JSON invalid" }, 500);
    }
    if (!Array.isArray(parsed)) return json({ ok: false, error: "record modes are only valid for list targets" }, 400);
    if (!slug) return json({ ok: false, error: "slug is required" }, 400);
    const idx = parsed.findIndex((r) => r.id === slug);
    if (idx < 0) return json({ ok: false, error: `No record found for slug: ${slug}` }, 404);

    if (mode === "record-json") {
      let next;
      try { next = JSON.parse(text); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
      if (!next || typeof next !== "object") return json({ ok: false, error: "record JSON must be an object" }, 400);
      next.id = next.id || slug;
      const prevRecordText = JSON.stringify(parsed[idx], null, 2);
      const nextRecordText = JSON.stringify(next, null, 2);
      if (prevRecordText === nextRecordText) {
        return json({ ok: true, branch: draftBranch, path, unchanged: true, commitSha: null });
      }
      parsed[idx] = next;
      const commit = await putFileToGithub(
        env,
        path,
        JSON.stringify(parsed, null, 2),
        draftBranch,
        `chore(raw): update ${target}/${slug} json (${user})`,
        draftFile ? draftFile.sha : null
      );
      return json({ ok: true, branch: draftBranch, path, commitSha: commit.commit?.sha || null });
    }

    if (mode === "record-html") {
      const key = getRecordPathKey(target);
      const htmlPath = key ? String(parsed[idx][key] || "").trim() : "";
      if (!htmlPath) return json({ ok: false, error: "No html path configured on record" }, 400);
      const draftHtml = await getFileFromGithub(env, htmlPath, draftBranch);
      if (draftHtml && draftHtml.text === text) {
        return json({ ok: true, branch: draftBranch, path: htmlPath, unchanged: true, commitSha: null });
      }
      const commit = await putFileToGithub(
        env,
        htmlPath,
        text,
        draftBranch,
        `chore(raw): update html ${target}/${slug} (${user})`,
        draftHtml ? draftHtml.sha : null
      );
      return json({ ok: true, branch: draftBranch, path: htmlPath, commitSha: commit.commit?.sha || null });
    }
    return json({ ok: false, error: "Invalid mode" }, 400);
  }

  async function getHomepageUi(request, env) {
    const user = await getSessionUser(request, env);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    const draftBranch = env.CONTENT_DRAFT_BRANCH || "content/drafts";
    const baseBranch = getContentBaseBranch(env);
    await ensureBranchExists(env, draftBranch, baseBranch);
    const file =
      (await getFileFromGithub(env, HOMEPAGE_UI_PATH, draftBranch)) ||
      (await getFileFromGithub(env, HOMEPAGE_UI_PATH, baseBranch));
    if (!file) {
      return json({
        ok: true,
        ui: {
          schemaVersion: 1,
          featuredTitle: "Featured Projects",
          caseStudiesTitle: "Case Studies"
        }
      });
    }
    let parsed;
    try {
      parsed = JSON.parse(file.text);
    } catch {
      return json({ ok: false, error: "Invalid homepage-ui JSON" }, 500);
    }
    return json({ ok: true, ui: parsed });
  }

  async function saveHomepageUi(request, env) {
    const user = await getSessionUser(request, env);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    const body = await request.json();
    const featuredTitle = String(body.featuredTitle ?? "").trim() || "Featured Projects";
    const caseStudiesTitle = String(body.caseStudiesTitle ?? "").trim() || "Case Studies";
    const draftBranch = env.CONTENT_DRAFT_BRANCH || "content/drafts";
    const baseBranch = getContentBaseBranch(env);
    await ensureBranchExists(env, draftBranch, baseBranch);
    const draftUi = await getFileFromGithub(env, HOMEPAGE_UI_PATH, draftBranch);
    const baseUi = await getFileFromGithub(env, HOMEPAGE_UI_PATH, baseBranch);
    const existing = draftUi || baseUi;
    let prev = {};
    if (existing) {
      try {
        prev = JSON.parse(existing.text);
      } catch {
        prev = {};
      }
    }
    const next = {
      ...prev,
      schemaVersion: 1,
      featuredTitle,
      caseStudiesTitle,
      updated_at: new Date().toISOString()
    };
    const commit = await putFileToGithub(
      env,
      HOMEPAGE_UI_PATH,
      JSON.stringify(next, null, 2),
      draftBranch,
      `chore(content): homepage view titles (${user})`,
      draftUi ? draftUi.sha : null
    );
    return json({
      ok: true,
      ui: next,
      branch: draftBranch,
      commitSha: commit.commit?.sha || null
    });
  }

  async function publishContent(request, env) {
    const user = await getSessionUser(request, env);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    const body = await request.json();
    const target = body.target;
    if (!target || !["projects", "caseStudies", "homepage", "homepageUi", "siteTheme", "about", "resume"].includes(target)) {
      return json({ ok: false, error: "Invalid or missing target" }, 400);
    }
    const path = mapTargetPath(target);
    const draftBranch = env.CONTENT_DRAFT_BRANCH || "content/drafts";
    const baseBranch = getContentBaseBranch(env);
    await ensureBranchExists(env, draftBranch, baseBranch);

    const draftFile = await getFileFromGithub(env, path, draftBranch);
    if (!draftFile) {
      return json({ ok: false, error: "Nothing on draft to publish — save from the editor first." }, 400);
    }

    const baseFile = await getFileFromGithub(env, path, baseBranch);
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPaths = [];
    if (baseFile) {
      const backupLivePath = `${BACKUPS_DIR}/backup-${target}-live-${ts}.json`;
      const backupLivePayload = JSON.stringify(
        {
          sourcePath: path,
          savedAt: new Date().toISOString(),
          publishedBy: user,
          snapshotType: "live",
          snapshotText: baseFile.text
        },
        null,
        2
      );
      await putFileToGithub(
        env,
        backupLivePath,
        backupLivePayload,
        baseBranch,
        `chore(admin): backup live file before publish ${path} (${user})`,
        null
      );
      backupPaths.push(backupLivePath);
    }

    const backupDraftPath = `${BACKUPS_DIR}/backup-${target}-draft-${ts}.json`;
    const backupDraftPayload = JSON.stringify(
      {
        sourcePath: path,
        savedAt: new Date().toISOString(),
        publishedBy: user,
        snapshotType: "draft",
        snapshotText: draftFile.text
      },
      null,
      2
    );
    await putFileToGithub(
      env,
      backupDraftPath,
      backupDraftPayload,
      baseBranch,
      `chore(admin): backup draft file before publish ${path} (${user})`,
      null
    );
    backupPaths.push(backupDraftPath);

    if (!baseFile) {
      const backupBaselinePath = `${BACKUPS_DIR}/backup-${target}-baseline-${ts}.json`;
      const backupBaselinePayload = JSON.stringify(
        {
          sourcePath: path,
          savedAt: new Date().toISOString(),
          publishedBy: user,
          snapshotType: "baseline",
          snapshotText: ""
        },
        null,
        2
      );
      await putFileToGithub(
        env,
        backupBaselinePath,
        backupBaselinePayload,
        baseBranch,
        `chore(admin): create baseline backup before first publish ${path} (${user})`,
        null
      );
      backupPaths.push(backupBaselinePath);
    }

    const commit = await putFileToGithub(
      env,
      path,
      draftFile.text,
      baseBranch,
      `chore(content): publish ${target} from draft (${user})`,
      baseFile ? baseFile.sha : null
    );

    return json({
      ok: true,
      path,
      baseBranch,
      draftBranch,
      backupPath: backupPaths[0] || null,
      backupPaths,
      commitSha: commit.commit?.sha || null
    });
  }

  async function listBackups(url, request, env) {
    const user = await getSessionUser(request, env);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    const baseBranch = getContentBaseBranch(env);
    const res = await githubApi(env, `/contents/${BACKUPS_DIR}?ref=${encodeURIComponent(baseBranch)}`);
    if (res.status === 404) {
      return json({ ok: true, backups: [] });
    }
    if (!res.ok) {
      const t = await res.text();
      return json({ ok: false, error: t || "Failed to list backups" }, 500);
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      return json({ ok: true, backups: [] });
    }
    const backups = data
      .filter((item) => item.type === "file" && item.name.endsWith(".json"))
      .map((item) => ({
        name: item.name,
        path: item.path,
        sha: item.sha
      }))
      .sort((a, b) => b.name.localeCompare(a.name));
    return json({ ok: true, backups });
  }

  async function restoreFromBackup(request, env) {
    const user = await getSessionUser(request, env);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);
    const body = await request.json();
    const backupPath = (body.backupPath || "").trim();
    if (!backupPath || !backupPath.startsWith(`${BACKUPS_DIR}/`)) {
      return json({ ok: false, error: "Invalid backupPath" }, 400);
    }
    const baseBranch = getContentBaseBranch(env);
    const backupFile = await getFileFromGithub(env, backupPath, baseBranch);
    if (!backupFile) return json({ ok: false, error: "Backup not found" }, 404);

    let meta;
    try {
      meta = JSON.parse(backupFile.text);
    } catch {
      return json({ ok: false, error: "Invalid backup file" }, 400);
    }
    const sourcePath = meta.sourcePath;
    const snapshotText = meta.snapshotText;
    if (!sourcePath || typeof snapshotText !== "string") {
      return json({ ok: false, error: "Backup format invalid" }, 400);
    }

    const liveFile = await getFileFromGithub(env, sourcePath, baseBranch);
    const commit = await putFileToGithub(
      env,
      sourcePath,
      snapshotText,
      baseBranch,
      `chore(admin): restore ${sourcePath} from backup (${user})`,
      liveFile ? liveFile.sha : null
    );

    return json({
      ok: true,
      path: sourcePath,
      baseBranch,
      commitSha: commit.commit?.sha || null
    });
  }

  function cleanSlug(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function decodeDataUrl(dataUrl) {
    const match = /^data:(.+);base64,(.+)$/.exec(String(dataUrl || ""));
    if (!match) throw new Error("Invalid image data URL");
    return { mime: match[1], base64: match[2] };
  }

  async function uploadImage(request, env) {
    const user = await getSessionUser(request, env);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);

    const body = await request.json();
    const slug = cleanSlug(body.slug);
    const preset = cleanSlug(body.preset || "inline");
    const dataUrl = body.dataUrl;
    if (!slug) return json({ ok: false, error: "slug is required" }, 400);
    if (!["thumbnail", "banner", "hero", "inline"].includes(preset)) {
      return json({ ok: false, error: "invalid preset" }, 400);
    }

    const { mime, base64 } = decodeDataUrl(dataUrl);
    if (mime !== "image/webp") return json({ ok: false, error: "Only image/webp accepted" }, 400);

    const rawSize = Math.floor((base64.length * 3) / 4);
    if (rawSize > 600000) return json({ ok: false, error: "Image too large after compression" }, 400);

    const finalPath = `assets/images/projects/${slug}/${preset}-${slug}.webp`;
    const draftBranch = env.CONTENT_DRAFT_BRANCH || "content/drafts";
    const baseBranch = getContentBaseBranch(env);
    await ensureBranchExists(env, draftBranch, baseBranch);

    const draftImg = await getFileFromGithub(env, finalPath, draftBranch);
    const baseImg = await getFileFromGithub(env, finalPath, baseBranch);
    const existing = draftImg || baseImg;
    const sha = draftImg ? draftImg.sha : null;

    const commit = await putFileToGithub(
      env,
      finalPath,
      "",
      draftBranch,
      `chore(media): upload ${preset} image for ${slug} (${user})`,
      sha,
      base64
    );

    return json({
      ok: true,
      relativePath: finalPath,
      branch: draftBranch,
      commitSha: commit.commit?.sha || null
    });
  }
