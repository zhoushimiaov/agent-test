// Agent Test — static site generator.
// Regenerates the hub (index.html) and every category index.html from the data
// below, all linking the shared assets/site.css. Run: node build.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
  '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=Noto+Sans+SC:wght@200;300;400;500&display=swap" rel="stylesheet">';

// Pelican versions, in display order (preserves the existing 16 cards).
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
].map(([slug, name, sub]) => ({ slug, name, sub }));

// Categories in hub order. `cover` = thumbnail (if versions exist); else emoji.
const categories = [
  {
    slug: "pelican-bicycle",
    title: "鹈鹕骑车",
    emoji: "🚲",
    cover: "pelican-bicycle/thumbs/gemini-3.8-flash.png",
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
    versions: [],
  },
  {
    slug: "penguin-ski-jump",
    title: "企鹅滑雪跳台",
    emoji: "🐧",
    blurb: "企鹅冲下斜坡、腾空、再落地,考验 3D 相机运动与阴影的连续变化。",
    exam: "斜坡与腾空的抛物线、落地缓冲,以及 3D 相机跟随与投影阴影的实时变化。",
    versions: [],
  },
  {
    slug: "whale-over-city",
    title: "鲸鱼在城市上空游泳",
    emoji: "🐋",
    blurb: "巨鲸漂浮于城市上空,超现实尺度加上云层穿插的前后遮挡关系。",
    exam: "超现实的尺度对比,以及鲸身与云层之间正确的前后遮挡(z 轴层叠)关系。",
    versions: [],
  },
  {
    slug: "elephant-tightrope",
    title: "大象走钢丝",
    emoji: "🐘",
    blurb: "庞大身躯踩在钢丝上,平衡杆与钢丝下垂张力带来强烈反差感。",
    exam: "重量感与平衡杆的配重、钢丝受力下垂的张力曲线,反差越大越见功力。",
    versions: [],
  },
  {
    slug: "octopus-drummer",
    title: "章鱼打架子鼓",
    emoji: "🐙",
    blurb: "八条腕要合理分配到鼓、镲与踩锤,肢体协调是重灾区,极能区分模型。",
    exam: "八条腕到各鼓件的合理分配与节奏协调 —— 最能拉开模型差距的难点。",
    versions: [],
  },
  {
    slug: "rhino-orbit",
    title: "犀牛绕地球",
    emoji: "🦏",
    blurb: "犀牛沿轨道绕行地球,考的是轨道运动与天体尺度关系的表达。",
    exam: "环绕轨道的运动曲线、犀牛与地球的尺度关系,以及公转节奏的表达。",
    versions: [],
  },
  {
    slug: "lion-fire-hoop",
    title: "狮子跳火圈",
    emoji: "🦁",
    blurb: "狮子跃过火圈,考抛物线轨迹、火圈粒子效果与落地时机的配合。",
    exam: "起跳到落地的抛物线轨迹、火圈的粒子效果,以及穿圈与落地时机的配合。",
    versions: [],
  },
];

const pad2 = (n) => String(n).padStart(2, "0");

// ---- hub (index.html) ----
function hubCard(cat) {
  const n = cat.versions.length;
  const cover = cat.cover
    ? `<div class="cover"><img src="${cat.cover}" alt="${cat.title}预览" loading="lazy"></div>`
    : `<div class="cover ph"><span class="em">${cat.emoji}</span></div>`;
  const count = n
    ? `<span class="count open">${n} 个版本</span>`
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
  </section>

  <div class="label"><span>栏目 Categories</span><i></i></div>

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
function verCard(v, i) {
  return `    <a class="ver" href="${v.slug}.html">
      <div class="shot"><img src="thumbs/${v.slug}.png" alt="${v.name} ${v.sub} 预览" loading="lazy"></div>
      <div class="meta">
        <div class="idx">${pad2(i + 1)}</div>
        <div class="txt"><h3>${v.name}</h3><p>${v.sub}</p></div>
        <span class="arr2">↗</span>
      </div>
    </a>`;
}

function renderCategory(cat) {
  const hasVers = cat.versions.length > 0;
  const body = hasVers
    ? `  <div class="label"><span>模型版本</span><b>Versions</b><i></i></div>

  <div class="grid">
${cat.versions.map(verCard).join("\n")}
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

// ---- write ----
writeFileSync(join(ROOT, "index.html"), renderHub());
let n = 0;
for (const cat of categories) {
  const dir = join(ROOT, cat.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), renderCategory(cat));
  n++;
}
console.log(`Generated hub + ${n} category pages (${categories.length} categories).`);

