import { readChatStream } from "./stream.mjs";
import { validateScoreResponse } from "./score.mjs";
// 测试你的大模型 — fully client-side tester for OpenAI-compatible endpoints.
// The browser calls the user's own endpoint directly; the key is kept only in
// memory; non-secret configuration optionally persists. Output renders in a sandboxed iframe.
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

  let result = null;
  let runToken = 0;
  let scoreToken = 0;
  let scoreAbort = null;
  const rawLimit = 400000;

  function resetScore() {
    if (!el.score) return;
    el.score.disabled = true;
    el.jevResult.hidden = true;
    el.jevResult.replaceChildren();
    setJevStatus("", "");
  }

  function resetResult() {
    result = null;
    el.frame.srcdoc = "";
    el.dl.disabled = true;
    el.open.disabled = true;
    resetScore();
  }

  function showPreview(output) {
    result = Object.freeze(output);
    el.frame.srcdoc = output.html;
    el.dl.disabled = el.open.disabled = false;
    if (el.score) el.score.disabled = false;
  }

  function currentSlug() {
    return result?.slug || "model-output";
  }

  function download() {
    if (!result) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([result.html], { type: "text/html" }));
    a.download = currentSlug() + ".html";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  function openTab() {
    if (!result) return;
    // A trusted same-origin shell holds the sandbox; never execute the output
    // in a top-level Blob URL (which could inherit our origin).
    const tab = window.open("preview.html", "_blank");
    if (!tab) return setStatus("浏览器阻止了新窗口，请允许弹出窗口后重试。", "err");
    const html = result.html;
    const onReady = (event) => {
      if (event.origin !== location.origin || event.source !== tab ||
          event.data?.type !== "agent-test-preview-ready") return;
      window.removeEventListener("message", onReady);
      tab.postMessage({ type: "agent-test-preview", html }, location.origin);
    };
    window.addEventListener("message", onReady);
    setTimeout(() => window.removeEventListener("message", onReady), 15000);
  }

  // ---- run ----
  let ac = null;

  function scheduleRawUpdate(runId) {
    let pending = "";
    let scheduled = false;
    return {
      update(value) {
        pending = value;
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
          scheduled = false;
          if (runId === runToken) el.raw.textContent = pending.slice(-rawLimit);
        });
      },
      flush(value) {
        pending = value;
        if (runId === runToken) el.raw.textContent = pending.slice(-rawLimit);
      },
    };
  }

  function getSelectedTask() {
    const v = el.preset.value;
    return {
      slug: v === "__custom" ? "model-output" : (prompts[Number(v)]?.slug || "model-output"),
      prompt: el.text.value.trim(),
    };
  }

  async function run() {
    const base = el.base.value.trim().replace(/\/+$/, "");
    const model = el.model.value.trim();
    const key = el.key.value.trim();
    const { slug, prompt } = getSelectedTask();
    if (!base || !model || !key) return setStatus("请先填 Base URL、模型名和 API Key。", "err");
    if (!prompt) return setStatus("提示词不能为空。", "err");
    saveCfg();
    const id = ++runToken;
    ++scoreToken;
    scoreAbort?.abort();
    scoreAbort = null;
    ac?.abort();
    const controller = new AbortController();
    ac = controller;
    resetResult();
    setRunning(true);
    setStatus("请求中…", "");
    el.raw.textContent = "";
    const rawUpdate = scheduleRawUpdate(id);

    let full = "";
    try {
      const res = await fetch(base + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({ model, stream: true, messages: [{ role: "user", content: prompt }] }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error("HTTP " + res.status + " " + res.statusText + (t ? " — " + t.slice(0, 300) : ""));
      }
      const ct = res.headers.get("content-type") || "";
      if (ct.includes("text/event-stream") && res.body) {
        full = await readChatStream(res, (value) => rawUpdate.update(value));
      } else {
        const j = await res.json();
        const content = j.choices?.[0]?.message?.content ?? j.choices?.[0]?.text;
        full = typeof content === "string" ? content : JSON.stringify(j, null, 2);
      }
      if (id !== runToken || controller.signal.aborted) return;
      rawUpdate.flush(full);
      const html = extractHtml(full);
      if (html) {
        showPreview({ id, html, prompt, slug, model, createdAt: Date.now() });
        setStatus("完成 ✓ 已渲染模型输出。评分会使用生成时的题目。", "ok");
      } else {
        setStatus("完成，但未从回复中找到完整 HTML。见下方原始输出。", "err");
      }
    } catch (err) {
      if (id !== runToken) return;
      setStatus(controller.signal.aborted || err.name === "AbortError" ? "已停止。" : hint(err),
        controller.signal.aborted || err.name === "AbortError" ? "" : "err");
    } finally {
      if (id === runToken) {
        ac = null;
        setRunning(false);
      }
    }
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
  function node(tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = String(value);
    return el;
  }
  function renderScore(payload) {
    const s = validateScoreResponse(payload);
    const top = node("div", "pg-score-top");
    const badge = node("span", "score" + (s.total >= 85 ? " hi" : s.total < 50 ? " lo" : ""));
    badge.append(node("b", "", s.total), node("span", "j", "Jev"));
    top.append(badge, node("span", "pg-score-meta",
      "判定模型 " + s.model + " · 依据：" + s.basis +
      (s.sourceTruncated ? "（源码已截断）" : "")));
    if (s.usedOurKey && s.remaining !== null) {
      top.append(node("span", "pg-quota", "本站额度剩 " + s.remaining + " 次"));
    }
    const grid = node("div", "dims");
    for (const d of s.dimensions) {
      const percent = Math.round(d.frac * 100);
      const level = tier(d.frac);
      const cell = node("div", "d");
      const heading = node("div", "dh");
      heading.append(node("span", "", d.label), node("em", level, percent));
      const track = node("div", "tr");
      const fill = node("div", "fl " + level);
      fill.style.width = percent + "%";
      track.append(fill);
      cell.append(heading, track);
      grid.append(cell);
    }
    el.jevResult.replaceChildren(top, grid);
    el.jevResult.hidden = false;
  }

  async function scoreWithJev() {
    const scoredResult = result;
    if (!scoredResult) return setJevStatus("请先运行并渲染出结果。", "err");
    if (!JEV) return setJevStatus("本站未配置 Jev 评分服务。", "err");
    const own = Boolean(el.jevOwn?.checked);
    const jevKey = own ? el.jevKey.value.trim() : "";
    if (own && !jevKey) return setJevStatus("请填入你自己的 Jev Key。", "err");
    scoreAbort?.abort();
    const controller = new AbortController();
    scoreAbort = controller;
    const id = ++scoreToken;
    el.score.disabled = true;
    setJevStatus("评分中… · 以实际返回的评分依据为准", "");
    try {
      const res = await fetch(JEV + "/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: scoredResult.slug === "model-output" ? "" : scoredResult.slug,
          prompt: scoredResult.prompt,
          code: scoredResult.html, jevKey,
        }),
        signal: controller.signal,
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "HTTP " + res.status);
      if (id !== scoreToken || result !== scoredResult) return;
      renderScore(j);
      setJevStatus("评分完成 ✓（" + (j.hadScreenshot ? "单帧截图描述 + 代码" : "仅代码推断") + "）", "ok");
    } catch (err) {
      if (id !== scoreToken || result !== scoredResult) return;
      if (controller.signal.aborted || err.name === "AbortError") return;
      setJevStatus((err instanceof TypeError ? "无法连接评分服务（网络或 CORS）：" : "评分失败：") +
        (err.message || err), "err");
    } finally {
      if (id === scoreToken) {
        scoreAbort = null;
        el.score.disabled = !result;
      }
    }
  }

  // ---- wire up ----
  loadCfg();
  initPrompts();
  el.run.addEventListener("click", run);
  el.stop.addEventListener("click", () => ac?.abort());
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
