// Score every jellyfish-float version with TypeSafe's Jev (System One) model.
// Jev is text-only, so each version is judged from a strictly factual, neutral
// description of its RENDERED output (produced by vision review) — Jev assigns
// the graded quality judgment on each dimension. Run with the proxy on:
//   NODE_USE_ENV_PROXY=1 TYPESAFE_API_KEY=... node jev-score-jellyfish.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.TYPESAFE_API_KEY;
if (!KEY) { console.error("missing TYPESAFE_API_KEY"); process.exit(1); }

// The task every model was given.
const TASK =
  "Create a self-contained web page animating 'a jellyfish floating in water'. " +
  "What matters is a translucent, luminous bell (伞体) that reads as a layered, " +
  "semi-transparent body; soft trailing tentacles that drape and flow naturally; " +
  "and a convincing underwater atmosphere with light attenuation and scattering " +
  "(god rays, glow, depth). Photoreal accuracy is not required — translucency, " +
  "softness and a sense of gentle flow are the point.";

// Judgment dimensions. Each is a Score question with ordered, situation-based
// levels (index 0 = worst). Weights combine into a 0-100 overall score. Per
// jellyfish-float's brief, the translucency of the bell is the headline test,
// followed by the soft tentacles and the underwater light.
const DIMS = {
  translucency: {
    weight: 30,
    instructions:
      "Judging the jellyfish's BELL (伞体), rate how translucent and layered it reads — a soft semi-transparent membrane with inner structures faintly visible through it, a luminous rim and gradients, rather than a flat opaque dome. Translucency and layering are the headline test for this task.",
    criteria: [
      "No bell, or a flat opaque shape with no transparency",
      "A bell shape but mostly flat or solid, with little real translucency",
      "A clearly translucent bell with some gradient and glow, inner structure partly visible",
      "A richly translucent, layered bell — soft membrane, luminous rim, inner structures showing through, convincing depth",
    ],
  },
  tentacles: {
    weight: 25,
    instructions:
      "Judging the TENTACLES / oral arms, rate how soft, numerous and naturally flowing they look — fine strands that drape and curve organically as if drifting in water, rather than stiff, sparse or ruler-straight lines.",
    criteria: [
      "No tentacles at all",
      "A few stiff or straight strands with little sense of soft drape",
      "Multiple tentacles with some natural curve and flow",
      "Many fine, soft tentacles draping and curving organically with a strong sense of gentle underwater flow",
    ],
  },
  light: {
    weight: 25,
    instructions:
      "Rate the UNDERWATER LIGHT: god rays or light shafts from above, soft attenuation into darker depth, scattering, drifting particles, and the jellyfish's own glow lighting the surrounding water. A flat, uniform background is weak.",
    criteria: [
      "Flat, with no sense of underwater light or depth",
      "A plain water-colored background with minimal lighting",
      "Some light shafts, glow or depth gradient giving an underwater feel",
      "Convincing underwater light — soft god rays, depth attenuation, scattering/particles and glow working together",
    ],
  },
  beauty: {
    weight: 20,
    instructions:
      "Rate the overall AESTHETIC and composition: color harmony, framing, depth layering (e.g. background jellyfish), polish and how pleasing and cohesive the whole image is.",
    criteria: [
      "Crude or unpleasant, with no real composition",
      "Basic and plain",
      "A pleasing, coherent composition with decent polish",
      "A striking, elegant, polished composition with strong color, depth and atmosphere",
    ],
  },
};

// Factual, neutral descriptions of each RENDERED output (from vision review).
const ITEMS = [
  { slug: "gemini-3.8-flash", render: "3D (Three.js / WebGL)",
    desc: "Dark teal water with faint vertical light shafts and floating particles. A detailed jellyfish is centered: a translucent bell with a purple-magenta top rim over a glowing cyan dome, a pink patch of inner structure showing through, and a long dense bundle of fine glowing cyan tentacles trailing straight down to a bright luminous core streak. Highly detailed and strongly bioluminescent with very long tentacles." },
  { slug: "gemini-3.8-flash-25s", render: "3D (Three.js / WebGL)",
    desc: "Nearly identical to the detailed cyan-and-magenta bioluminescent jellyfish: a translucent purple-rimmed cyan bell with pink inner structure and a long dense bundle of fine glowing tentacles trailing down to a bright core, set in dark particle-filled teal water. The framing differs slightly but the quality and detail match the strongest version." },
  { slug: "gemini-3.8-flash-bioluminescent", render: "3D (Three.js / WebGL)",
    desc: "A darker deep-sea scene with scattered particles. A smaller teal jellyfish with a rounded glowing dome bell, a bright cyan neon rim and a thin trailing bundle of fine tentacles. Clean neon glow and clear translucency, but the subject is simpler and smaller in frame than the most detailed versions, with less visible inner structure." },
  { slug: "deepseek-4.1-flash", render: "3D (Three.js / WebGL)",
    desc: "A deep blue gradient with a soft light beam from above. A smooth, realistic translucent jellyfish: a bluish domed bell catching soft light highlights, with many fine white translucent tentacles fanning down and outward, lit by gentle caustic light. Soft, elegant and photoreal-leaning transparency, though less vividly colored than the neon versions." },
  { slug: "mimo-2.6-flash", render: "2D (animated HTML canvas)",
    desc: "A deep blue scene with crossing light shafts and bokeh particles. A central jellyfish has a translucent scalloped blue bell edged with a dotted rim and long thin pink-magenta tentacles streaming down; two smaller jellyfish drift in the background, giving depth. Clean and well-composed 2D with layered depth." },
  { slug: "opus-4", render: "2D (animated HTML canvas)",
    desc: "A dark scene with a large smooth translucent white-blue dome bell glowing at the top, pink-magenta inner oral arms, and thin tentacles with small beaded tips hanging straight down. Centered, luminous and clean, with a soft surrounding glow, but the background is simple with little depth or light-shaft work." },
  { slug: "glm-5.3-flash", render: "2D (animated HTML canvas)",
    desc: "Dark greenish-teal water with soft light shafts. A violet domed bell with fine radial pink-purple tentacle strands trailing straight down, and a small faint jellyfish silhouette at lower left for depth. Moody and elegant with good translucency, though the tentacles read as fairly straight strands rather than soft drapes." },
  { slug: "ling-3.1-flash", render: "2D (animated HTML canvas)",
    desc: "Deep blue water with light shafts and particles. A central translucent bell carries a bright pink-magenta floral glow pattern on top, with fine long tentacles trailing down, plus two background jellyfish (one at right, one lower-left) adding depth. Detailed, colorful and well-layered." },
  { slug: "muse-spark", render: "2D (animated HTML canvas)",
    desc: "Deep blue water with light shafts from above and rising bubbles. A glowing violet domed bell with bright pink inner strands and fine tentacles trailing down, centered and luminous over a relatively simple background. Pretty and clean, with modest depth." },
  { slug: "tierflow-pro", render: "2D (animated HTML canvas)",
    desc: "Blue water showing a wavy water surface at the top with light rays coming through it. A jellyfish with a translucent pinkish-purple bell and long flowing oral arms/tentacles drifting down, with two faint background jellyfish silhouettes at right. The visible surface plus depth layers give a strong sense of underwater context." },
  { slug: "gpt6-luna", render: "2D (CSS animation)",
    desc: "A brighter teal-blue near-surface water gradient with soft lens-flare light circles. A simple glowing cyan jellyfish with a smooth translucent dome bell and a short wispy bundle of tentacles trailing down, with a small 'SOFT CURRENT / DEEP BLUE' caption along the bottom. Clean and pretty but minimal, with a lighter palette and less depth and detail than the darker deep-sea renders." },
];

const questions = Object.fromEntries(
  Object.entries(DIMS).map(([k, d]) => [k, { type: "score", instructions: d.instructions, criteria: d.criteria }])
);

async function scoreOne(item) {
  const body = {
    model: "jev-latest",
    state: { task: TASK, rendering: item.render, depiction: item.desc },
    questions,
  };
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
for (const item of ITEMS) {
  const r = await scoreOne(item);
  const dims = {};
  let total = 0;
  for (const [k, d] of Object.entries(DIMS)) {
    const a = r.answers[k];
    const maxLevel = d.criteria.length - 1;
    const frac = a.score / maxLevel;               // 0..1
    dims[k] = { score: +a.score.toFixed(2), confidence: +a.confidence.toFixed(2), frac: +frac.toFixed(3) };
    total += d.weight * frac;
  }
  const entry = { slug: item.slug, total: Math.round(total), dims, jev: r.model };
  results.push(entry);
  console.log(`${item.slug.padEnd(32)} total=${entry.total}  ` +
    Object.entries(dims).map(([k, v]) => `${k}=${v.score}`).join(" "));
}

results.sort((a, b) => b.total - a.total);
results.forEach((e, i) => (e.rank = i + 1));

const out = {
  generatedAt: new Date().toISOString(),
  model: results[0]?.jev || "jev",
  weights: Object.fromEntries(Object.entries(DIMS).map(([k, d]) => [k, d.weight])),
  dimLabels: { translucency: "伞体通透感", tentacles: "柔体律动", light: "水下光线", beauty: "整体美感" },
  results,
};
writeFileSync(join(ROOT, "jellyfish-float", "scores.json"), JSON.stringify(out, null, 2));
console.log(`\nWrote jellyfish-float/scores.json — ${results.length} versions, top: ${results[0].slug} (${results[0].total}).`);
