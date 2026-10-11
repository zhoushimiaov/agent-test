// Score every lion-fire-hoop version with TypeSafe's Jev (System One) model.
// Jev is text-only, so each version is judged from a strictly factual, neutral
// description of its RENDERED output (observed across the full animation loop,
// since this task is about timing) — Jev assigns the graded quality judgment.
// Run with the proxy on:
//   NODE_USE_ENV_PROXY=1 TYPESAFE_API_KEY=... node jev-score-lion.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.TYPESAFE_API_KEY;
if (!KEY) { console.error("missing TYPESAFE_API_KEY"); process.exit(1); }

// The task every model was given.
const TASK =
  "Create a self-contained web page animating 'a lion leaping through a ring of fire'. " +
  "What matters is a believable jump: a gravity-shaped parabolic arc from run-up to " +
  "take-off, apex and landing; the lion actually passing through the CENTER of the " +
  "flaming hoop at the top of its arc with the timing aligned (inside the ring " +
  "mid-jump, not early or late, no clipping); a convincing fire ring with flames and " +
  "sparks; and an appealing lion and overall scene. Photoreal accuracy is not required " +
  "— the jump reading correctly in time and space is the point.";

// Judgment dimensions. Each is a Score question with ordered, situation-based
// levels (index 0 = worst). Weights combine into a 0-100 overall score. Per
// lion-fire-hoop's brief, the parabolic arc and the through-the-ring timing are
// the headline tests, then the fire effect and the lion/scene.
const DIMS = {
  arc: {
    weight: 30,
    instructions:
      "Rate the JUMP ARC: does a lion perform a believable leap with a gravity-shaped parabolic trajectory — crouch/run-up, take-off, a rounded apex, then landing — rather than sliding, floating, teleporting, or no jump at all? A lion that never leaves the ground, or no visible lion, scores lowest.",
    criteria: [
      "No lion visible, or no jump at all (lion absent or static on the ground)",
      "The lion moves but there is no real parabolic leap — it slides, floats flatly, or only shuffles toward the ring",
      "A recognizable jump with a roughly parabolic arc, if a little stiff or imperfectly timed",
      "A convincing, gravity-shaped parabolic leap — clear crouch/take-off, rounded apex and landing",
    ],
  },
  through: {
    weight: 30,
    instructions:
      "Rate PASSING THROUGH THE RING ON TIME: does the lion actually travel through the CENTER of the fire hoop at the apex of its jump, with the timing aligned so it is inside the ring mid-leap (not jumping before/after the ring, not clipping through the rim or missing it)? If no lion passes through the ring, score lowest.",
    criteria: [
      "The lion never passes through the ring (absent, misses it, or there is no jump)",
      "The lion reaches the ring but the pass-through is off — it goes around/behind, clips the rim, or the timing is clearly wrong",
      "The lion passes through the ring roughly on time, with minor timing or alignment issues",
      "The lion passes cleanly through the ring center exactly at the apex, timing precisely aligned",
    ],
  },
  fire: {
    weight: 20,
    instructions:
      "Rate the FIRE RING: how convincing are the flames, sparks, glow and heat of the hoop — a living ring of fire with flickering flames and drifting embers, versus a plain glowing circle or static outline.",
    criteria: [
      "No ring, or a flat drawn circle with no fire",
      "A glowing ring with minimal flame feeling",
      "A clearly flaming ring with some flicker, sparks or glow",
      "A vivid, lively ring of fire — flickering flames, embers/sparks and warm glow working together",
    ],
  },
  scene: {
    weight: 20,
    instructions:
      "Rate the LION design and overall SCENE: how appealing and readable the lion character is, plus composition, color, lighting, staging and polish of the whole image.",
    criteria: [
      "Crude or unreadable, with no real composition",
      "Basic and plain, or the lion is barely legible",
      "A pleasing, coherent lion and scene with decent polish",
      "A striking, well-composed lion and stage with strong color, lighting and atmosphere",
    ],
  },
};

// Factual, neutral descriptions of each RENDERED output, observed across the
// full animation loop (frames at ~0.4/1.1/1.8/2.5/3.2/4.0s).
const ITEMS = [
  { slug: "gemini-3.8-flash", render: "3D (Three.js / WebGL, 低多边形)",
    desc: "A low-poly 3D circus ring on a reflective floor. A blocky stylized lion crouches, runs up and launches into the air, passing through the center of an upright fire hoop at the top of its arc in a burst of white cube particles, then lands and tumbles on the far side before the loop repeats. A clear full jump through the ring center with a particle burst; the art style is deliberately blocky/voxel and the stage lighting is dim." },
  { slug: "glm-5.3", render: "3D (Three.js / WebGL)",
    desc: "A dark desert scene with pyramids and a single tall, narrow vertical orange ring glowing on the ground, sparks drifting from its top. A tiny lion figure sits far to the left and barely moves; there is no visible run-up or leap through the ring across the loop. The ring is the main subject, the lion is distant and almost unreadable, and no jump through the hoop is shown." },
  { slug: "ling-3.1-flash", render: "3D (Three.js / WebGL, 低多边形)",
    desc: "A low-poly 3D lion with a spiky mane stands on dark ground to the left of a large glowing ring. Over the loop the lion walks toward the ring with a slight bob and its mane bristles, but it stays on the ground and does not clearly leave the floor or pass through the ring center; no airborne parabola is shown. Warm ground glow, simple scene." },
  { slug: "deepseek-4.1-flash", render: "2D (animated HTML canvas)",
    desc: "A side-view 2D circus scene with string lights and a bright vertical glowing hoop on a stand. A nicely drawn lion runs in from the left in a running stride toward the hoop and reaches it, but a clear airborne arc through the hoop center is not evident — the lion mostly stays low and runs up to or past the ring rather than leaping through it. Good character art and a convincing glowing ring, weaker on a readable jump arc." },
  { slug: "mimo-2.6-flash", render: "2D (animated HTML canvas)",
    desc: "A circus arena with spotlights and a large, bright circular fire ring glowing center stage. No lion is visible anywhere across the loop — only the flaming ring and the empty arena are shown. The fire ring itself is attractive, but the subject (a jumping lion) is absent." },
  { slug: "glm-5.3-flash", render: "2D (animated HTML canvas)",
    desc: "A large flaming ring stands center stage under spotlights. For most of the loop no lion is present; late in the cycle a small orange line-art lion runs in from the lower left and leaps, its silhouette passing through the center of the fire ring at the end of the cycle. A jump through the ring center does occur, but the lion is small and stylized and only appears briefly." },
  { slug: "opus-4.8", render: "2D (animated HTML canvas)",
    desc: "A beautifully rendered glowing ring with a soft outer halo over dark dunes, a full moon and a starry sky. The scene is elegant and polished, but no lion appears at any point in the loop — there is no jump and no character, only the glowing ring and the landscape." },
  { slug: "tierflow-pro", render: "2D (animated HTML canvas)",
    desc: "A night scene with a crescent moon and a ring outlined by many small flame dots on the right. A small lion silhouette stands on the ground to the left and stays essentially static throughout the loop; it never runs up or jumps through the ring. Both lion and ring are present, but there is no jump." },
  { slug: "muse-spark", render: "2D (SVG 动画)",
    desc: "A very dark, low-contrast stage. A faint lion shape sits at the lower left and a faint flaming ring is at the right; the ring brightens slightly over the loop but the lion does not visibly run or leap through it. The scene is hard to read because it is so dark, and no clear jump through the ring is shown." },
  { slug: "qwen-3.8-flash-next", render: "2D (animated HTML canvas)",
    desc: "A dark arena with spotlights and a tall, narrow upright flaming hoop on a small stand center stage. No lion is visible at any point in the loop — only the burning hoop and the empty stage are shown." },
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
  dimLabels: { arc: "跳跃弧线", through: "穿圈时机", fire: "火圈效果", scene: "造型与场景" },
  results,
};
writeFileSync(join(ROOT, "lion-fire-hoop", "scores.json"), JSON.stringify(out, null, 2));
console.log(`\nWrote lion-fire-hoop/scores.json — ${results.length} versions, top: ${results[0].slug} (${results[0].total}).`);
