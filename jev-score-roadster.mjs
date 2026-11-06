// Score every roadster version with TypeSafe's Jev (System One) model.
// Jev is text-only, so each version is judged from a strictly factual, neutral
// description of its RENDERED output — Jev assigns the graded quality judgment.
// Run with the proxy on:
//   NODE_USE_ENV_PROXY=1 TYPESAFE_API_KEY=... node jev-score-roadster.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ENGINEERING_RUBRICS } from "./worker/src/engineering-rubrics.js";

const ROOT = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.TYPESAFE_API_KEY;
if (!KEY) { console.error("missing TYPESAFE_API_KEY"); process.exit(1); }

// The task every model was given.
// Use the SAME task and exact weighted criteria as Playground/Worker.
const { task: TASK, dims: DIMS, dimLabels: DIM_LABELS } = ENGINEERING_RUBRICS["roadster"];

// Factual, neutral descriptions of each RENDERED output.
const ITEMS = [
  { slug: "kimi-k3", render: "3D (Three.js / WebGL, self-contained)",
    desc: "A deep-space 3D scene that is almost entirely black: the captured frame is near-uniform darkness with one small dark-red roadster-shaped cluster at the center of the frame, reading as a tiny red car drifting in void. The page's code builds Earth and a moon and a Starman figure, but in the captured still no Earth or starman is legible — the composition is a vast black field with a very small subject, so the car, driver and scene are barely readable." },
  { slug: "deepseek-v4.1-flash", render: "3D (Three.js / WebGL via CDN)",
    desc: "A 3D scene that fades in from a pure-black page: the captured still is a dim warm maroon wash (the fade barely begun), with only a faint darker subject hint near the center. The page's code is built around Earth and a Starman at the wheel with thrusters, but in the captured moment almost nothing has emerged from the darkness — the image reads as a dark red-brown fog with no legible car, driver or Earth." },
  { slug: "gemini-4-argon-high", render: "3D (Three.js / WebGL via CDN)",
    desc: "A dim, low-contrast 3D night scene in dark blue-grey tones: scattered slightly brighter patches suggest machinery and structure around the center of the frame (the piece is a 'cold-gas thruster package' build with nozzles, launch and landing stages in its code), but no car, driver or Earth is clearly legible in the still — everything sits within a narrow dark blue band, so the subject cannot be read." },
  { slug: "opus-5.5", render: "3D (Three.js / WebGL, self-contained)",
    desc: "A black space scene with one clear bright element: a large blue Earth rendered with atmosphere glow rising from the lower-left of the frame. A small grey silhouette floats near the center — the car on its flight — but it is dark and small against the void, with no legible driver figure. Strong Earth-vs-void contrast, but the roadster and Starman are only faintly visible." },
  { slug: "glm-5.3", render: "3D (Three.js / WebGL)",
    desc: "The most legible car of the batch: a large pale white roadster-shaped body stretches across the center of the frame in daylight-style lighting, sitting above grey-blue ground and sky tones that read as a launch site (the page's timeline is launch → vertical ramp jump → landing, with a moon in the sky). The car body is bright and clearly readable as a low sports car, though it reads white rather than the real cherry red; no suited driver is distinguishable at this distance." },
  { slug: "glm-5.3-flash", render: "3D (Three.js / WebGL)",
    desc: "A night vertical-launch scene: a bright pale-blue plume/gantry column rises through the center of the frame against dark blue-grey surroundings, with faint pink flame tones near its base. The composition reads as a launch in progress, but the car itself is not clearly separable from the plume and structure in the still, and no driver or Earth is visible." },
  { slug: "mercury-3", render: "3D (Three.js / WebGL)",
    desc: "A uniformly dim blue-grey 3D scene with a soft brighter region across the middle: values sit in a narrow dark band with no strong subject contrast, so no car, driver, moon or Earth can be clearly made out — the image reads as an under-lit blue haze (the page's code mentions a moon, launch and cold-gas landing stages)." },
  { slug: "step-5-preview", render: "3D (Three.js / WebGL)",
    desc: "A black space scene with a bright pale-blue cluster — an Earth rendered with atmosphere — at the center-left of the frame, surrounded by void. A small dark shape near the center suggests the drifting car, but neither roadster detail nor the suited Starman is legible at this scale; the image is dominated by empty black with one celestial highlight." },
  { slug: "hy4-preview", render: "2D (animated HTML canvas)",
    desc: "A 2D canvas page whose background is pure black, and whose captured frame stays near-black: at best a faint glow (peak luminance ~13%) hints at a liftoff in progress, but no car, rocket, flame or star field can be made out. The page's code references Earth and Starman, yet the rendered output in the captured still is effectively an empty black screen." },
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
writeFileSync(join(ROOT, "roadster", "scores.json"), JSON.stringify(out, null, 2));
console.log(`\nWrote roadster/scores.json — ${results.length} versions, top: ${results[0]?.slug} (${results[0]?.total}).`);
