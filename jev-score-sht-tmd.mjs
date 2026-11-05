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

const ROOT = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.TYPESAFE_API_KEY;
if (!KEY) { console.error("missing TYPESAFE_API_KEY"); process.exit(1); }

// The task every model was given (standardized prompt, mode D).
const TASK =
  "Create a single self-contained HTML page: a real-time, parametric 3D visualization of the " +
  "eddy-current pendulum tuned mass damper in the crown of the 632 m Shanghai Tower ('上海之巅'). " +
  "It must replay the sequence typhoon arrives → tower twists and sways → the 1000-ton mass " +
  "swings out of phase to absorb energy → eddy-current rods dissipate it → detuning degrades " +
  "the reduction, with real drawings supplied as reference. Judged on: building the damper to " +
  "the drawings (tall red mass block ≈8.1×5.2 m hung by ~12 cables from fixed double main beams, " +
  "a golden non-load-bearing portal frame, 4 diagonal snubbers/dampers that extend and compress " +
  "with the swing, the stacked-ring 'Shanghai Eye' sculpture on a gilded base), the tower itself " +
  "(rounded-triangle plan twisting ~120° with a double-skin facade), the city context (Huangpu " +
  "river on the west as a convex bank, SWFC / Jinmao / Oriental Tower recognizable), engineering " +
  "physics (resonance, out-of-phase swing, stroke limits, reduction ratio), 3D craft, and the " +
  "information/interaction design of the telemetry UI.";

// Judgment dimensions. Weights combine into a 0-100 overall score.
const DIMS = {
  fidelity: {
    weight: 30,
    instructions:
      "Rate FIDELITY TO THE DRAWINGS: the damper machine itself — a tall red mass block with proportions near 8.1 m high × 5.2 m wide (≈1.55:1, not a cube/ball/flat box), hung by many cables (ideally ~12) from fixed double main beams at the top, a golden four-leg portal frame that does NOT carry the load, and 4 diagonal snubber dampers reaching to the floor that visibly extend/compress with the swing — plus the stacked-ring 'Shanghai Eye' sculpture and the tower's rounded-triangle plan with ~120° twist and double-skin facade.",
    criteria: [
      "Damper is generic or absent — a cube/ball mass, a column instead of cables, no portal or snubbers, tower is a plain cylinder/box",
      "Some recognizable elements (a hanging mass, a tower) but key drawing facts wrong — wrong block proportions, few/no cables, portal missing or load-bearing, no snubbers, little or no twist",
      "Most elements present and roughly right — blocky red mass on multiple cables, portal frame, some snubbers, tower with visible twist and layered facade; details imperfect",
      "Faithful to the drawings — tall red block ≈1.55:1 on ~12 cables under fixed double beams, golden non-load-bearing portal, 4 live snubbers, stacked-ring eye sculpture, rounded-triangle tower twisting ~120° with double skin",
    ],
  },
  physics: {
    weight: 25,
    instructions:
      "Rate the ENGINEERING PHYSICS: does the tower sway with the typhoon while the mass swings OUT OF PHASE to absorb energy; is there a believable storm build-up (calm → resonance → damper engaging → peak → detuning/degradation); does the mass respect a stroke limit (±~2 m servo stop); are telemetry numbers (sway amplitude, stroke, reduction ratio, damping) plausible and mutually consistent — versus things just wobbling arbitrarily?",
    criteria: [
      "No real physics — objects wobble or nothing moves; no phase relation, no limits, meaningless or absent numbers",
      "Things move and there are numbers, but the physics reads wrong — mass in phase with the tower, no stroke limit, no storm narrative, telemetry decorative",
      "A believable coupled response — out-of-phase swing, a storm timeline, stroke limiting and a stated reduction ratio that track the motion",
      "Convincing engineering simulation — phase lag visible, 5-stage typhoon timeline, ±2 m stroke stop with saturation, reduction ratio degrading on detuning, consistent telemetry",
    ],
  },
  visual: {
    weight: 20,
    instructions:
      "Rate the 3D CRAFT: modeling precision, materials (translucent glass skin, gilded metal, jade-like sculpture), lighting and shadows, camera work (orbit/cinematic moves, cutaway section through the damper hall), overall architectural-model aesthetics.",
    criteria: [
      "Crude geometry, broken or flat shading, unreadable space",
      "Basic but readable 3D — simple boxes and a working camera, little material or light work",
      "Good 3D — clean geometry, decent materials/lighting, a usable camera and some spatial storytelling",
      "Excellent 3D — refined geometry and materials, considered lighting, cinematic or cutaway cameras that reveal the damper hall, architectural-model polish",
    ],
  },
  hud: {
    weight: 15,
    instructions:
      "Rate the INFORMATION & INTERACTION design: a professional telemetry HUD (wind speed, sway, stroke, reduction), live charts, and parameters that genuinely drive the physics when adjusted — versus decorative labels, no data, or controls that change nothing.",
    criteria: [
      "No HUD or data at all; no interactivity",
      "Some labels or controls, but data is sparse/static and controls don't really drive the simulation",
      "A solid telemetry layer — live numbers and at least one chart, and controls that alter the physics",
      "Professional instrumentation — staged telemetry, live charts, and parametric controls (wind, tuning, stiffness…) that visibly and correctly drive the response",
    ],
  },
  city: {
    weight: 10,
    instructions:
      "Rate the CITY CONTEXT: the Huangpu river on the WEST curving around Lujiazui as a convex bank, with recognizable landmarks nearby — SWFC (thin slab with a trapezoid opening), Jinmao (octagonal pagoda set-backs), Oriental Tower (three columns, two spheres) — plus a plausible road ring, versus no city or a generic skyline.",
    criteria: [
      "No city context at all",
      "A generic skyline or abstract blocks with no identifiable landmarks and no river",
      "A recognizable Lujiazui setting — river present, one or two landmarks identifiable",
      "A faithful setting — Huangpu on the west convex bank, all three landmarks recognizable, road ring plausible",
    ],
  },
};

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
  dimLabels: { fidelity: "造型还原", physics: "工程物理", visual: "三维表现", hud: "信息交互", city: "城市环境" },
  results,
};
writeFileSync(join(ROOT, "sht-tmd", "scores.json"), JSON.stringify(out, null, 2));
console.log(`\nWrote sht-tmd/scores.json — ${results.length} versions, top: ${results[0]?.slug} (${results[0]?.total}).`);
