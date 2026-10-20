// Zoo Test — Jev scoring Worker.
//
// Why this exists: the playground is a pure static page and cannot do
// "our shared Jev key, 3 free scores per visitor" safely (an embedded key
// leaks instantly; a localStorage counter is trivially reset), and TypeSafe's
// API is region/CORS-blocked from the browser anyway. This Worker holds the
// Jev key as a secret, enforces a per-visitor quota in KV, and proxies the
// call — and optionally renders the user's HTML to a screenshot (Cloudflare
// Browser Rendering) and captions it with a vision model so Jev (text-only)
// has a faithful depiction of the result (方案 b) alongside the source (方案 c).
//
// Bindings / vars (see wrangler.toml):
//   secret TYPESAFE_API_KEY   our Jev key (ROTATE the exposed one first)
//   KV     QUOTA               per-visitor free-use counter
//   var    FREE_LIMIT          free scores per visitor per day (default 3)
//   var    ALLOWED_ORIGINS     comma-separated allowed browser origins
//   var    USE_SCREENSHOT      "1" to render+caption (needs BROWSER + vision)
//   browser BROWSER            Cloudflare Browser Rendering (Workers Paid)
//   secret VISION_API_KEY / var VISION_BASE_URL / var VISION_MODEL  caption model
import puppeteer from "@cloudflare/puppeteer";
import { getRubric } from "./rubrics.js";

const JEV_URL = "https://api.typesafe.ai/v1/systemone";
const DEFAULT_ORIGINS = "https://agentest.shimiao.work,http://localhost:8080,http://127.0.0.1:8080";
const MAX_REQUEST_BYTES = 1_600_000;
// Only known public CDNs are reachable by the untrusted screenshot page.
// No arbitrary web hosts, private IPs, localhost, or plain HTTP.
const SCREENSHOT_HOSTS = new Set([
  "cdnjs.cloudflare.com", "cdn.jsdelivr.net", "unpkg.com",
  "fonts.googleapis.com", "fonts.gstatic.com",
]);

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);
    // Origin is browser isolation only, NOT authentication for non-browser clients.
    if (origin && !allowedOrigin(origin, env)) {
      return json({ error: "Origin not allowed" }, 403, {});
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "POST only" }, 405, cors);

    let body;
    try { body = await readJsonBounded(request); }
    catch (e) { return json({ error: e.message || "invalid JSON body" }, e.status || 400, cors); }
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return json({ error: "body must be an object" }, 400, cors);
    }
    const code = typeof body.code === "string" ? body.code.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug.trim().slice(0, 80) : "";
    const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 4000) : "";
    const ownKey = typeof body.jevKey === "string" ? body.jevKey.trim() : "";
    if (!code) return json({ error: "缺少要评分的 HTML(code)。" }, 400, cors);
    if (code.length > 400000) return json({ error: "HTML 太大,无法评分。" }, 413, cors);

    // Quota: only our key is metered; a user's own key bypasses it.
    const limit = Number(env.FREE_LIMIT || 3);
    const dailyBudget = Number(env.GLOBAL_DAILY_LIMIT || 100);
    let remaining = null;
    let reservation = null;
    const useOurKey = !ownKey;
    if (useOurKey) {
      if (!env.TYPESAFE_API_KEY) return json({ error: "本站未配置 Jev 额度,请填入你自己的 Jev Key。" }, 503, cors);
      if (!Number.isSafeInteger(limit) || limit < 1 ||
          !Number.isSafeInteger(dailyBudget) || dailyBudget < 1) {
        return json({ error: "评分配额配置无效。" }, 503, cors);
      }
      try {
        reservation = await reserveQuota(env, request, limit, dailyBudget);
      } catch (_) {
        // Fail closed: never allow unmetered shared-key requests.
        return json({ error: "免费额度系统暂时不可用，请改用自己的 Jev Key。" }, 503, cors);
      }
      if (!reservation.ok) {
        return json({ error: reservation.reason === "daily-budget"
          ? "本站今日免费评分总额度已用完。"
          : `免费额度已用完（同一网络每日 ${limit} 次）。`, remaining: 0 }, 429, cors);
      }
      remaining = reservation.remaining;
    }
    const key = ownKey || env.TYPESAFE_API_KEY;

    // Optional: render + caption so Jev sees the actual picture (方案 b).
    let depiction = "", rendering = "web page (HTML/CSS/JS)", hadScreenshot = false;
    // The vision API uses our billing account. BYOK Jev requests must not
    // bypass the shared quota and still consume our paid vision resources.
    if (useOurKey && String(env.USE_SCREENSHOT || "") === "1" && env.BROWSER && env.VISION_API_KEY) {
      try {
        const shot = await screenshot(env, code);
        depiction = await caption(env, shot, prompt || slug);
        hadScreenshot = true;
      } catch (e) {
        depiction = "";
      }
    }

    try {
      const scored = await scoreWithJev({ key, slug, prompt, code, depiction, rendering });
      if (reservation) await finalizeQuota(env, reservation).catch(() => {});
      return json({ ...scored, usedOurKey: useOurKey, remaining, hadScreenshot }, 200, cors);
    } catch (e) {
      if (reservation) await refundQuota(env, reservation).catch(() => {});
      return json({ error: "Jev 评分失败:" + String(e.message || e) }, 502, cors);
    }
  },
};
// __REST__

// ---- request boundary and browser CORS ----
function allowedOrigin(origin, env) {
  const allowed = String(env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(",").map((s) => s.trim());
  return allowed.includes(origin);
}
function corsHeaders(origin, env) {
  return {
    ...(allowedOrigin(origin, env) ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
function json(obj, status, headers = {}) {
  return new Response(JSON.stringify(obj), {
    status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}
async function readJsonBounded(request) {
  const length = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(length) && length > MAX_REQUEST_BYTES) {
    throw Object.assign(new Error("请求内容太大。"), { status: 413 });
  }
  if (!request.body) throw new Error("missing request body");
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw Object.assign(new Error("请求内容太大。"), { status: 413 });
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(total);
  let pos = 0;
  for (const chunk of chunks) { bytes.set(chunk, pos); pos += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch (_) { throw new Error("invalid JSON body"); }
}

// ---- atomic quota with Durable Objects ----
async function getVisitorHash(request) {
  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip) throw new Error("missing Cloudflare visitor IP");
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function quotaStub(env, day) {
  if (!env.QUOTA_LIMITER) throw new Error("QUOTA_LIMITER is not bound");
  return env.QUOTA_LIMITER.get(env.QUOTA_LIMITER.idFromName("quota:" + day));
}
async function quotaAction(env, reservation, action) {
  const stub = await quotaStub(env, reservation.day);
  const res = await stub.fetch("https://quota.internal/" + action, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(reservation),
  });
  if (!res.ok) throw new Error("quota " + action + " failed");
  return res.json();
}
async function reserveQuota(env, request, limit, dailyBudget) {
  const day = new Date().toISOString().slice(0, 10);
  const identity = await getVisitorHash(request);
  const reservation = { day, identity, requestId: crypto.randomUUID(), limit, dailyBudget };
  return { ...reservation, ...await quotaAction(env, reservation, "reserve") };
}
async function refundQuota(env, reservation) {
  await quotaAction(env, reservation, "refund");
}
async function finalizeQuota(env, reservation) {
  await quotaAction(env, reservation, "finalize");
}

// One Durable Object instance per UTC day. Transactions serialize reservations,
// including the global cost budget, even under concurrent requests.
export { QuotaLimiter } from "./quota.js";

// ---- screenshot (Cloudflare Browser Rendering) ----
async function screenshot(env, code) {
  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      let safe = false;
      try {
        const url = new URL(req.url());
        safe = ["about:", "blob:", "data:"].includes(url.protocol) ||
          (url.protocol === "https:" && SCREENSHOT_HOSTS.has(url.hostname));
      } catch (_) {}
      const pending = safe ? req.continue() : req.abort("blockedbyclient");
      pending.catch(() => {});
    });
    // CSP blocks WebSocket/fetch/beacon connections that do not reliably pass
    // Puppeteer's resource-request interception. Insert it before user scripts.
    const policy = "default-src 'none'; " +
      "script-src 'unsafe-inline' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com; " +
      "style-src 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src data: blob: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://unpkg.com; " +
      "font-src data: https://fonts.gstatic.com; " +
      "connect-src 'none'; form-action 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'";
    const meta = '<meta http-equiv="Content-Security-Policy" content="' + policy + '">';
    const guarded = /<head[\\s>]/i.test(code)
      ? code.replace(/<head[^>]*>/i, (match) => match + meta)
      : /<html[\\s>]/i.test(code)
        ? code.replace(/<html[^>]*>/i, (match) => match + "<head>" + meta + "</head>")
        : meta + code;
    await page.setContent(guarded, { waitUntil: "domcontentloaded", timeout: 12000 });
    await new Promise((r) => setTimeout(r, 1000)); // let animations settle
    const png = await page.screenshot({ type: "png", clip: { x: 0, y: 0, width: 1280, height: 800 } });
    return "data:image/png;base64," + base64(png);
  } finally {
    await browser.close();
  }
}
function base64(buf) {
  let s = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

// ---- vision caption → neutral depiction (方案 b) ----
async function caption(env, dataUrl, taskHint) {
  const base = String(env.VISION_BASE_URL || "").replace(/\/+$/, "");
  const sys =
    "You describe a rendered web-page screenshot in 2-4 neutral, factual sentences for a text-only judge. " +
    "State only what is visibly present (subject, structure, motion cues, colors, composition). " +
    "Do NOT praise, rate, or give opinions. Task context: " + (taskHint || "a creative web page");
  const res = await fetch(base + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + env.VISION_API_KEY },
    body: JSON.stringify({
      model: env.VISION_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: [
          { type: "text", text: "Describe this rendered output factually." },
          { type: "image_url", image_url: { url: dataUrl } },
        ] },
      ],
    }),
  });
  if (!res.ok) throw new Error("vision HTTP " + res.status);
  const j = await res.json();
  return (j.choices?.[0]?.message?.content || "").trim();
}
// __JEV__

// ---- Jev scoring (same math as the site's jev-score*.mjs) ----
async function scoreWithJev({ key, slug, prompt, code, depiction, rendering }) {
  const rubric = getRubric(slug, prompt);
  const questions = Object.fromEntries(
    Object.entries(rubric.dims).map(([k, d]) => [k, { type: "score", instructions: d.instructions, criteria: d.criteria }])
  );
  // state: task framing + the depiction (方案 b, vision caption) + the source
  // code (方案 c). When no screenshot was taken, Jev judges from the code alone.
  const state = {
    task: rubric.task,
    rendering,
    depiction: depiction || "(No rendered screenshot was available; judge from the source code below.)",
    source: code.slice(0, 60000),
  };
  const r = await jevCall(key, { model: "jev-latest", state, questions });

  const dims = {};
  let total = 0;
  for (const [k, d] of Object.entries(rubric.dims)) {
    const a = r.answers?.[k];
    if (!a) throw new Error("Jev 返回缺少维度 " + k);
    const maxLevel = d.criteria.length - 1;
    const frac = a.score / maxLevel;
    dims[k] = { score: +Number(a.score).toFixed(2), confidence: +Number(a.confidence ?? 0).toFixed(2), frac: +frac.toFixed(3) };
    total += d.weight * frac;
  }
  return {
    total: Math.round(total),
    dims,
    dimLabels: rubric.dimLabels,
    weights: Object.fromEntries(Object.entries(rubric.dims).map(([k, d]) => [k, d.weight])),
    jev: r.model || "jev",
  };
}
async function jevCall(key, payload) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(JEV_URL, {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });
    if (res.status === 429 || res.status === 529) { await sleep(1500 * (attempt + 1)); continue; }
    if (!res.ok) throw new Error("HTTP " + res.status + " " + (await res.text()).slice(0, 200));
    return res.json();
  }
  throw new Error("Jev 重试次数耗尽");
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


