// Score every whale-over-city version with TypeSafe's Jev (System One) model.
// Jev is text-only, so each version is judged from a strictly factual, neutral
// description of its RENDERED output — Jev assigns the graded quality judgment.
// Run with the proxy on:
//   NODE_USE_ENV_PROXY=1 TYPESAFE_API_KEY=... node jev-score-whale.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.TYPESAFE_API_KEY;
if (!KEY) { console.error("missing TYPESAFE_API_KEY"); process.exit(1); }

// The task every model was given.
const TASK =
  "Create a self-contained web page animating 'a giant whale swimming in the sky " +
  "over a city'. What matters is the hard part of this subject: a strong SURREAL " +
  "SCALE CONTRAST (the whale should be dramatically huge relative to the buildings), " +
  "and — the key difficulty — correct CLOUD OCCLUSION / z-layering, where some clouds " +
  "pass in front of the whale and some behind it so the whale genuinely reads as " +
  "swimming THROUGH the clouds, rather than being flatly pasted entirely in front of " +
  "or behind everything. A believable whale form and gentle swimming motion, plus an " +
  "atmospheric city and sky, round it out. Photoreal accuracy is not the point.";

// Judgment dimensions. Each is a Score question with ordered, situation-based
// levels (index 0 = worst). Weights combine into a 0-100 overall score. Per
// whale-over-city's brief, the surreal scale and the cloud z-layering are the two
// headline tests, then the whale itself, then the city/sky atmosphere.
const DIMS = {
  scale: {
    weight: 30,
    instructions:
      "Rate the SURREAL SCALE CONTRAST: is the whale dramatically, impossibly huge relative to the city buildings so the image feels surreal — versus a whale that is small, modest, or roughly building-sized with little sense of exaggeration?",
    criteria: [
      "No clear whale, or whale tiny/indistinct with no scale statement",
      "Whale present but small or only modestly larger than buildings — weak contrast",
      "Whale clearly large over the city, a decent surreal contrast",
      "Whale dramatically, overwhelmingly huge against the buildings — a strong surreal scale statement",
    ],
  },
  occlusion: {
    weight: 30,
    instructions:
      "Rate the CLOUD OCCLUSION / z-layering, the key difficulty: do some clouds clearly pass IN FRONT of the whale while others sit BEHIND it, so the whale reads as genuinely swimming through the cloud layer — versus the whale flatly in front of (or behind) everything with no interleaving, or essentially no clouds at all?",
    criteria: [
      "No clouds, or whale flatly pasted over/under everything with no depth interplay",
      "Clouds present but all on one side of the whale — no real front/back interleaving",
      "Some cloud passes in front as well as behind, giving a partial sense of swimming through",
      "Clear, convincing interleaving — clouds both in front of and behind the whale so it truly swims through the cloud layer",
    ],
  },
  whale: {
    weight: 20,
    instructions:
      "Rate the WHALE itself: a believable, well-formed whale with gentle swimming motion (body, fins, tail reading clearly and moving), versus a crude, stiff, or barely-legible shape.",
    criteria: [
      "No real whale or an unreadable blob",
      "Rough whale shape, stiff or hard to read",
      "Clear, decent whale with some swimming motion",
      "Well-formed, appealing whale gliding with convincing motion",
    ],
  },
  scene: {
    weight: 20,
    instructions:
      "Rate the CITY and SKY atmosphere: a convincing, well-composed cityscape and sky (skyline, lighting, mood, overall polish), versus a sparse, dark, or crude backdrop.",
    criteria: [
      "Crude or near-empty backdrop with no composition",
      "Basic city/sky, plain or murky",
      "A coherent, atmospheric city and sky with decent polish",
      "A rich, striking cityscape and sky with strong lighting, mood and composition",
    ],
  },
};

// Factual, neutral descriptions of each RENDERED output.
const ITEMS = [
  { slug: "gemini-3.8-flash", render: "3D (Three.js / WebGL)",
    desc: "A dark night 3D city of blocky, boxy towers in blue and purple tones, with a glowing cube and lit panels among them and real perspective depth. A small pale-blue whale with a short trail of white particles swims in the upper-middle of the frame above the blocks. The whale is only modestly sized relative to the tall towers, so the scale contrast is muted. There is little visible cloud layer, so there is essentially no sense of the whale passing through clouds. Clean 3D depth in the city, but a small whale and no real cloud occlusion." },
  { slug: "deepseek-4.1-flash", render: "2D (animated HTML canvas)",
    desc: "A polished 2D night skyline of dark building silhouettes with warmly lit windows, a bright full moon, a purple-and-pink glow near the horizon and soft gray cloud banks. A very large, well-drawn blue-gray whale with a pale belly fills the upper half of the sky and dwarfs the buildings, giving a strong surreal scale contrast. The whale glides over the skyline with wispy clouds mostly behind it and a little drifting across its body. Atmospheric and dramatic, a big convincing whale; cloud interplay is present but mostly reads as the whale in front of the clouds." },
  { slug: "glm-5.3-flash", render: "2D (animated HTML canvas)",
    desc: "A very dark, low-contrast 2D night scene: a dim city skyline along the bottom, a small crescent moon at upper right and faint haze. A thin, faint whale silhouette drifts across the middle of the frame, barely distinguishable from the near-black background. There is little visible cloud layering, the whale is small and hard to see, and the overall image is underlit. Weak scale contrast and low legibility." },
  { slug: "muse-spark", render: "3D (Three.js / WebGL)",
    desc: "A 3D scene dominated by a thick volumetric cloud/fog bank across the middle, a starry sky above and a city of lit window-blocks on a grid plane below. A grayish whale is embedded within the cloud bank with cloud both in front of and behind it, so it clearly reads as swimming through the clouds — a strong z-layering effect. The whale is moderate in size relative to the city, and the scene is hazy and atmospheric though somewhat muted. Excellent cloud occlusion; modest scale and a slightly small, dim whale." },
  { slug: "opus-4.8", render: "3D (Three.js / WebGL)",
    desc: "An immersive 3D city of many densely packed, brightly lit skyscrapers under a purple-lit night sky, with cloud patches drifting around the tops of the towers and the camera flying through the streets. A dark whale silhouette swims among and above the skyscrapers, passing behind some towers and in front of others and near the clouds, so there is genuine 3D depth and occlusion. The cityscape is rich and atmospheric with strong lighting; the whale is a dark silhouette that is somewhat hard to pick out against the busy city, and the surreal scale is moderate." },
  { slug: "gpt6-luna", render: "2D (animated HTML canvas)",
    desc: "A simple 2D night scene: a dark gradient sky, a small white crescent moon at upper left, and a few faint specks suggesting distant stars. A tiny, pale whale silhouette drifts across the lower third of the frame, barely thicker than a line and nearly blending into the background. There is no discernible cloud layer, and the whale is very small relative to the empty cityscape, giving almost no sense of surreal scale or cloud occlusion." },
  { slug: "qwen-3.8-flash", render: "3D (Three.js / WebGL)",
    desc: "A 3D night city of simple, unlit gray blocks under a dark sky. A small, pale whale with a faint trail swims in the upper-middle of the scene above the blocks. The whale is modestly sized compared to the tall, simple towers, so the scale contrast is weak. There is essentially no visible cloud layer, so there is no sense of the whale passing through clouds. The rendering is flat and low-detail, with a small whale and no real cloud interplay." },
  { slug: "step-5-preview", render: "2D (animated HTML canvas)",
    desc: "A dim 2D twilight scene: a dark city skyline of simple silhouettes along the bottom, a deep blue sky above with a few wispy clouds and a pale crescent moon. A medium-sized, light-blue whale with a faint white trail glides across the upper half of the sky, dwarfs the buildings and giving a moderate surreal scale contrast. The whale glides with clouds mostly behind it and a little drifting across its body, so there is some sense of swimming through the cloud layer, though the interplay is not strong or consistent." },
  { slug: "deepseek-4.1-flash-raccoon", render: "2D (animated HTML canvas)",
    desc: "A very dark, nearly black 2D night scene: only the faintest suggestion of a city skyline along the very bottom and a tiny crescent moon at upper right. An extremely thin, faint whale silhouette drifts near the center of the frame, barely visible against the near-black background and almost impossible to distinguish. There is essentially no cloud layer, the whale is microscopic and hard to see, and the overall image is extremely underlit. Negligible scale contrast and extremely low legibility." },
  { slug: "glm-5.3-raccoon", render: "3D (Three.js / WebGL)",
    desc: "A 3D scene of a simple, flat gray plane representing the city, with a few low, unlit blocks and a dark, featureless sky. A small, pale whale with a short, faint trail drifts above the plane. The whale is tiny relative to the empty city, giving no sense of surreal scale. There is no visible cloud layer, so there is no sense of the whale passing through clouds. The rendering is minimal and low-detail, with a tiny whale and no real cloud interplay." },
  { slug: "longcat-2.0", render: "2D (animated HTML canvas)",
    desc: "A somewhat dark 2D night city: a simple skyline of dark building silhouettes along the bottom, a dark blue-gray sky above with a few faint cloud patches and a tiny white crescent moon. An extremely long, thin, pale whale-like form drifts horizontally across the upper half of the sky, stretching from far left to far right. The form is very tall and thin, giving an odd, stretched proportion rather than a believable whale shape, and it is hard to read as a genuine whale with swimming motion. There are some clouds, but the form mostly reads as in front of them with little clear front/back interleaving, so the sense of swimming through clouds is weak or absent." },
  { slug: "gemini4argon", render: "3D (Three.js / WebGL)",
    desc: "A 3D WebGL night scene: a dark navy-blue sky over a city skyline. A large whale with a distinct body, tail flukes and pectoral fin glides across the upper frame above the buildings. The city below shows dark-blue towers dotted with warm yellow lit windows, and thin haze, clouds and stars surround the scene. Deep-blue palette with warm window points." },
];

const questions = Object.fromEntries(
  Object.entries(DIMS).map(([k, d]) => [k, { type: "score", instructions: d.instructions, criteria: d.criteria }])
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function scoreOne(item) {
  const body = { model: "jev-latest", state: { task: TASK, rendering: item.render, depiction: item.desc }, questions };
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch("https://api.typesafe.ai/v1/systemone", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 429 || res.status === 529) { await sleep(1500 * (attempt + 1)); continue; }
    if (!res.ok) throw new Error(`${item.slug}: HTTP ${res.status} ${await res.text()}`);
    return res.json();
  }
  throw new Error(`${item.slug}: retries exhausted`);
}

const results = [];
for (const item of ITEMS) {
  const r = await scoreOne(item);
  const dims = {};
  let total = 0;
  for (const [k, d] of Object.entries(DIMS)) {
    const a = r.answers[k];
    const frac = a.score / (d.criteria.length - 1);
    dims[k] = { score: +a.score.toFixed(2), confidence: +a.confidence.toFixed(2), frac: +frac.toFixed(3) };
    total += d.weight * frac;
  }
  const entry = { slug: item.slug, total: Math.round(total), dims, jev: r.model };
  results.push(entry);
  console.log(`${item.slug.padEnd(24)} total=${entry.total}  ` +
    Object.entries(dims).map(([k, v]) => `${k}=${v.score}`).join(" "));
}

results.sort((a, b) => b.total - a.total);
results.forEach((e, i) => (e.rank = i + 1));

const out = {
  generatedAt: new Date().toISOString(),
  model: results[0]?.jev || "jev",
  weights: Object.fromEntries(Object.entries(DIMS).map(([k, d]) => [k, d.weight])),
  dimLabels: { scale: "尺度反差", occlusion: "穿云遮挡", whale: "鲸鱼造型", scene: "城市氛围" },
  results,
};
writeFileSync(join(ROOT, "whale-over-city", "scores.json"), JSON.stringify(out, null, 2));
console.log(`\nWrote whale-over-city/scores.json — ${results.length} versions, top: ${results[0].slug} (${results[0].total}).`);
