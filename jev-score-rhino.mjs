// Score every rhino-orbit version with TypeSafe's Jev (System One) model.
// Jev is text-only, so each version is judged from a strictly factual,
// neutral description of its RENDERED output (produced by vision review) —
// Jev assigns the graded quality judgment on each dimension. Run:
//   TYPESAFE_API_KEY=... node jev-score-rhino.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.TYPESAFE_API_KEY;
if (!KEY) { console.error("missing TYPESAFE_API_KEY"); process.exit(1); }

// The task every model was given.
const TASK =
  "Create a self-contained web page animating 'a rhinoceros orbiting the Earth'. " +
  "The rhino is meant to be a bold, exaggerated, prominent cartoon form with clearly " +
  "visible detail (horns, legs, skin folds) — NOT shrunk to a tiny dot on the orbit. " +
  "Realistic rhino/Earth scale is deliberately NOT a goal; the character of the rhino, " +
  "the orbital motion, the Earth and the overall space scene are what matter.";

// Judgment dimensions. Each is a Score question with ordered, situation-based
// levels (index 0 = worst). Weights combine into a 0-100 overall score. Per
// rhino-orbit/PROMPT.md this category deliberately does NOT judge realistic
// scale: a prominent, detailed rhino is desired; a tiny indistinct one is the
// failure mode the brief was rewritten to avoid.
const DIMS = {
  rhino: {
    weight: 35,
    instructions:
      "Judging ONLY the rhinoceros, rate how bold, recognizable and well-detailed it is. The brief asks for a prominent, exaggerated rhino with clearly visible detail (horns, bulky body, legs, skin folds). A rhino shrunk to a tiny, featureless dot is a FAILURE here, not a success — do not reward smallness.",
    criteria: [
      "No animal at all, or an unidentifiable shape",
      "An animal-like form, but it barely reads as a rhinoceros, or it is so small/distant that its features are lost",
      "Clearly a rhinoceros (horn, bulky body, legs) and reasonably visible, but stiff, crude, or lacking detail",
      "A bold, prominent, well-detailed rhinoceros — clear horn(s), legs, body and surface detail, large enough to read clearly",
    ],
  },
  orbit: {
    weight: 30,
    instructions:
      "Rate how well the rhino's ORBITAL MOTION around the planet is expressed: a clear trajectory circling the Earth, ideally an inclined ellipse with perspective depth (near-large/far-small or front/back occlusion) and convincing revolution rhythm (faster near the planet, slower far away).",
    criteria: [
      "No orbit: the rhino is not on any path circling the planet",
      "It circles the planet, but the path is unclear or a plain flat circle",
      "A clear elliptical or inclined orbit with a visible trajectory and some perspective (near/far or occlusion)",
      "A convincing inclined-ellipse revolution: perspective depth, front/back occlusion AND speed variation (faster when near, slower when far)",
    ],
  },
  earth: {
    weight: 20,
    instructions:
      "Judging ONLY the planet being orbited, rate how convincingly it reads as the EARTH (blue oceans, recognizable continents/landmasses, and ideally clouds and an atmospheric glow).",
    criteria: [
      "No planet, or a plain featureless sphere",
      "A sphere that reads as a planet but crude: flat colors, no real sea/land separation or atmosphere",
      "A believable Earth with distinct oceans and continents and some clouds or atmosphere",
      "A rich, convincing Earth: oceans, continents, clouds and an atmospheric glow, well lit",
    ],
  },
  scene: {
    weight: 15,
    instructions:
      "Rate the overall SPACE SCENE: backdrop, depth, framing, lighting and polish (starfield, atmosphere, cinematic composition). Judge visual appeal and cohesion, NOT the realism of the rhino/Earth size ratio.",
    criteria: [
      "Empty or flat: no backdrop, no depth, visually dull",
      "A basic backdrop but plain composition and lighting",
      "A coherent space scene with a starfield, depth and decent framing/lighting",
      "A striking, cinematic space scene — rich starfield/atmosphere, strong framing, lighting and polish",
    ],
  },
};

// Factual, neutral descriptions of each RENDERED output (from vision review).
const ITEMS = [
  { slug: "glm-5.3", render: "3D (Three.js / WebGL)",
    desc: "A dark space scene with a starfield. A detailed Earth sits right of center with blue oceans, green-and-brown procedurally generated continents, swirling white clouds, polar ice and a soft blue atmospheric rim glow. A thin complete elliptical orbit line encircles the planet, and a small grey low-poly rhinoceros — with a visible horn, a bulky body and short legs — rides along the orbit at the far left, clearly much smaller than the Earth. The rhino follows a tilted Kepler ellipse (faster when near the planet, slower when far) and passes behind the globe each lap." },
  { slug: "opus-4.8", render: "3D (Three.js / WebGL)",
    desc: "A dark space scene with a starfield. A planet is centered-left with blue oceans and scattered green landmasses and a strong bright-blue atmospheric halo; the surface texture is patchy and mottled rather than crisply continental. A thin tilted elliptical orbit line rings the planet, and a small grey low-poly rhinoceros with a horn, bulky body and legs rides the orbit at the right, clearly much smaller than the planet. The orbit is an inclined Kepler ellipse (speed varies with distance) and the rhino passes in front of and behind the globe." },
  { slug: "gemini-3.8-flash", render: "3D (Three.js / WebGL)",
    desc: "A cinematic deep-space scene. A vivid Earth with blue oceans, green continents, a large white cloud mass and a bright cyan atmospheric rim sits in the upper half, encircled by a glowing tilted elliptical orbit ring. In the foreground is a large, highly detailed low-poly rhinoceros mid-stride: a slate-grey armour-plated body and head, two prominent golden horns, golden hooves and a tail tuft, trailing glowing stardust particles. Because of the close cinematic camera the rhino appears large in frame — roughly half the apparent size of the Earth — rather than tiny. The orbit is a clear inclined ellipse, but the rhino moves at a constant speed with no near/far speed variation. Rich starfield with faint nebula." },
  { slug: "agnes-3.0-flash", render: "3D (Three.js / WebGL)",
    desc: "A dark space scene with a dense white starfield. A large, nearly edge-on elliptical orbit ring spans the frame with the Earth centered inside it. The Earth shows green continent blobs over blue-grey oceans, pale polar caps and a faint atmospheric halo, but the surface texture is simple and flat (olive-green, low detail). A small greyish-tan low-poly rhinoceros built from a blocky body, head, horn and legs sits on the orbit near the top of the planet, correctly tiny relative to the globe. The orbit is a clean large ellipse, but the rhino moves at a constant speed with no near/far speed variation." },
  { slug: "mimo-2.6-flash", render: "3D (Three.js / WebGL)",
    desc: "A dark space scene with a faint starfield. Left of center stands a large, prominent pale-grey cartoon rhinoceros in three-quarter view — a single nose horn, bulky plated body, four stout legs and incised skin-fold lines; it is big in frame, roughly two-thirds the Earth's diameter, so its features read clearly. Right of center is a glossy planet with blue-green oceans, soft green-and-tan continental patches, white cloud blobs and a bright atmospheric rim glow, though the surface reads as soft, abstract bokeh-like blotches rather than crisp continents. The orbit is drawn as bright beaded/dashed ellipse lines, inclined, with the near arc crossing in front of the globe and the far arc passing behind it, so front/back depth is clear. The orbit is eccentric." },
  { slug: "deepseek-4.1-flash", render: "3D (Three.js / WebGL)",
    desc: "A deep-space starfield with a faint purple nebula glow at upper right. A large, highly detailed 3D rhinoceros fills the right foreground — a banded, segmented armour-plated grey body on four jointed legs, two tan horns, large cartoon eyes and ears; it is big in frame, roughly two-thirds the Earth's apparent diameter. Behind it to the left is a richly rendered Earth with deep-blue oceans, green continents, white clouds and soft day/night terminator lighting. A glowing blue orbital trail streaked with sparkle particles sweeps across the lower frame on an inclined path, curving from front to back, giving clear orbital perspective and depth. Cinematic lighting throughout." },
  { slug: "glm-5.3-flash", render: "2D (animated SVG)",
    desc: "A dark starry scene with a soft nebula glow at upper left. A clean flat-design Earth is centered — luminous blue oceans, stylized concentric green landmasses, soft white clouds, a bright cyan atmospheric halo and gentle shading. A dashed inclined elliptical orbit rings the planet, its near arc in front and far arc passing behind the globe. A small grey cartoon rhinoceros rides the orbit at the right in side profile — horn, ears, bulky body and legs are visible but it is small relative to the Earth. A little grey moon sits at the lower left. Polished, coherent 2D composition; the rhino circles at a steady pace." },
  { slug: "k3", render: "2D (animated SVG)",
    desc: "A deep-blue starfield with a faint nebula gradient. A flat-design Earth is centered — blue oceans, green continent blobs, soft clouds, white polar caps and an atmospheric glow. A dashed inclined elliptical orbit encircles the planet with glowing oval waypoint platforms spaced along it, near arc in front and far arc behind. On the right a fairly large, detailed grey cartoon rhinoceros reclines on one glowing platform — two horns, ears, legs and a plated body clearly visible, medium-large in frame. A small ringed purple planet decorates the upper left. Rich, imaginative, well-composed 2D space scene." },
  { slug: "qwen-3.8-flash-next", render: "2D (animated HTML canvas)",
    desc: "An extreme close-up composition on a starfield with a small sun at upper left. A very large grey cartoon rhinoceros dominates the lower foreground — two long horns, an eye, ears and a bulky body, drawn big and detailed as it passes the near point of its orbit. Behind it an oversized Earth fills most of the frame with blue oceans, flat green polygonal continents and clustered white clouds. No orbit line is drawn; the motion reads through the rhino's dramatic change in apparent size as it swings near and far, giving a strong perspective/scale depth. The planet's continents are bold but geometrically simple." },
  { slug: "ling-3.1-flash", render: "2D (animated HTML canvas)",
    desc: "A dense bright starfield with a faint nebula tint. A flat-design Earth sits right of center — blue oceans, green continent blobs, white polar caps and a soft atmospheric glow. A dashed inclined elliptical orbit rings it, near arc in front and far arc behind. Left of center a fairly large grey cartoon rhinoceros flies toward the viewer, seen front-on — nose horn, small tusks, ears, a cute face and a segmented plated body with legs tucked; medium-large and clearly detailed. A small grey moon sits centered below. Clean, coherent 2D space scene; the rhino circles at a steady pace." },
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
  dimLabels: { rhino: "犀牛造型", orbit: "轨道运动", earth: "地球质感", scene: "场景氛围" },
  results,
};
writeFileSync(join(ROOT, "rhino-orbit", "scores.json"), JSON.stringify(out, null, 2));
console.log(`\nWrote rhino-orbit/scores.json — ${results.length} versions, top: ${results[0].slug} (${results[0].total}).`);
