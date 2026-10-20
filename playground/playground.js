// 测试你的大模型 — fully client-side tester for OpenAI-compatible endpoints.
// The browser calls the user's own endpoint directly; the key is kept only in
// memory only; optional non-secret configuration can be saved to localStorage. Output is rendered in a sandboxed iframe
// (sandbox="allow-scripts", NO allow-same-origin) so it can never read the key.
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const LS = "zoo-pg-cfg-v1";
  const el = {
    base: $("pg-base"), model: $("pg-model"), key: $("pg-keyin"), eye: $("pg-eye"),
    remember: $("pg-remember"), forget: $("pg-forget"), preset: $("pg-preset"),
    text: $("pg-text"), run: $("pg-run"), stop: $("pg-stop"), status: $("pg-status"),
    frame: $("pg-frame"), raw: $("pg-rawtext"), dl: $("pg-dl"), open: $("pg-open"),
    // Jev scoring (present only when a Worker endpoint is configured)
    jevCard: $("pg-jev"), score: $("pg-score"), jevStatus: $("pg-jev-status"),
    jevResult: $("pg-jev-result"), jevKey: $("pg-jevkey"), jevKeyWrap: $("pg-jevkey-wrap"),
    jevOwn: $("pg-jev-own"), jevOurs: $("pg-jev-ours"),
  };
  const prompts = JSON.parse($("zoo-prompts").textContent || "[]");

  // ---- config persistence (browser only) ----
  // API keys are NEVER persisted. Strip keys saved by older versions at startup.
  function loadCfg() {
    let cfg = {};
    try {
      cfg = JSON.parse(localStorage.getItem(LS) || "{}") || {};
      if (Object.prototype.hasOwnProperty.call(cfg, "key")) {
        localStorage.removeItem(LS);
        if (cfg.remember) localStorage.setItem(LS, JSON.stringify({
          base: cfg.base || "", model: cfg.model || "", remember: true,
        }));
      }
    } catch (_) { cfg = {}; }
    el.base.value = cfg.base || "";
    el.model.value = cfg.model || "";
    el.key.value = "";
    el.remember.checked = !!cfg.remember;
  }
  function saveCfg() {
    try {
      if (el.remember.checked) {
        localStorage.setItem(LS, JSON.stringify({
          base: el.base.value.trim(), model: el.model.value.trim(), remember: true,
        }));
      } else {
        localStorage.removeItem(LS);
      }
    } catch (_) { /* localStorage may be unavailable; no secrets are stored */ }
  }
  function forgetKey() {
    el.key.value = "";
    el.remember.checked = false;
    try { localStorage.removeItem(LS); } catch (_) {}
    setStatus("已清除当前密钥和本地配置。", "ok");
  }

  // ---- prompt picker ----
  function initPrompts() {
    el.preset.innerHTML =
      '<option value="__custom">✍️ 自定义(自己写提示词)</option>' +
      prompts.map((p, i) => `<option value="${i}">${p.emoji} ${p.title}</option>`).join("");
    el.preset.addEventListener("change", () => {
      const v = el.preset.value;
      if (v === "__custom") return;
      el.text.value = prompts[Number(v)].prompt;
    });
    if (prompts.length) { el.preset.value = "0"; el.text.value = prompts[0].prompt; }
  }

  function setStatus(msg, kind) {
    el.status.textContent = msg || "";
    el.status.className = "pg-status" + (kind ? " " + kind : "");
  }

  // ---- extract a self-contained HTML document from the model reply ----
  function extractHtml(text) {
    let m = text.match(/```(?:html|HTML)\s*\n([\s\S]*?)```/);
    if (m) return m[1].trim();
    const blocks = [...text.matchAll(/```[a-zA-Z]*\s*\n([\s\S]*?)```/g)].map((b) => b[1]);
    for (const b of blocks) if (/<!doctype html|<html[\s>]/i.test(b)) return b.trim();
    const i = text.search(/<!doctype html|<html[\s>]/i);
    if (i >= 0) return text.slice(i).trim();
    return null;
  }

  let lastHtml = "";
  function showPreview(html) {
    lastHtml = html;
    el.frame.srcdoc = html;
    el.dl.disabled = el.open.disabled = false;
    if (el.score) {
      el.score.disabled = false;
      el.jevResult.hidden = true;
      el.jevResult.innerHTML = "";
      setJevStatus("", "");
    }
  }
  function currentSlug() {
    const v = el.preset.value;
    return v === "__custom" ? "model-output" : prompts[Number(v)].slug;
  }
  function download() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([lastHtml], { type: "text/html" }));
    a.download = currentSlug() + ".html";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function openTab() {
    if (!lastHtml) return;
    // Never open untrusted HTML as a same-origin top-level blob: page scripts
    // would inherit our origin. Only a trusted shell may hold the sandbox.
    const tab = window.open("preview.html", "_blank");
    if (!tab) return setStatus("浏览器阻止了新窗口，请允许弹出窗口后重试。", "err");
    const html = lastHtml;
    const onReady = (event) => {
      if (event.origin !== location.origin || event.source !== tab ||
          event.data?.type !== "agent-test-preview-ready") return;
      window.removeEventListener("message", onReady);
      tab.postMessage({ type: "agent-test-preview", html }, location.origin);
    };
    window.addEventListener("message", onReady);
    // Clean up when popups are closed or fail to load.
    setTimeout(() => window.removeEventListener("message", onReady), 15000);
  }

  // ---- run ----
  let ac = null;
  async function run() {
    const base = el.base.value.trim().replace(/\/+$/, "");
    const model = el.model.value.trim();
    const key = el.key.value.trim();
    const prompt = el.text.value.trim();
    if (!base || !model || !key) return setStatus("请先填 Base URL、模型名和 API Key。", "err");
    if (!prompt) return setStatus("提示词不能为空。", "err");
    saveCfg();
    setRunning(true);
    setStatus("请求中…", "");
    el.raw.textContent = "";
    el.frame.srcdoc = "";
    el.dl.disabled = el.open.disabled = true;

    ac = new AbortController();
    let full = "";
    try {
      const res = await fetch(base + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({ model, stream: true, messages: [{ role: "user", content: prompt }] }),
        signal: ac.signal,
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${res.statusText}${t ? " — " + t.slice(0, 300) : ""}`);
      }
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("text/event-stream") && res.body) {
        full = await readStream(res, (s) => { el.raw.textContent = s; });
      } else {
        const j = await res.json();
        full = j.choices?.[0]?.message?.content ?? j.choices?.[0]?.text ?? JSON.stringify(j, null, 2);
        el.raw.textContent = full;
      }
    } catch (err) {
      setRunning(false);
      if (err.name === "AbortError") return setStatus("已停止。", "");
      return setStatus(hint(err), "err");
    }
    setRunning(false);
    const html = extractHtml(full);
    if (html) { showPreview(html); setStatus("完成 ✓ 已渲染模型输出。", "ok"); }
    else setStatus("完成,但没能从回复里找到完整的 HTML。见下方原始输出。", "err");
  }

  async function readStream(res, onText) {
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", full = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const j = JSON.parse(data);
          const d = j.choices?.[0]?.delta?.content ?? j.choices?.[0]?.text ?? "";
          if (d) { full += d; onText(full); }
        } catch (_) {}
      }
    }
    return full;
  }

  function hint(err) {
    const m = String(err.message || err);
    if (err instanceof TypeError)
      return "请求失败,通常是该接口未开放浏览器跨域(CORS),或 Base URL 写错。本工具不经过任何服务器,只能连支持 CORS 的接口。原始错误:" + m;
    return "请求失败:" + m;
  }

  function setRunning(on) {
    el.run.disabled = on;
    el.stop.disabled = !on;
  }

  // ---- Jev scoring (via the Worker; see worker/) ----
  const JEV = (window.ZOO_JEV_ENDPOINT || "").replace(/\/+$/, "");
  function setJevStatus(msg, kind) {
    if (!el.jevStatus) return;
    el.jevStatus.textContent = msg || "";
    el.jevStatus.className = "pg-status" + (kind ? " " + kind : "");
  }
  function tier(f) { return f >= 0.8 ? "hi" : f < 0.5 ? "lo" : "mid"; }
  function renderScore(s) {
    const cls = s.total >= 85 ? " hi" : s.total < 50 ? " lo" : "";
    const bars = Object.keys(s.dimLabels).map((k) => {
      const v = Math.round((s.dims[k]?.frac || 0) * 100);
      const t = tier(s.dims[k]?.frac || 0);
      return `<div class="d"><div class="dh"><span>${s.dimLabels[k]}</span><em class="${t}">${v}</em></div>`
        + `<div class="tr"><div class="fl ${t}" style="width:${v}%"></div></div></div>`;
    }).join("");
    const quota = s.usedOurKey && s.remaining != null
      ? `<span class="pg-quota">本站额度剩 ${s.remaining} 次</span>` : "";
    const vis = s.hadScreenshot ? "截图描述 + 代码" : "仅代码";
    el.jevResult.innerHTML =
      `<div class="pg-score-top"><span class="score${cls}"><b>${s.total}</b><span class="j">Jev</span></span>`
      + `<span class="pg-score-meta">判定模型 <b>${s.jev || "jev"}</b> · 依据:${vis}</span>${quota}</div>`
      + `<div class="dims">${bars}</div>`;
    el.jevResult.hidden = false;
  }
  async function scoreWithJev() {
    if (!lastHtml) return setJevStatus("请先运行并渲染出结果。", "err");
    if (!JEV) return setJevStatus("本站未配置 Jev 评分服务。", "err");
    const own = el.jevOwn && el.jevOwn.checked;
    const jevKey = own ? el.jevKey.value.trim() : "";
    if (own && !jevKey) return setJevStatus("请填入你自己的 Jev Key。", "err");
    const v = el.preset.value;
    const slug = v === "__custom" ? "" : prompts[Number(v)].slug;
    el.score.disabled = true;
    setJevStatus("评分中…(服务端渲染 + 判定,约需十几秒)", "");
    try {
      const res = await fetch(JEV + "/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, prompt: el.text.value.trim(), code: lastHtml, jevKey }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || `HTTP ${res.status}`);
      renderScore(j);
      setJevStatus("评分完成 ✓", "ok");
    } catch (err) {
      setJevStatus((err instanceof TypeError ? "无法连接评分服务(网络或 CORS):" : "评分失败:") + (err.message || err), "err");
    } finally {
      el.score.disabled = false;
    }
  }

  // ---- wire up ----
  loadCfg();
  initPrompts();
  el.run.addEventListener("click", run);
  el.stop.addEventListener("click", () => ac && ac.abort());
  el.forget.addEventListener("click", forgetKey);
  el.dl.addEventListener("click", download);
  el.open.addEventListener("click", openTab);
  el.eye.addEventListener("click", () => {
    const show = el.key.type === "password";
    el.key.type = show ? "text" : "password";
    el.eye.textContent = show ? "隐藏" : "显示";
  });
  ["base", "model"].forEach((k) => el[k].addEventListener("change", saveCfg));
  el.remember.addEventListener("change", saveCfg);
  if (el.score) {
    el.score.addEventListener("click", scoreWithJev);
    const toggleKey = () => { el.jevKeyWrap.style.display = el.jevOwn.checked ? "" : "none"; };
    el.jevOwn.addEventListener("change", toggleKey);
    el.jevOurs.addEventListener("change", toggleKey);
  }
})();
