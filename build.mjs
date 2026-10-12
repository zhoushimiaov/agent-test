// Agent Test — static site generator.
// Regenerates the hub (index.html) and every category index.html from the data
// below, all linking the shared assets/site.css. Run: node build.mjs
import { writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));

// Load a category's Jev scores (pelican-bicycle/scores.json), if present.
function loadScores(slug) {
  const p = join(ROOT, slug, "scores.json");
  if (!existsSync(p)) return null;
  const data = JSON.parse(readFileSync(p, "utf8"));
  const by = Object.fromEntries(data.results.map((r) => [r.slug, r]));
  return { ...data, by };
}

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=Noto+Sans+SC:wght@200;300;400;500&display=swap" rel="stylesheet">';

// Pelican versions, in display order (leaderboard re-sorts by Jev score).
const pelicanVersions = [
  ["gemini-3.8-flash", "Gemini 3.8 Flash", "Coastal Pelican Cruiser · 海岸飞车"],
  ["glm-5.3-flash", "GLM 5.3 Flash", "Pelican Motor Club · 落日骑行"],
  ["glm-5.3-3d", "GLM 5.3", "Three.js 3D 场景"],
  ["tierflow-pro-router", "Tierflow-Pro 自动路由", "glm / qwen / ds 自动路由"],
  ["tierflow-pro-router-3d", "Tierflow-Pro 自动路由", "glm / qwen / ds · 3D"],
  ["mimo-2.6-pro", "MiMo 2.6 Pro", "小米 MiMo"],
  ["qwen-3.8-max-tabbit", "Qwen 3.8 Max", "Tabbit · SVG 动画"],
  ["qwen-3.8-max-qoder", "Qwen 3.8 Max", "Qoder WorkCN"],
  ["deepseek-4.1-flash", "DeepSeek 4.1 Flash", "SVG 动画"],
  ["k2.8-preview", "K2.8 Preview", "预览版"],
  ["k3-raccoon", "K3", "小浣熊 Raccoon"],
  ["k3-crush", "K3", "Crush"],
  ["k3-svg", "K3", "SVG 动画 · 鹈鹕兜风"],
  ["k3-3d", "K3", "Three.js 3D 场景"],
  ["sonnet-5.5-tabbit", "Claude Sonnet 5.5", "Tabbit"],
  ["haiku-5.5-tabbit", "Claude Haiku 5.5", "Tabbit"],
  ["muse-spark-1.3", "Muse Spark 1.3", "Muse"],
  ["space-bunny", "Space-Bunny", "匿名模型 Anonymous"],
  ["hy4", "HY4", "SVG 动画 · 伪 3D 视角"],
  ["gemma4", "Gemma 4", "SVG 动画"],
  ["gpt6-luna", "GPT-6", "Luna · SVG 动画"],
  ["ling-3.1-flash", "Ling 3.1 Flash", "SVG 动画"],
  ["sensenova-6.8-flash", "SenseNova 6.8 Flash", "商汤小浣熊 · SVG 动画"],
  ["solar-mini-4", "Solar Mini 4", "SVG 动画"],
  ["gpt5.6-terra-ultra", "GPT-5.6 Terra Ultra", "SVG 动画"],
  ["opus-4.8", "Claude Opus 4.8", "SVG + SMIL 动画"],
].map(([slug, name, sub]) => ({ slug, name, sub }));

// Categories in hub order. `cover` = thumbnail (if versions exist); else emoji.
const categories = [
  {
    slug: "pelican-bicycle",
    title: "鹈鹕骑车",
    emoji: "🦩",
    blurb: "经典的大模型创意基准 —— 让模型实现「一只骑自行车的鹈鹕」,考验空间想象与前端功力。",
    lede: "经典的大模型创意基准:让模型实现「一只骑自行车的鹈鹕」。下面按模型版本归档,缩略图为真实渲染效果,点击卡片查看可交互的在线页面。",
    versions: pelicanVersions,
  },
  {
    slug: "jellyfish-float",
    title: "水母漂浮",
    emoji: "🪼",
    blurb: "半透明伞体在水中起伏漂浮,考验透明度、柔体律动与光线穿透的质感。",
    exam: "半透明材质的层叠、触手的柔体摆动,以及水下光线的衰减与散射。",
    lede: "半透明的伞状身体在幽深的水里一张一缩地漂浮,靠柔软的触手随波摆动,考的是透明材质的层叠通透、柔体律动的自然感,以及水下光线的衰减与散射 —— 越通透、越有流动感越见功力。下面按模型版本归档,缩略图为真实渲染效果,点击卡片查看可交互的在线页面。",
    versions: [
      ["gemini-3.8-flash", "Gemini 3.8 Flash", "Three.js 3D"],
      ["gemini-3.8-flash-bioluminescent", "Gemini 3.8 Flash", "Three.js 3D · 深海荧光"],
      ["deepseek-4.1-flash", "DeepSeek 4.1 Flash", "Three.js 3D"],
      ["mimo-2.6-flash", "MiMo 2.6 Flash", "Canvas 2D"],
      ["opus-4.8", "Claude Opus 4.8", "Canvas 2D"],
      ["glm-5.3-flash", "GLM 5.3 Flash", "Canvas 2D"],
      ["ling-3.1-flash", "Ling 3.1 Flash", "Canvas 2D"],
      ["muse-spark", "Muse Spark", "Canvas 2D"],
      ["tierflow-pro", "Tierflow-Pro", "Canvas 2D"],
      ["gpt6-luna", "GPT-6", "Luna · CSS 动画"],
    ].map(([slug, name, sub]) => ({ slug, name, sub })),
  },
  {
    slug: "penguin-ski-jump",
    title: "企鹅滑雪跳台",
    emoji: "🐧",
    blurb: "企鹅冲下斜坡、腾空、再落地,考验 3D 相机运动与阴影的连续变化。",
    exam: "斜坡与腾空的抛物线、落地缓冲,以及 3D 相机跟随与投影阴影的实时变化。",
    lede: "一只企鹅从跳台俯冲而下、在台口腾空飞出,划出一道抛物线再落回雪坡。考的是助滑到起跳的加速、腾空的抛物线与姿态,以及相机跟随和雪地投影阴影随之变化的连续感 —— 这题几乎非 3D 不可,2D 很难把相机运动和实时阴影做出来。下面按模型版本归档,缩略图为真实渲染效果,点击卡片查看可交互的在线页面。",
    versions: [
      ["gemini-3.8-flash", "Gemini 3.8 Flash", "Three.js 3D"],
      ["deepseek-4.1-flash", "DeepSeek 4.1 Flash", "Three.js 3D"],
      ["space-bunny", "Space Bunny", "Canvas 2D"],
      ["glm-5.3-flash", "GLM 5.3 Flash", "Canvas 2D"],
      ["muse-spark", "Muse Spark", "Canvas 2D"],
    ].map(([slug, name, sub]) => ({ slug, name, sub })),
  },
  {
    slug: "whale-over-city",
    title: "鲸鱼在城市上空游泳",
    emoji: "🐋",
    blurb: "巨鲸漂浮于城市上空,超现实尺度加上云层穿插的前后遮挡关系。",
    exam: "超现实的尺度对比,以及鲸身与云层之间正确的前后遮挡(z 轴层叠)关系。",
    lede: "一头巨鲸漂浮在城市上空缓缓游动,画面要有超现实的尺度反差 —— 鲸相对楼宇要足够夸张,还要处理好鲸身与云层的前后遮挡:有的云在鲸前、有的在鲸后,z 轴层叠正确才有真正的「穿行」感,一刀切全前或全后就露馅。下面按模型版本归档,缩略图为真实渲染效果,点击卡片查看可交互的在线页面。",
    versions: [
      ["gemini-3.8-flash", "Gemini 3.8 Flash", "Three.js 3D"],
      ["deepseek-4.1-flash", "DeepSeek 4.1 Flash", "Canvas 2D"],
      ["glm-5.3-flash", "GLM 5.3 Flash", "Canvas 2D"],
      ["muse-spark", "Muse Spark", "Three.js 3D"],
      ["opus-4.8", "Claude Opus 4.8", "Three.js 3D"],
      ["gpt6-luna", "GPT-6 Luna", "Canvas 2D"],
      ["qwen-3.8-flash", "Qwen 3.8 Flash", "Three.js 3D"],
      ["step-5-preview", "Step-5 Preview", "Canvas 2D"],
      ["deepseek-4.1-flash-raccoon", "DeepSeek 4.1 Flash Raccoon", "Three.js 3D"],
      ["glm-5.3-raccoon", "GLM 5.3 Raccoon", "Three.js 3D"],
      ["longcat-2.0", "LongCat 2.0", "Canvas 2D"],
    ].map(([slug, name, sub]) => ({ slug, name, sub })),
  },
  {
    slug: "elephant-tightrope",
    title: "大象走钢丝",
    emoji: "🐘",
    blurb: "庞大身躯踩在钢丝上,平衡杆与钢丝下垂张力带来强烈反差感。",
    exam: "重量感与平衡杆的配重、钢丝受力下垂的张力曲线,反差越大越见功力。",
    lede: "庞大的身躯踩在一根钢丝上,靠一根长长的平衡杆维持平衡,考的是重量感、平衡杆的配重反扣,以及钢丝受力下垂的张力曲线 —— 反差越大越见功力。下面按模型版本归档,缩略图为真实渲染效果,点击卡片查看可交互的在线页面。",
    versions: [
      ["gemini-3.8-flash", "Gemini 3.8 Flash", "Three.js 3D"],
      ["nemotron-3-ultra", "Nemotron 3 Ultra", "Three.js 3D"],
      ["tierflow-pro", "Tierflow-Pro", "Three.js 3D"],
      ["mimo-2.6-flash", "MiMo 2.6 Flash", "Canvas 2D"],
      ["deepseek-4.1-flash", "DeepSeek 4.1 Flash", "Canvas 2D"],
      ["opus-4.8", "Claude Opus 4.8", "SVG 动画"],
      ["glm-5.3-flash", "GLM 5.3 Flash", "SVG 动画"],
      ["ling-3.1-flash", "Ling 3.1 Flash", "SVG 动画"],
    ].map(([slug, name, sub]) => ({ slug, name, sub })),
  },
  {
    slug: "octopus-drummer",
    title: "章鱼打架子鼓",
    emoji: "🐙",
    blurb: "八条腕要合理分配到鼓、镲与踩锤,肢体协调是重灾区,极能区分模型。",
    exam: "八条腕到各鼓件的合理分配与节奏协调 —— 最能拉开模型差距的难点。",
    lede: "一只章鱼坐在整套架子鼓前,八条腕要合理地分配到底鼓、通鼓、军鼓与吊镲,一边敲一边保持节奏协调。考的正是这种多肢体的空间分配与打击动作的说服力 —— 腕是真的落在鼓件上、还是只是摊开摆样子,最能拉开模型差距。下面按模型版本归档,缩略图为真实渲染效果,点击卡片查看可交互的在线页面。",
    versions: [
      ["gemini-3.8-flash", "Gemini 3.8 Flash", "Three.js 3D"],
      ["glm-5.3", "GLM-5.3", "Canvas 2D"],
      ["deepseek-4.1-flash", "DeepSeek 4.1 Flash", "Canvas 2D"],
      ["mimo-2.6-flash", "MiMo 2.6 Flash", "Canvas 2D"],
      ["ling-3.1-flash", "Ling 3.1 Flash", "Canvas 2D"],
      ["glm-5.3-flash", "GLM 5.3 Flash", "Canvas 2D"],
      ["opus-4.8", "Claude Opus 4.8", "Canvas 2D"],
      ["tierflow-pro", "Tierflow-Pro", "Canvas 2D"],
      ["muse-spark", "Muse Spark", "SVG 动画"],
      ["space-bunny", "Space Bunny", "Canvas 2D"],
    ].map(([slug, name, sub]) => ({ slug, name, sub })),
  },
  {
    slug: "rhino-orbit",
    title: "犀牛绕地球",
    emoji: "🦏",
    blurb: "犀牛沿轨道绕行地球,考的是轨道运动与天体尺度关系的表达。",
    exam: "环绕轨道的运动曲线、犀牛与地球的尺度关系,以及公转节奏的表达。",
    lede: "一头犀牛绕着地球公转。这题刻意不比「犀牛相对地球有多小」,而是看犀牛造型的表现力、轨道运动曲线与公转节奏,以及地球质感与太空场景的氛围。下面按模型版本归档,缩略图为真实渲染效果,点击卡片查看可交互的在线页面。",
    versions: [
      ["glm-5.3", "GLM-5.3", "Three.js 3D"],
      ["opus-4.8", "Claude Opus 4.8", "Three.js 3D"],
      ["gemini-3.8-flash", "Gemini 3.8 Flash", "Three.js 3D"],
      ["agnes-3.0-flash", "Agnes 3.0 Flash", "Three.js 3D"],
      ["mimo-2.6-flash", "MiMo 2.6 Flash", "Three.js 3D"],
      ["deepseek-4.1-flash", "DeepSeek 4.1 Flash", "Three.js 3D"],
      ["glm-5.3-flash", "GLM 5.3 Flash", "SVG 动画"],
      ["k3", "K3", "SVG 动画"],
      ["qwen-3.8-flash-next", "Qwen 3.8 Flash Next", "Canvas 2D"],
      ["ling-3.1-flash", "Ling 3.1 Flash", "Canvas 2D"],
    ].map(([slug, name, sub]) => ({ slug, name, sub })),
  },
  {
    slug: "lion-fire-hoop",
    title: "狮子跳火圈",
    emoji: "🦁",
    blurb: "狮子跃过火圈,考抛物线轨迹、火圈粒子效果与落地时机的配合。",
    exam: "起跳到落地的抛物线轨迹、火圈的粒子效果,以及穿圈与落地时机的配合。",
    lede: "一头狮子助跑、起跳,正好从燃烧的火圈中心穿过再稳稳落地。考的是起跳到落地的抛物线轨迹(符合重力、顶点落在火圈处)、火圈的粒子与火焰效果,以及穿圈与落地的时机配合 —— 时间轴一旦没对齐就会穿模或「人到了圈还没到」。下面按模型版本归档,缩略图为真实渲染效果,点击卡片查看可交互的在线页面。",
    versions: [
      ["gemini-3.8-flash", "Gemini 3.8 Flash", "Three.js 3D"],
      ["glm-5.3", "GLM-5.3", "Three.js 3D"],
      ["ling-3.1-flash", "Ling 3.1 Flash", "Three.js 3D"],
      ["deepseek-4.1-flash", "DeepSeek 4.1 Flash", "Canvas 2D"],
      ["mimo-2.6-flash", "MiMo 2.6 Flash", "Canvas 2D"],
      ["glm-5.3-flash", "GLM 5.3 Flash", "Canvas 2D"],
      ["opus-4.8", "Claude Opus 4.8", "Canvas 2D"],
      ["tierflow-pro", "Tierflow-Pro", "Canvas 2D"],
      ["muse-spark", "Muse Spark", "Canvas 2D"],
      ["qwen-3.8-flash-next", "Qwen 3.8 Flash Next", "Canvas 2D"],
    ].map(([slug, name, sub]) => ({ slug, name, sub })),
  },
];

// ---- project grouping (logical, for now) ----
// The site is being generalized into a multi-project platform. Today there is
// one project — "Zoo Test" (the animal creative benchmarks above) — and the
// landing page IS the Zoo Test hub. When a second project lands, the root will
// become a Google-Labs-style project grid and each project moves under its own
// base path; the `categories` data and all rendering below stay the same, just
// nested one level deeper. See STATUS.md for the roadmap.
const ZOO = { slug: "zoo", name: "Zoo Test", base: "", categories };

// Jev scoring Worker endpoint (see worker/). The playground POSTs the user's
// rendered HTML here to get a TypeSafe Jev score. Until the Worker is deployed
// this stays a placeholder; set it to the deployed URL, then `node build.mjs`.
// Empty string ("") hides the scoring UI entirely.
const JEV_ENDPOINT = "https://zoo-jev.zhoushimiao.workers.dev";

// ---- preset prompts (for the in-browser "测试你的大模型" playground) ----
// Each category archives its model-facing prompt in <slug>/PROMPT.md inside a
// ```text``` block; pelican-bicycle predates that convention, so it carries an
// inline fallback. These get embedded into playground/index.html, so the page
// needs no extra fetch and works offline.
const PELICAN_PROMPT = `用一个单独的 HTML 文件,做一个「一只鹈鹕骑自行车」的画面。

交付要求:
- 全部代码(HTML / CSS / JS)写在同一个文件内,双击即可在浏览器打开运行,无需任何交互。
- 技术方案自选:纯 CSS/JS 2D,或 Three.js / WebGL 3D 都可以;需要第三方库就用 CDN 引入。
- 画面不要有操作说明或控件,打开就是成品。

鹈鹕的造型、自行车的结构、骑行的姿态与场景构图,全部由你自己判断,做出你认为最有说服力的一版。`;

function presetPrompt(cat) {
  if (cat.slug === "pelican-bicycle") return PELICAN_PROMPT;
  const p = join(ROOT, cat.slug, "PROMPT.md");
  if (!existsSync(p)) return "";
  const m = readFileSync(p, "utf8").match(/```text\s*\n([\s\S]*?)```/);
  return m ? m[1].trim() : "";
}

const PRESET_PROMPTS = ZOO.categories
  .map((c) => ({ slug: c.slug, title: c.title, emoji: c.emoji, prompt: presetPrompt(c) }))
  .filter((p) => p.prompt);

const pad2 = (n) => String(n).padStart(2, "0");

// Floating "返回首页" button injected into every version page. Version pages are
// raw model outputs (not generated here), so we post-process them: strip any
// previously injected block and re-insert a fresh one, which keeps the markup
// idempotent and lets the styling stay current across rebuilds. The button is
// fully self-contained (scoped class + inline <style>, max z-index) so it never
// clashes with or depends on whatever the page itself defines.
const HOME_BTN_BLOCK =
  `<!--zc-home:start--><style>.zc-home-btn{position:fixed;top:16px;left:16px;z-index:2147483647;` +
  `display:inline-flex;align-items:center;gap:6px;padding:8px 14px;` +
  `font:500 13px/1.1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Noto Sans SC",sans-serif;` +
  `color:#111;background:rgba(255,255,255,.86);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);` +
  `border:1px solid rgba(0,0,0,.08);border-radius:999px;text-decoration:none;box-shadow:0 2px 12px rgba(0,0,0,.2);` +
  `transition:background .2s ease,transform .2s ease,box-shadow .2s ease}` +
  `.zc-home-btn:hover{background:#fff;transform:translateY(-1px);box-shadow:0 4px 18px rgba(0,0,0,.26)}</style>` +
  `<a class="zc-home-btn" href="../">← 返回首页</a><!--zc-home:end-->`;
const HOME_BTN_RE = /<!--zc-home:start-->[\s\S]*?<!--zc-home:end-->\s*/g;

function injectHomeButton(file) {
  if (!existsSync(file)) return false;
  let html = readFileSync(file, "utf8").replace(HOME_BTN_RE, "");
  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `${HOME_BTN_BLOCK}\n</body>`);
  } else {
    html += `\n${HOME_BTN_BLOCK}\n`;
  }
  writeFileSync(file, html);
  return true;
}


// ---- hub (index.html) ----
function hubCard(cat) {
  const n = cat.versions.length;
  const scores = n ? loadScores(cat.slug) : null;
  const cover = cat.cover
    ? `<div class="cover"><img src="${cat.cover}" alt="${cat.title}预览" loading="lazy"></div>`
    : `<div class="cover ph"><span class="em">${cat.emoji}</span></div>`;
  const count = n
    ? `<span class="count open">${n} 个版本${scores ? " · Jev 已评分" : ""}</span>`
    : `<span class="count">版本征集中</span>`;
  const go = `<span class="go">${n ? "进入栏目" : "查看"} <span class="arr">→</span></span>`;
  return `    <a class="cat" href="${cat.slug}/">
      ${cover}
      <div class="pad">
        <h3>${cat.title}</h3>
        <p>${cat.blurb}</p>
        <div class="foot">${count}${go}</div>
      </div>
    </a>`;
}

const soonCard = `    <div class="cat soon">
      <div class="cover ph"><span class="em">+</span></div>
      <div class="pad">
        <h3>更多测试</h3>
        <p>后续陆续加入更多测试命题,如代码重构、数据可视化、小游戏实现等。</p>
        <div class="foot"><span class="count">敬请期待</span></div>
      </div>
    </div>`;

function renderHub() {
  const cards = categories.map(hubCard).join("\n\n") + "\n\n" + soonCard;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Agent Test · 智能体能力测试</title>
${FONTS}
<link rel="stylesheet" href="assets/site.css">
</head>
<body>
  <nav class="nav">
    <div class="brand"><span class="mark">A</span>Agent Test</div>
    <a class="repo" href="https://github.com/zhoushimiaov/agent-test" target="_blank" rel="noopener">GitHub ↗</a>
  </nav>

  <section class="hero">
    <div class="eyebrow">Agent Test</div>
    <h1>看不同模型<br>同题同框的<em>真实表现</em></h1>
    <p class="lede">用一组经典、直观的任务,横向对比不同大模型与 Agent 的实际输出。每个大类下按模型版本归档,点进去即是可交互的在线效果。</p>
    <div class="hero-cta">
      <a class="btn-primary" href="playground/">🧪 测试你自己的大模型</a>
      <span class="cta-note">填入你的 API,在浏览器里跑同一道题 · 密钥只留本地</span>
    </div>
  </section>

  <div class="label"><span>Zoo Test</span><b>动物创意基准 · Categories</b><i></i></div>

  <div class="grid">
${cards}
  </div>

  <footer>
    <div class="wrap">
      <span>Agent Test · 智能体能力测试合集</span>
      <span>Hosted on GitHub Pages · agentest.shimiao.work</span>
    </div>
  </footer>
</body>
</html>
`;
}

// ---- category page ----
function verCard(v, i, score, dimLabels) {
  let rank = "", badge = "", dims = "";
  if (score) {
    const cls = score.total >= 85 ? " hi" : score.total < 50 ? " lo" : "";
    const rcls = score.rank === 1 ? " g1" : "";
    rank = `<span class="rk${rcls}">#${score.rank}</span>`;
    badge = `<span class="score${cls}"><b>${score.total}</b><span class="j">Jev</span></span>`;
    const order = Object.keys(dimLabels);
    const tier = (f) => (f >= 0.8 ? "hi" : f < 0.5 ? "lo" : "mid");
    dims = `\n      <div class="dims">${order
      .map((k) => {
        const v = Math.round(score.dims[k].frac * 100);
        const t = tier(score.dims[k].frac);
        return `<div class="d"><div class="dh"><span>${dimLabels[k]}</span><em class="${t}">${v}</em></div><div class="tr"><div class="fl ${t}" style="width:${v}%"></div></div></div>`;
      })
      .join("")}</div>`;
  }
  const idx = score ? "" : `<div class="idx">${pad2(i + 1)}</div>`;
  return `    <a class="ver" href="${v.slug}.html">
      <div class="shot">${rank}${badge}<img src="thumbs/${v.slug}.webp" alt="${v.name} ${v.sub} 预览" loading="lazy" decoding="async" onload="this.classList.add('loaded')"></div>
      <div class="meta">
        ${idx}<div class="txt"><h3>${v.name}</h3><p>${v.sub}</p></div>
        <span class="arr2">↗</span>
      </div>${dims}
    </a>`;
}

function renderCategory(cat) {
  const hasVers = cat.versions.length > 0;
  const scores = hasVers ? loadScores(cat.slug) : null;
  let ordered = cat.versions;
  if (scores) {
    ordered = [...cat.versions].sort(
      (a, b) => (scores.by[b.slug]?.total ?? -1) - (scores.by[a.slug]?.total ?? -1)
    );
  }
  const dimLabels = scores?.dimLabels || {};
  let note = "";
  if (scores) {
    const w = scores.weights;
    const wline = Object.keys(dimLabels)
      .map((k) => `<b>${dimLabels[k]}</b> ${w[k]}`)
      .join(" · ");
    note = `\n  <div class="note">
    <span class="tag">TypeSafe Jev 评分</span>
    <span class="k">由 System One 判定模型 <b>${scores.model}</b> 根据每个版本的真实渲染结果打分(满分 100)</span>
    <span class="k">${wline}</span>
  </div>`;
  }
  const body = hasVers
    ? `  <div class="label"><span>${scores ? "Jev 排行" : "模型版本"}</span><b>${scores ? "Leaderboard" : "Versions"}</b><i></i></div>${note}

  <div class="grid">
${ordered.map((v, i) => verCard(v, i, scores?.by[v.slug], dimLabels)).join("\n")}
  </div>`
    : `  <section class="empty">
    <div class="box">
      <div class="mk">${cat.emoji}</div>
      <h2>版本征集中</h2>
      <p>这个命题还没有收录任何模型版本。它考察的是:${cat.exam}</p>
      <a href="../">← 返回首页看看其他命题</a>
    </div>
  </section>`;
  const lede = cat.lede
    ? cat.lede
    : `新加入的测试命题 —— ${cat.blurb}即将收录不同模型与 Agent 的实现版本,按版本归档对比。`;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${cat.title} · Agent Test</title>
${FONTS}
<link rel="stylesheet" href="../assets/site.css">
</head>
<body>
  <nav class="nav">
    <a class="brand" href="../"><span class="mark">A</span>Agent Test</a>
    <a class="repo" href="https://github.com/zhoushimiaov/agent-test" target="_blank" rel="noopener">GitHub ↗</a>
  </nav>

  <section class="hero sub">
    <div class="crumb"><a href="../">首页</a> &nbsp;/&nbsp; ${cat.title}</div>
    <h1>${cat.title}</h1>
    <p class="lede">${lede}</p>
  </section>

${body}

  <footer>
    <div class="wrap">
      <span><a href="../">← 返回首页</a></span>
      <span>Hosted on GitHub Pages · agentest.shimiao.work</span>
    </div>
  </footer>
</body>
</html>
`;
}

// ---- playground page (测试你的大模型) ----
// A fully client-side tester: the user supplies an OpenAI-compatible Base URL +
// Key + model, picks a preset prompt (or writes one), and the browser calls
// their endpoint directly and renders the returned HTML in a sandboxed iframe.
// The key never leaves the browser. Logic lives in the hand-written
// playground/playground.js; this only emits the shell + embeds the prompts.
function renderPlayground() {
  const promptsJson = JSON.stringify(PRESET_PROMPTS).replace(/</g, "\\u003c");
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>测试你的大模型 · Agent Test</title>
${FONTS}
<link rel="stylesheet" href="../assets/site.css">
</head>
<body>
  <nav class="nav">
    <a class="brand" href="../"><span class="mark">A</span>Agent Test</a>
    <a class="repo" href="https://github.com/zhoushimiaov/agent-test" target="_blank" rel="noopener">GitHub ↗</a>
  </nav>

  <section class="hero sub">
    <div class="crumb"><a href="../">首页</a> &nbsp;/&nbsp; 测试你的大模型</div>
    <h1>测试你的<em>大模型</em></h1>
    <p class="lede">填入任意 OpenAI 兼容接口(Base URL + Key + 模型名),选一道题或自己写,浏览器直接让你的模型跑同样的命题并实时渲染结果。密钥只存在你本地浏览器、只发往你自己填写的接口,不经过本站任何服务器。</p>
  </section>

  <main class="pg">
    <div class="pg-card">
      <div class="pg-grid2">
        <label class="f"><span>Base URL</span><input id="pg-base" type="text" placeholder="https://api.openai.com/v1" autocomplete="off" spellcheck="false"></label>
        <label class="f"><span>模型 Model</span><input id="pg-model" type="text" placeholder="gpt-4o" autocomplete="off" spellcheck="false"></label>
      </div>
      <label class="f"><span>API Key</span>
        <span class="pg-key"><input id="pg-keyin" type="password" placeholder="sk-..." autocomplete="off" spellcheck="false"><button id="pg-eye" type="button" title="显示 / 隐藏">显示</button></span>
      </label>
      <div class="pg-row">
        <label class="chk"><input id="pg-remember" type="checkbox"> 记住配置(仅存本地浏览器)</label>
        <button id="pg-forget" type="button" class="pg-ghost">忘记密钥</button>
      </div>
      <p class="pg-sec">🔒 密钥仅保存在本机 <code>localStorage</code>,请求由你的浏览器直连你填写的接口;本站是纯静态页面,不收集、不转发密钥或数据。仅能连接<strong>开放跨域(CORS)</strong>的接口;本地服务(如 Ollama)需自行开启 CORS。</p>
    </div>

    <div class="pg-card">
      <label class="f"><span>选题(预设提示词)</span><select id="pg-preset"></select></label>
      <label class="f"><span>提示词 Prompt(可自由编辑)</span><textarea id="pg-text" rows="7" spellcheck="false"></textarea></label>
      <div class="pg-actions">
        <button id="pg-run" type="button" class="btn-primary">▶ 运行</button>
        <button id="pg-stop" type="button" class="pg-ghost" disabled>■ 停止</button>
        <span id="pg-status" class="pg-status"></span>
      </div>
    </div>

    <div class="pg-card pg-outcard">
      <div class="pg-pane-h"><span>预览 Preview</span>
        <span class="pg-pane-btns">
          <button id="pg-dl" type="button" class="pg-ghost" disabled>下载 HTML</button>
          <button id="pg-open" type="button" class="pg-ghost" disabled>新标签打开</button>
        </span>
      </div>
      <iframe id="pg-frame" class="pg-frame" sandbox="allow-scripts" title="模型输出预览"></iframe>
      <details class="pg-raw"><summary>原始输出 / 日志</summary><pre id="pg-rawtext"></pre></details>
    </div>
${JEV_ENDPOINT ? `
    <div class="pg-card pg-jev" id="pg-jev">
      <div class="pg-pane-h"><span>Jev 评分 Scoring</span>
        <span class="tag">TypeSafe · System One</span>
      </div>
      <p class="pg-sec">跑出结果后,可用 <strong>TypeSafe Jev</strong> 按本站同一套评审规则给它打分(满分 100)。可用本站的免费额度(<strong>每人 3 次</strong>),也可以填你自己的 Jev Key(不计次)。评分在服务端进行:把渲染截图的中立描述 + 源代码一起交给 Jev。</p>
      <div class="pg-row">
        <label class="chk"><input type="radio" name="pg-jevmode" id="pg-jev-ours" value="ours" checked> 用本站额度(每人 3 次)</label>
        <label class="chk"><input type="radio" name="pg-jevmode" id="pg-jev-own" value="own"> 用我自己的 Jev Key</label>
      </div>
      <label class="f" id="pg-jevkey-wrap" style="display:none"><span>你的 Jev Key</span>
        <input id="pg-jevkey" type="password" placeholder="apikey_..." autocomplete="off" spellcheck="false">
      </label>
      <div class="pg-actions">
        <button id="pg-score" type="button" class="btn-primary" disabled>★ 用 Jev 评分</button>
        <span id="pg-jev-status" class="pg-status"></span>
      </div>
      <div id="pg-jev-result" class="pg-jev-result" hidden></div>
    </div>` : ""}
  </main>

  <footer>
    <div class="wrap">
      <span><a href="../">← 返回首页</a></span>
      <span>Hosted on GitHub Pages · agentest.shimiao.work</span>
    </div>
  </footer>

  <script id="zoo-prompts" type="application/json">${promptsJson}</script>
  <script>window.ZOO_JEV_ENDPOINT=${JSON.stringify(JEV_ENDPOINT)};</script>
  <script src="playground.js"></script>
</body>
</html>
`;
}

// ---- write ----
writeFileSync(join(ROOT, "index.html"), renderHub());
let n = 0;
for (const cat of categories) {
  const dir = join(ROOT, cat.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), renderCategory(cat));
  n++;
}

// Playground page (shell only; playground.js is hand-written and preserved).
const pgDir = join(ROOT, "playground");
mkdirSync(pgDir, { recursive: true });
writeFileSync(join(pgDir, "index.html"), renderPlayground());

// Inject the "返回首页" button into every curated version page (the raw model
// outputs linked from each category). Index/hub pages already carry their own
// navigation, so they are left alone.
let btn = 0;
for (const cat of categories) {
  for (const v of cat.versions) {
    if (injectHomeButton(join(ROOT, cat.slug, v.slug + ".html"))) btn++;
  }
}
console.log(`Generated hub + playground + ${n} category pages (${categories.length} categories); home button on ${btn} version pages; ${PRESET_PROMPTS.length} preset prompts.`);

