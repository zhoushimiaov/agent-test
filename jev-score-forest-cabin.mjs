// Score every forest-cabin version with TypeSafe's Jev (System One) model.
// Jev is text-only, so each version is judged from a strictly factual, neutral
// description of its RENDERED output — Jev assigns the graded quality judgment.
// Run with the proxy on:
//   NODE_USE_ENV_PROXY=1 TYPESAFE_API_KEY=... node jev-score-forest-cabin.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.TYPESAFE_API_KEY;
if (!KEY) { console.error("missing TYPESAFE_API_KEY"); process.exit(1); }

// The task every model was given.
const TASK =
  "Create a self-contained web page presenting Peter Zumthor's Leis Houses (莱斯木屋) — " +
  "timber houses in a Swiss alpine valley built in the local Strickbau method, where squared " +
  "logs are stacked layer by layer on a stone plinth under a low-pitched roof. The building " +
  "carries almost no ornament: its character comes from the thickness of the timber, the " +
  "shadows in the joints, and the way daylight travels through the interior. The page should " +
  "let the viewer roam the building and study it, judged on: how faithfully the construction " +
  "is modelled (stacked log courses, stone plinth, gable and roof proportions, window and door " +
  "openings), the material detail (wood grain, joint seams, masonry), the interior light and " +
  "atmosphere (raking light through openings, soft shadow, silence), and the presentation " +
  "(camera views and interface) that communicates the architecture.";

// Judgment dimensions. Weights combine into a 0-100 overall score.
const DIMS = {
  construction: {
    weight: 30,
    instructions:
      "Rate the CONSTRUCTION FIDELITY: is the building actually built as stacked log courses (Strickbau) on a stone plinth with a low gabled roof — distinct horizontal timber layers with visible joints at the corners, a stone base, correct gable and roof pitch, real window/door openings — versus a generic box, a cabin made of smooth walls, or an abstract mass with no timber logic?",
    criteria: [
      "No building, or an abstract mass/box with no recognizable timber construction",
      "A house-like shape, but the construction is generic — smooth walls, no log courses, no plinth, or wrong roof",
      "A clearly timber building with stacked courses, a stone base and a gabled roof; some joints/openings approximate",
      "Faithful Strickbau — layered log courses with corner joints, stone plinth, correct gable and low roof pitch, real openings, proportions right",
    ],
  },
  material: {
    weight: 25,
    instructions:
      "Rate MATERIAL AND DETAIL: how convincing the timber is (grain, weathered tone, thickness of each course, joint seams and shadow lines) and the masonry plinth, versus flat untextured surfaces or plastic-looking geometry.",
    criteria: [
      "Flat, untextured surfaces with no material character",
      "Basic color only — wood and stone told apart by hue, no grain, seams or weathering",
      "Readable materials — timber tone and grain, visible course seams, a stone base with some texture",
      "Rich, tactile materials — weathered wood grain, deep joint shadows, layered stone, convincing surface detail at close range",
    ],
  },
  light: {
    weight: 25,
    instructions:
      "Rate INTERIOR LIGHT AND ATMOSPHERE: raking daylight through openings, soft indirect bounce, deep quiet shadow, haze or mist in the valley — the sense of a silent, contemplative space — versus flat even lighting or a scene with no atmosphere.",
    criteria: [
      "Flat, evenly lit render with no atmosphere or shadow",
      "Some lighting variation, but no real sense of light entering the interior or of mood",
      "A convincing lit scene — directional daylight, shadow and some interior glow through openings",
      "Atmospheric and evocative — raking light through openings, soft bounce, deep quiet shadow, valley haze; the space feels silent",
    ],
  },
  presentation: {
    weight: 20,
    instructions:
      "Rate PRESENTATION: the camera work and interface that let a viewer study the building — multiple architectural views (axon, facade, interior/hearth), orbit or walkthrough, labelled hotspots or parameters — versus a single static view with no way to explore.",
    criteria: [
      "One static view, no way to explore or identify anything",
      "A single controllable camera with no other views or information",
      "Several camera views and some labels/parameters that help study the building",
      "A curated architectural presentation — multiple named views (axon/facade/interior), hotspots, environment presets, a considered interface",
    ],
  },
};

// Factual, neutral descriptions of each RENDERED output.
const ITEMS = [
  { slug: "gemini-4-argon", render: "3D (Three.js / WebGL, self-contained)",
    desc: "A 3D alpine scene rendered in muted natural tones: the upper band of the frame is a pale grey-white sky and mist, below it the composition opens into a valley of desaturated green forest and meadow, and across the middle of the frame sits a warm timber building group — tan and brown log-built volumes with a low roof, reading clearly as a cluster of wooden houses on a site. Values run from bright sky down to deep shadow in the trees, with a soft hazy gradient between, so the frame has genuine depth and a quiet, overcast alpine mood rather than flat lighting. The page provides an architectural console: ten named camera views (DAYLIGHT, ALPINE DUSK, STARLIGHT, MIST, HEARTH, PINE TRAIL, VALLEY AXON, SOUTH FACADE, HEARTH VIEW, VALS PLINTH), auto-orbit, hotspot cards, an environment/parameter slider panel, an FPS readout, and a caption identifying it as Peter Zumthor's Leis Houses with solid-timber (Strickbau) construction." },
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
    const frac = a.score / maxLevel;
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
  dimLabels: { construction: "构造还原", material: "材质细节", light: "室内光影", presentation: "呈现与漫游" },
  results,
};
writeFileSync(join(ROOT, "forest-cabin", "scores.json"), JSON.stringify(out, null, 2));
console.log(`\nWrote forest-cabin/scores.json — ${results.length} versions, top: ${results[0]?.slug} (${results[0]?.total}).`);
