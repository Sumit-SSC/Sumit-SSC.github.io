  const JSON_HEADERS = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  };
  const COOKIE_SESSION = "portfolio_admin_session";
  const COOKIE_STATE = "portfolio_admin_state";
  const SESSION_TTL_SECONDS = 60 * 60 * 8;

  export default {
    async fetch(request, env) {
      const url = new URL(request.url);
      const { pathname } = url;

      if (request.method === "OPTIONS") {
        return withCors(request, env, new Response(null, { status: 204 }));
      }

      try {
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
        if (pathname === "/api/admin/content/read" && request.method === "GET") {
          return withCors(request, env, await readContent(url, request, env));
        }
        if (pathname === "/api/admin/content/save" && request.method === "POST") {
          return withCors(request, env, await saveContent(request, env));
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
        return withCors(request, env, json({ ok: false, error: "Not found" }, 404));
      } catch (error) {
        return withCors(request, env, json({ ok: false, error: error.message || "Unknown error" }, 500));
      }
    }
  };

  function getAllowedOrigin(request, env) {
    const origin = request.headers.get("origin") || "";
    const allowlist = (env.ALLOWED_ORIGINS || "").split(",").map((v) => v.trim()).filter(Boolean);
    if (!origin) return "*";
    if (!allowlist.length) return origin;
    return allowlist.includes(origin) ? origin : "null";
  }

  function withCors(request, env, response) {
    const allowedOrigin = getAllowedOrigin(request, env);
    // Response.redirect() and some Responses use immutable headers; copy then extend.
    const headers = new Headers(response.headers);
    headers.set("access-control-allow-origin", allowedOrigin);
    headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
    headers.set("access-control-allow-headers", "content-type,authorization");
    headers.set("access-control-allow-credentials", "true");
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

  function makeCookie(name, value, maxAgeSeconds) {
    return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
  }

  function clearCookie(name) {
    return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
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
    headers.append("set-cookie", makeCookie(COOKIE_STATE, signedState, 600));
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
    const successRedirect = env.ADMIN_SUCCESS_REDIRECT || getDefaultSuccessRedirect(env);
    const headers = new Headers();
    headers.set("Location", successRedirect);
    headers.append("set-cookie", makeCookie(COOKIE_SESSION, sessionToken, SESSION_TTL_SECONDS));
    headers.append("set-cookie", clearCookie(COOKIE_STATE));
    return new Response(null, { status: 302, headers });
  }

  async function logout() {
    const headers = new Headers(JSON_HEADERS);
    headers.append("set-cookie", clearCookie(COOKIE_SESSION));
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  async function getSessionUser(request, env) {
    const cookies = parseCookieMap(request);
    const token = cookies[COOKIE_SESSION];
    const session = await verifySignedToken(token, env.SESSION_SIGNING_KEY);
    if (!session || !session.user) return null;
    return session.user;
  }

  async function getSessionStatus(request, env) {
    const user = await getSessionUser(request, env);
    return json({ ok: !!user, user: user || null });
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
      return `${firstAllowedOrigin}/dev/index.html`;
    }
    return "https://sumit.indevs.in/dev/index.html";
  }

  function mapTargetPath(target) {
    if (target === "projects") return "data/projects.json";
    if (target === "caseStudies") return "data/case_studies.json";
    if (target === "homepage") return "data/homepage-content.json";
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

  async function readContent(url, request, env) {
    const user = await getSessionUser(request, env);
    if (!user) return json({ ok: false, error: "Unauthorized" }, 401);

    const target = url.searchParams.get("target") || "homepage";
    const slug = url.searchParams.get("slug") || "";
    const branch = env.CONTENT_DRAFT_BRANCH || "content/drafts";
    const base = getContentBaseBranch(env);
    await ensureBranchExists(env, branch, base);

    const path = mapTargetPath(target);
    const file = await getFileFromGithub(env, path, branch) || await getFileFromGithub(env, path, base);
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

    if (Array.isArray(parsed)) {
      if (!slug) return json({ ok: false, error: "slug is required for list content" }, 400);
      const found = parsed.find((r) => r.id === slug);
      if (!found) return json({ ok: false, error: `No record found for slug: ${slug}` }, 404);
      return json({ ok: true, target, slug, editorData: found.editor_content || toEditorDataFromRecord(found) });
    }
    return json({ ok: true, target, slug, editorData: parsed.editor_content || parsed });
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

    const existing = await getFileFromGithub(env, path, draftBranch) || await getFileFromGithub(env, path, baseBranch);
    let contentObj;
    let sha = null;

    if (existing) {
      sha = existing.sha;
      contentObj = JSON.parse(existing.text);
    } else {
      contentObj = target === "homepage" ? {} : [];
    }

    if (Array.isArray(contentObj)) {
      if (!slug) return json({ ok: false, error: "slug is required for list content" }, 400);
      const idx = contentObj.findIndex((item) => item.id === slug);
      if (idx >= 0) {
        contentObj[idx] = updateRecordFromEditor(contentObj[idx], body);
      } else {
        contentObj.unshift(updateRecordFromEditor({ id: slug, title: slug, short_description: "" }, body));
      }
    } else {
      contentObj = {
        ...contentObj,
        editor_content: body.content,
        updated_at: new Date().toISOString()
      };
    }

    const nextText = JSON.stringify(contentObj, null, 2);
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
    const existing =
      (await getFileFromGithub(env, HOMEPAGE_UI_PATH, draftBranch)) ||
      (await getFileFromGithub(env, HOMEPAGE_UI_PATH, baseBranch));
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
      existing?.sha || null
    );
    return json({
      ok: true,
      ui: next,
      branch: draftBranch,
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

    const existing = await getFileFromGithub(env, finalPath, draftBranch) || await getFileFromGithub(env, finalPath, baseBranch);
    const sha = existing?.sha || null;

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
