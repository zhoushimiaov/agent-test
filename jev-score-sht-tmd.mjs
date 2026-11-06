// Score every sht-tmd version with TypeSafe's Jev (System One) model.
// Jev is text-only, so each version is judged from a strictly factual, neutral
// description of its RENDERED output — Jev assigns the graded quality judgment.
// Dimension design follows the task's own rubric (U:/_build/SHT-TMD/_evaluator/
// rubric_100.md): 事实与造型还原 30 / 工程与物理正确性 20 / 三维表现力 20 /
// 前端信息设计 18 / 交互与参数化 7 (+环境 5), compressed here into five Jev dims.
// Run with the proxy on:
//   NODE_USE_ENV_PROXY=1 TYPESAFE_API_KEY=... node jev-score-sht-tmd.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ENGINEERING_RUBRICS } from "./worker/src/engineering-rubrics.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.TYPESAFE_API_KEY;
if (!KEY) { console.error("missing TYPESAFE_API_KEY"); process.exit(1); }

// The task every model was given (standardized prompt, mode D).
// Use the SAME task and exact weighted criteria as Playground/Worker.
const { task: TASK, dims: DIMS, dimLabels: DIM_LABELS } = ENGINEERING_RUBRICS["sht-tmd"];

// Factual, neutral descriptions of each RENDERED output.
const ITEMS = [
  { slug: "gemini-4-argon", render: "3D (Three.js / WebGL, assembled from split parts)",
    desc: "A bright white architectural-model presentation: the upper half of the frame is a near-white studio background, with a light-grey tower form and a darker structural band across the lower-left. The build's code implements the full vocabulary — a tall mass block hung on cables from fixed beams, a portal frame, four diagonal snubbers, a stacked-ring eye sculpture, a 120°-twisted rounded-triangle tower with double skin, SWFC and city context, and a typhoon timeline with a 2-DOF RK4 solver — but in the captured still the damper detail is small on the model and no telemetry HUD is visible." },
  { slug: "glm", render: "3D (Three.js / WebGL, multi-file project inlined)",
    desc: "A dark blue-teal night scene: the whole frame sits in a narrow deep-blue band, lighter at the top (sky) and darkening downward, with soft blue gradients suggesting water and a night city during the typhoon scenario. No bright subject, HUD or readable damper detail emerges in the still — the image reads as a dim night skyline study; the code carries cables, an eye sculpture, 120° twist and a 1000-ton mass, but none is legible at this moment." },
  { slug: "glm-5.3", render: "3D (Three.js / WebGL, self-contained)",
    desc: "A bright white architectural-model scene on a near-white background: a pale tower model with a dark vertical silhouette band on the left of the frame and a soft white-grey gradient studio setting, with a telemetry-style UI region suggested at the right edge. The presentation reads as a clean professional model shot; the damper hall and mass block are not clearly legible in the captured still. The build (per its README, a single 651 KB self-contained file) auto-plays a staged typhoon timeline with real-time physics and live telemetry curves." },
  { slug: "deepseek-v4.1-flash-1017", render: "3D (Three.js / WebGL, self-contained)",
    desc: "A warm dusk-toned scene: the frame is built from dark browns and beiges with distinct muted-green patches (reading as the river/park in the city context), mid-tone structures across the middle and a darker sky above. The overall exposure is low with no bright highlight, so the tower and damper read as silhouettes; the page's documentation claims a 30-second auto-loop narrative, telemetry with sway/stroke/reduction figures, a ±2 m stroke limit and phase-dependent reduction ratios." },
  { slug: "kimi-k3", render: "3D (Three.js / WebGL, self-contained)",
    desc: "A bright white architectural-model composition very close in framing to the GLM 5.3 page: near-white background, a pale tower model with a dark vertical band on the left, small dark detail on the crown. The code carries the damper vocabulary (mass block, cables, portal, eye sculpture, 120° twist, typhoon timeline), but in the captured still the damper is a small element and no HUD is legible." },
  { slug: "kimi-work-1.1", render: "3D (Three.js / WebGL via CDN)",
    desc: "A light grey-green scene with the clearest golden accents of the batch: the lower part of the frame carries a distinct gilded gold band (reading as the gilded base / eye-sculpture metalwork), over pale grey-green architecture and a bright background. The build is the smallest of the set and its code mentions the fewest damper elements (a mass block, two cables, an eye, Oriental Tower), and no telemetry HUD is visible in the still." },
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
writeFileSync(join(ROOT, "sht-tmd", "scores.json"), JSON.stringify(out, null, 2));
console.log(`\nWrote sht-tmd/scores.json — ${results.length} versions, top: ${results[0]?.slug} (${results[0]?.total}).`);
