// Score every roadster version with TypeSafe's Jev (System One) model.
// Jev is text-only, so each version is judged from a strictly factual, neutral
// description of its RENDERED output — Jev assigns the graded quality judgment.
// Run with the proxy on:
//   NODE_USE_ENV_PROXY=1 TYPESAFE_API_KEY=... node jev-score-roadster.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.TYPESAFE_API_KEY;
if (!KEY) { console.error("missing TYPESAFE_API_KEY"); process.exit(1); }

// The task every model was given.
const TASK =
  "Create a self-contained web page of 'SpaceX flying the Tesla Roadster': a cherry-red " +
  "Tesla Roadster with the spacesuited Starman at the wheel, floating/drifting through space " +
  "with Earth and stars behind it (or a cold-gas-thruster variant: vertical take-off, ramp jump " +
  "and soft landing). What matters is the car actually reading as a Roadster (roadster body " +
  "proportions, wheels, cabin), the Starman figure seated at the wheel in the classic relaxed " +
  "pose with arm on the sill, convincing space lighting (single sun, Earth curvature, stars), " +
  "and physical plausibility of thrust, drift and landing.";

// Judgment dimensions. Weights combine into a 0-100 overall score.
const DIMS = {
  vehicle: {
    weight: 30,
    instructions:
      "Rate the ROADSTER CAR: does the vehicle read as a Tesla Roadster / sports car — low roadster proportions with a long hood, cabin, distinct front and rear, and visible wheels — rendered with enough shape detail to be recognizable, versus a generic box, an unrecognizable blob, or no car at all?",
    criteria: [
      "No car visible, or a shape that cannot be read as a car at all",
      "A car is present but crude or wrong-proportioned — boxy, missing wheels/cabin, or barely identifiable",
      "A recognizable sports car with roadster proportions and basic body detail",
      "A clearly detailed Roadster — correct proportions, cabin, wheels, lights/panels readable as a Tesla roadster",
    ],
  },
  starman: {
    weight: 25,
    instructions:
      "Rate the STARMAN figure: is there a spacesuited driver seated at the wheel in the classic relaxed Starman pose (arm resting on the window sill, one hand on the wheel), legible as a suited human, versus a missing driver, a vague figure, or an unreadable puppet?",
    criteria: [
      "No driver figure at all",
      "A vague or crude figure that barely suggests a seated driver",
      "A clearly seated spacesuited driver with a plausible pose",
      "A legible, well-posed Starman — suit and helmet details visible, arm on the sill / hand on the wheel, relaxed posture",
    ],
  },
  space: {
    weight: 20,
    instructions:
      "Rate the SPACE SCENE and lighting: Earth (or Moon/planetary body) and a star field behind the car, single-source sunlight with correct dark shadows, sense of vacuum and scale — versus a flat gradient background, no celestial reference, or earthbound staging.",
    criteria: [
      "No sense of space — flat backdrop, no Earth/stars/light direction",
      "Minimal space cues (a few stars or a gradient), weak lighting",
      "A convincing space backdrop with Earth/stars and directional sunlight",
      "A striking space scene — Earth with atmosphere/curvature, dense stars, dramatic single-source light on the car",
    ],
  },
  flight: {
    weight: 25,
    instructions:
      "Rate the MOTION and PHYSICS of the piece: a drifting/tumbling roadster in vacuum (slow rotation, inertia), or — for the thruster variants — vertical take-off, cold-gas plumes from believable nozzles, a physically plausible trajectory and a soft landing, versus a static diorama, jerky teleporting, or thrust that looks wrong.",
    criteria: [
      "Static scene with no motion, or motion that is broken/jerky",
      "Some motion (drift/spin or launch) but physically unconvincing — no plumes, wrong trajectory, hard stop",
      "Believable motion — smooth drift/tumble or a plausible launch-and-land sequence with visible thruster effect",
      "Convincing dynamics — inertial drift/tumble, or a full take-off → maneuver → soft-landing sequence with well-realized cold-gas plumes",
    ],
  },
};

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
  dimLabels: { vehicle: "整车还原", starman: "Starman 姿态", space: "太空场景", flight: "飞行动力学" },
  results,
};
writeFileSync(join(ROOT, "roadster", "scores.json"), JSON.stringify(out, null, 2));
console.log(`\nWrote roadster/scores.json — ${results.length} versions, top: ${results[0]?.slug} (${results[0]?.total}).`);
