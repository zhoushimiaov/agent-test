// Score every elephant-tightrope version with TypeSafe's Jev (System One) model.
// Jev is text-only, so each version is judged from a strictly factual, neutral
// description of its RENDERED output (produced by vision review) — Jev assigns
// the graded quality judgment on each dimension. Run with the proxy on:
//   NODE_USE_ENV_PROXY=1 TYPESAFE_API_KEY=... node jev-score-elephant.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.TYPESAFE_API_KEY;
if (!KEY) { console.error("missing TYPESAFE_API_KEY"); process.exit(1); }

// The task every model was given.
const TASK =
  "Create a self-contained web page animating 'an elephant walking a tightrope'. " +
  "An elephant is a huge, heavy animal balancing on a thin high wire, typically " +
  "using a long balance pole; the dramatic contrast between the enormous weight " +
  "and the thin wire — which should bow/sag into a tension curve under the load — " +
  "is the whole point. A clearly recognizable, prominent elephant and a convincing " +
  "sense of weight and wire tension are what matter; photoreal accuracy is not required.";

// Judgment dimensions. Each is a Score question with ordered, situation-based
// levels (index 0 = worst). Weights combine into a 0-100 overall score. Per
// elephant-tightrope's brief, the distinguishing features are the sense of
// WEIGHT + balance-pole counterweight and the WIRE's sag/tension, so those are
// weighted highest.
const DIMS = {
  weight: {
    weight: 30,
    instructions:
      "Judge the sense of the elephant's massive WEIGHT and the balance pole acting as counterweight. The brief wants a strong feeling of heaviness — the body's bulk, how it bears down on the wire — paired with a long balance pole (平衡杆) carried to counter it. A weightless, floaty elephant or a missing balance pole is the failure mode here.",
    criteria: [
      "No sense of weight at all, and no balance pole",
      "Some bulk but the elephant looks weightless or floaty, or the balance pole is missing or merely token",
      "A believable heavy elephant with a balance pole, but the weight-and-counterweight interplay is only modest",
      "A strong, convincing sense of great weight paired with a clear long balance pole doing visible counterbalancing work",
    ],
  },
  wire: {
    weight: 25,
    instructions:
      "Judge the TIGHTROPE / wire itself: whether it reads as a thin high wire under load, ideally bowing/sagging into a tension curve beneath the heavy elephant and anchored to posts. A perfectly straight rigid beam, or a faint incidental line, is weak; a clear sag that responds to the weight is best.",
    criteria: [
      "No wire, or the elephant is not actually standing on a wire",
      "A wire is present but stiff and straight like a solid beam, or faint and incidental",
      "A clear thin tightrope the elephant stands on, with some give or believable anchoring, but little sag",
      "A convincing thin wire visibly bowing into a tension/sag curve under the elephant's weight, anchored to posts",
    ],
  },
  elephant: {
    weight: 25,
    instructions:
      "Judging ONLY the elephant, rate how recognizable, well-formed and detailed it is (trunk, tusks or ears, four legs, bulky body) and whether it is prominent and clearly readable in the frame. A tiny, dark or indistinct elephant is a failure here.",
    criteria: [
      "No animal at all, or an unidentifiable shape",
      "An animal-like form that barely reads as an elephant, or so small/dark that its features are lost",
      "Clearly an elephant (trunk, ears, body, legs) and reasonably visible, but stiff, crude or lacking detail",
      "A bold, well-formed, detailed elephant — clear trunk, ears, legs and body, prominent and easy to read",
    ],
  },
  scene: {
    weight: 20,
    instructions:
      "Rate the overall SCENE and polish: backdrop, lighting, framing, atmosphere and cohesion (e.g. a circus, night sky or dusk setting, spotlights, depth). Judge visual appeal and cohesion, NOT the realism of the elephant/wire scale.",
    criteria: [
      "Empty or flat: no real backdrop, visually dull",
      "A basic backdrop but plain composition and lighting",
      "A coherent scene with a decent backdrop, lighting and framing",
      "A striking, atmospheric scene — strong setting, lighting, depth and polish",
    ],
  },
};

// Factual, neutral descriptions of each RENDERED output (from vision review).
const ITEMS = [
  { slug: "gemini-3.8-flash", render: "3D (Three.js / WebGL)",
    desc: "A dark starry night scene with faint dark triangular mountains/pyramids in the background and small pennant flags. A small blue-grey elephant with white tusks stands on a thin dark wire strung low across the frame, with a slender balance element crossing its body. The elephant is modest in size and the scene is dim, so detail is limited; the wire runs nearly straight with only a gentle dip." },
  { slug: "nemotron-3-ultra", render: "3D (Three.js / WebGL)",
    desc: "An almost entirely black, very dim scene. A small elephant-like 3D form floats near the top center and is partially cropped, with no visible tightrope, no balance pole and no discernible background. Features are extremely hard to make out because of the darkness; the framing is weak and the subject is poorly placed." },
  { slug: "tierflow-pro", render: "3D (Three.js / WebGL)",
    desc: "A night scene lit by a large soft moon/spotlight glow at top center, with a red lighthouse-like tower at left and a dark reflective surface below. A rounded, ovoid 3D elephant with a glowing pale underside balances on a thin wire, a slender balance pole crossing horizontally through its body. The elephant's form is blobby and simplified; the wire is thin and runs nearly level with little sag." },
  { slug: "mimo-2.6-flash", render: "2D (animated HTML canvas)",
    desc: "A teal stage scene with symmetric spotlight beams converging like a tent and a bright moon at upper right. A grey elephant wearing a red back-blanket stands centered on a tightrope holding a long horizontal balance pole, lit from below by a warm footlight glow, with a row of dark audience shapes along the bottom. Clear circus framing; the wire spans between supports with a slight sag." },
  { slug: "deepseek-4.1-flash", render: "2D (animated HTML canvas)",
    desc: "A soft dusk sky graded blue to orange with fluffy white clouds and a low sun over a purple horizon. A clean grey cartoon elephant stands on a thin wire gripping a long balance pole in its trunk; trunk, ears, tusks, body and four legs are clearly drawn. Bright, cute and highly readable, but the wire is thin with only a slight sag and little sense of great weight." },
  { slug: "opus-4", render: "2D (animated SVG)",
    desc: "A dusk scene with a purple-to-orange sky, a big soft sun, white clouds and spotlight beams from above over a dark grassy field. A large grey cartoon elephant crouches and balances on a tightrope strung between two orange-tipped posts, gripping a long balance pole with a counterweight; its feet clearly grip the wire, which bows downward under its weight. Strong sense of weight and clearly visible wire sag." },
  { slug: "glm-5.3-flash", render: "2D (animated SVG)",
    desc: "A festive night circus scene: a deep purple starry sky, a full moon, a striped circus tent at lower left, a ferris wheel at right and bunting flags. A blue-grey elephant with a red saddle-blanket walks a tightrope while holding a long balance pole; the wire spans between posts with a gentle dip. Well-composed and atmospheric; the elephant is clearly drawn and medium-sized." },
  { slug: "ling-3.1-flash", render: "2D (animated SVG)",
    desc: "A bright daytime scene with a clear blue sky, a soft sun, green rolling hills and a sandy platform below. A grey elephant stands on a tightrope strung between two posts, holding a long balance pole in its trunk, with a small flag nearby. Clean and readable, but the wire is fairly taut with only a slight sag and the elephant is modest in size within the wide frame." },
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
  console.log(`${item.slug.padEnd(20)} total=${entry.total}  ` +
    Object.entries(dims).map(([k, v]) => `${k}=${v.score}`).join(" "));
}

results.sort((a, b) => b.total - a.total);
results.forEach((e, i) => (e.rank = i + 1));

const out = {
  generatedAt: new Date().toISOString(),
  model: results[0]?.jev || "jev",
  weights: Object.fromEntries(Object.entries(DIMS).map(([k, d]) => [k, d.weight])),
  dimLabels: { weight: "重量感 / 配重", wire: "钢丝张力", elephant: "大象造型", scene: "场景氛围" },
  results,
};
writeFileSync(join(ROOT, "elephant-tightrope", "scores.json"), JSON.stringify(out, null, 2));
console.log(`\nWrote elephant-tightrope/scores.json — ${results.length} versions, top: ${results[0].slug} (${results[0].total}).`);
