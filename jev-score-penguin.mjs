// Score every penguin-ski-jump version with TypeSafe's Jev (System One) model.
// Jev is text-only, so each version is judged from a strictly factual, neutral
// description of its RENDERED output (observed across the whole animation loop,
// since this task is timing-critical) — Jev assigns the graded quality judgment.
// Run with the proxy on:
//   NODE_USE_ENV_PROXY=1 TYPESAFE_API_KEY=... node jev-score-penguin.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.TYPESAFE_API_KEY;
if (!KEY) { console.error("missing TYPESAFE_API_KEY"); process.exit(1); }

// The task every model was given.
const TASK =
  "Create a self-contained web page animating 'a penguin ski-jumping off a ramp'. " +
  "What matters is the hard part of this subject: the penguin accelerating down the " +
  "in-run, launching off the ramp lip and flying in a believable parabolic arc before " +
  "landing and cushioning on the slope — a real takeoff-flight-landing sequence, not a " +
  "static pose at the top. A following camera that tracks the penguin through the jump " +
  "and shadows that move with it are the second axis (this subject nearly demands 3D). " +
  "An appealing penguin in a skiing/aerodynamic posture and a polished snowy scene round " +
  "it out. Photoreal accuracy is not the point; the motion arc and camera/shadow work are.";

// Judgment dimensions. Each is a Score question with ordered, situation-based
// levels (index 0 = worst). Weights combine into a 0-100 overall score. The
// headline test is the actual jump arc, then camera follow, then scene/shadows,
// then the penguin character/pose.
const DIMS = {
  flight: {
    weight: 35,
    instructions:
      "Rate the JUMP ARC: does the penguin actually accelerate down the in-run, launch off the ramp lip and fly in a believable parabola before landing/cushioning — a complete takeoff-flight-landing motion — rather than sitting mostly static at the top of the ramp with little or no real airborne flight? This is the headline test.",
    criteria: [
      "No real motion — penguin essentially static, no takeoff or flight",
      "Some sliding or a small hop, but no clear airborne parabola or landing",
      "A recognizable jump: launches off the ramp and flies, with a roughly believable arc",
      "A full, convincing in-run → launch → parabolic flight → landing/cushion sequence",
    ],
  },
  camera: {
    weight: 20,
    instructions:
      "Rate the CAMERA / CINEMATOGRAPHY: does the viewpoint follow or track the penguin through the jump (dynamic framing, depth, motion) rather than a single fixed flat shot?",
    criteria: [
      "Static, flat, fixed single view with no sense of motion",
      "Mostly fixed, with minor panning or parallax",
      "A camera that clearly follows the action with some dynamism and depth",
      "Lively, well-judged tracking camera that follows the arc with strong depth and motion",
    ],
  },
  scene: {
    weight: 25,
    instructions:
      "Rate the SCENE and SHADOWS: a readable ski-jump setting — ramp/in-run, snow slope, landing hill — with shadows/depth that track the motion, good contrast and polish, versus a sparse, flat or washed-out stage where elements are hard to read.",
    criteria: [
      "Crude, flat or so low-contrast the scene is hard to read",
      "A basic ramp-and-snow scene, little depth or shadow, plain",
      "A clear, pleasant snowy ski-jump scene with some depth/shadow and polish",
      "A rich, well-composed scene with ramp, slope, depth and shadows reading clearly, strong atmosphere",
    ],
  },
  penguin: {
    weight: 20,
    instructions:
      "Rate the PENGUIN: an appealing, clearly readable penguin in a skiing/jumping posture (tuck, skis, lean) — versus a tiny, vague or hard-to-see figure.",
    criteria: [
      "No readable penguin, or a tiny indistinct blob",
      "A simple penguin but stiff, plain or hard to make out",
      "A clear, appealing penguin with a recognizable skiing posture",
      "A charming, well-detailed penguin with a convincing aerodynamic/skiing pose",
    ],
  },
};

// Factual, neutral descriptions of each RENDERED output, observed across the
// full animation loop (6-point time-strips), not a single frame.
const ITEMS = [
  { slug: "gemini-3.8-flash", render: "3D (Three.js / WebGL)",
    desc: "A low-poly 3D snow scene. The penguin starts on a small gate/platform with a sign, slides down the ramp, launches clearly airborne off the lip (dark body with red skis seen in mid-air), then lands and slides on the snow below — a complete takeoff-flight-landing sequence. The camera moves through the run, at one point framing the scene through the ramp's support posts, then follows the airborne penguin; real 3D depth, scattered conifers and falling snow. The penguin is a simple dark figure with red skis." },
  { slug: "deepseek-4.1-flash", render: "3D (Three.js / WebGL)",
    desc: "A polished low-poly 3D scene with a blue sky and stylized clouds. The penguin accelerates down the in-run, launches off the ramp lip and flies high in a clear parabolic arc — body with a red hat and extended red skis seen airborne against the sky — then comes down toward the snowy landing slope dotted with green pine trees. The camera tracks the penguin smoothly through the whole jump with good depth. An appealing, readable penguin and a clean, atmospheric scene; the strongest motion arc and camera work of the set." },
  { slug: "space-bunny", render: "2D (animated HTML canvas, faux-3D)",
    desc: "A dynamic canvas scene with strong camera motion that rushes down a ramp lined with red and blue guide rails, with lots of flying snow chunks and debris and wide shots that reveal the ramp structure, conifers and a blue sky. There is a real sense of speed, camera movement and a jump down the ramp, but the composition is busy and cluttered with scattered dark fragments and the penguin itself is small and hard to track, so the clean parabola and landing read weakly." },
  { slug: "glm-5.3-flash", render: "2D (animated HTML canvas)",
    desc: "A pretty, polished moonlit 2D scene: a cute penguin with a red scarf on skis stands at the top start gate (bunting flags, a hanging lamp), a ski ramp curving down to the right, soft rolling snowy hills, a moon, stars and small trees. Across the loop the penguin stays mostly at the gate/top of the ramp; a clear launch, airborne parabola and landing are not really shown. Beautiful scene and charming character, but weak on the actual jump motion." },
  { slug: "muse-spark", render: "2D (animated HTML canvas)",
    desc: "A bright daytime 2D scene with a lattice ski-jump ramp, a few trees and a sun, but the palette is very washed-out and near-white so the elements are low-contrast and hard to read. A penguin in an aerodynamic tuck sits near the top of the ramp and stays there through most of the loop, with little visible airborne flight or landing. Minimal jump motion and poor legibility are the main weaknesses." },
  { slug: "ling-3.1-flash", render: "3D (Three.js / WebGL)",
    desc: "A polished 3D snow scene: a medium-sized penguin with a red scarf skis down the ramp, launches into a clean airborne parabola off the lip, and lands with a clear sliding trajectory on the snow below. The camera follows the penguin through the whole jump, with coniferous trees and falling snow rendering in 3D depth. A well-rounded jump — good motion arc, readable penguin, and complete takeoff→flight→landing sequence." },
  { slug: "step-5-preview", render: "2D (animated HTML canvas)",
    desc: "A dim 2D twilight scene showing a smooth animated flow: the penguin pushes off from a low gate, accelerates down the ramp, launches into a clean parabolic arc, and glides across the sky with drifting snow and flags trailing. The animation has good momentum and a clear jump arc, though the penguin is small and the landing cushion below is not clearly visible. Strong forward momentum and good motion, but the composition is sparse with no detailed background." },
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
  dimLabels: { flight: "起跳腾空", camera: "相机跟随", scene: "场景阴影", penguin: "企鹅姿态" },
  results,
};
writeFileSync(join(ROOT, "penguin-ski-jump", "scores.json"), JSON.stringify(out, null, 2));
console.log(`\nWrote penguin-ski-jump/scores.json — ${results.length} versions, top: ${results[0].slug} (${results[0].total}).`);
