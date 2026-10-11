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

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const cors = corsHeaders(origin, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "POST only" }, 405, cors);

    let body;
    try { body = await request.json(); } catch { return json({ error: "invalid JSON body" }, 400, cors); }
    const code = String(body.code || "").trim();
    const slug = String(body.slug || "").trim();
    const prompt = String(body.prompt || "").trim();
    const ownKey = typeof body.jevKey === "string" ? body.jevKey.trim() : "";
    if (!code) return json({ error: "缺少要评分的 HTML(code)。" }, 400, cors);
    if (code.length > 400000) return json({ error: "HTML 太大,无法评分。" }, 413, cors);

    // Quota: only our key is metered; a user's own key bypasses it.
    const limit = Number(env.FREE_LIMIT || 3);
    let remaining = null;
    const useOurKey = !ownKey;
    if (useOurKey) {
      if (!env.TYPESAFE_API_KEY) return json({ error: "本站未配置 Jev 额度,请填入你自己的 Jev Key。" }, 503, cors);
      const q = await checkQuota(env, request, limit);
      if (!q.ok) return json({ error: `本站的免费额度已用完(每人 ${limit} 次)。请填入你自己的 Jev Key 继续。`, remaining: 0 }, 429, cors);
      remaining = q.remaining;
    }
    const key = ownKey || env.TYPESAFE_API_KEY;

    // Optional: render + caption so Jev sees the actual picture (方案 b).
    let depiction = "", rendering = "web page (HTML/CSS/JS)", hadScreenshot = false;
    if (String(env.USE_SCREENSHOT || "") === "1" && env.BROWSER && env.VISION_API_KEY) {
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
      return json({ ...scored, usedOurKey: useOurKey, remaining, hadScreenshot }, 200, cors);
    } catch (e) {
      // Roll the quota back if we metered a call that then failed.
      if (useOurKey) await refundQuota(env, request).catch(() => {});
      return json({ error: "Jev 评分失败:" + String(e.message || e) }, 502, cors);
    }
  },
};
// __REST__

// ---- CORS ----
function corsHeaders(origin, env) {
  const allowed = String(env.ALLOWED_ORIGINS || DEFAULT_ORIGINS).split(",").map((s) => s.trim());
  const ok = allowed.includes(origin);
  return {
    "Access-Control-Allow-Origin": ok ? origin : allowed[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors },
  });
}

// ---- quota (per visitor IP, per UTC day) ----
async function quotaKey(env, request) {
  const ip = request.headers.get("CF-Connecting-IP") || "0.0.0.0";
  const day = new Date().toISOString().slice(0, 10);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + "|" + day));
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return "q:" + day + ":" + hex.slice(0, 32);
}
async function checkQuota(env, request, limit) {
  if (!env.QUOTA) return { ok: true, remaining: null }; // KV unbound → don't block
  const k = await quotaKey(env, request);
  const used = Number((await env.QUOTA.get(k)) || 0);
  if (used >= limit) return { ok: false, remaining: 0 };
  await env.QUOTA.put(k, String(used + 1), { expirationTtl: 60 * 60 * 36 });
  return { ok: true, remaining: Math.max(0, limit - used - 1) };
}
async function refundQuota(env, request) {
  if (!env.QUOTA) return;
  const k = await quotaKey(env, request);
  const used = Number((await env.QUOTA.get(k)) || 0);
  if (used > 0) await env.QUOTA.put(k, String(used - 1), { expirationTtl: 60 * 60 * 36 });
}

// ---- screenshot (Cloudflare Browser Rendering) ----
async function screenshot(env, code) {
  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
    await page.setContent(code, { waitUntil: "networkidle0", timeout: 20000 });
    await new Promise((r) => setTimeout(r, 1500)); // let animations settle
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
    });
    if (res.status === 429 || res.status === 529) { await sleep(1500 * (attempt + 1)); continue; }
    if (!res.ok) throw new Error("HTTP " + res.status + " " + (await res.text()).slice(0, 200));
    return res.json();
  }
  throw new Error("Jev 重试次数耗尽");
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));


