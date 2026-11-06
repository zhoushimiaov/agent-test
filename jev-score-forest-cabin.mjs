// Score every forest-cabin version with TypeSafe's Jev (System One) model.
// Jev is text-only, so each version is judged from a strictly factual, neutral
// description of its RENDERED output — Jev assigns the graded quality judgment.
// Run with the proxy on:
//   NODE_USE_ENV_PROXY=1 TYPESAFE_API_KEY=... node jev-score-forest-cabin.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ENGINEERING_RUBRICS } from "./worker/src/engineering-rubrics.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.TYPESAFE_API_KEY;
if (!KEY) { console.error("missing TYPESAFE_API_KEY"); process.exit(1); }

// The task every model was given.
// Use the SAME task and exact weighted criteria as Playground/Worker.
const { task: TASK, dims: DIMS, dimLabels: DIM_LABELS } = ENGINEERING_RUBRICS["forest-cabin"];

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
  dimLabels: DIM_LABELS,
  results,
};
writeFileSync(join(ROOT, "forest-cabin", "scores.json"), JSON.stringify(out, null, 2));
console.log(`\nWrote forest-cabin/scores.json — ${results.length} versions, top: ${results[0]?.slug} (${results[0]?.total}).`);
