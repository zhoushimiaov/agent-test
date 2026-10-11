// Score every octopus-drummer version with TypeSafe's Jev (System One) model.
// Jev is text-only, so each version is judged from a strictly factual, neutral
// description of its RENDERED output — Jev assigns the graded quality judgment.
// Run with the proxy on:
//   NODE_USE_ENV_PROXY=1 TYPESAFE_API_KEY=... node jev-score-octopus.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.TYPESAFE_API_KEY;
if (!KEY) { console.error("missing TYPESAFE_API_KEY"); process.exit(1); }

// The task every model was given.
const TASK =
  "Create a self-contained web page animating 'an octopus playing a drum kit'. " +
  "What matters is the hard part of this subject: the eight arms sensibly " +
  "distributed across the different pieces of a drum kit (bass drum, toms, snare, " +
  "cymbals/hi-hat) — each limb covering a piece rather than a few arms or arms just " +
  "splayed symmetrically — and a convincing sense of active, coordinated drumming " +
  "(sticks landing on heads and cymbals, rhythmic motion). A complete, recognizable " +
  "kit and an appealing character/stage round it out. Photoreal accuracy is not the " +
  "point; the many-limbed coordination is.";

// Judgment dimensions. Each is a Score question with ordered, situation-based
// levels (index 0 = worst). Weights combine into a 0-100 overall score. Per
// octopus-drummer's brief, distributing the eight arms across the kit is the
// headline test, then the drumming coordination, then the kit and the polish.
const DIMS = {
  arms: {
    weight: 35,
    instructions:
      "Rate the EIGHT-ARM DISTRIBUTION: are there clearly many arms (ideally eight), each sensibly assigned to a distinct drum or cymbal, so the octopus looks like it is using its limbs to cover the whole kit — rather than only a couple of visible arms, or arms splayed symmetrically as decoration without landing on specific pieces? This is the headline test.",
    criteria: [
      "No octopus/arms visible, or arms not addressing the kit at all",
      "Only a few arms read, or arms splay symmetrically without clearly covering distinct drum pieces",
      "Several arms clearly reach different drums/cymbals, covering much of the kit",
      "Many (near eight) arms, each purposefully assigned to its own drum or cymbal, covering the whole kit convincingly",
    ],
  },
  drumming: {
    weight: 25,
    instructions:
      "Rate the DRUMMING COORDINATION: does it read as actively, rhythmically drumming — sticks/arm tips landing on drum heads and cymbals, a sense of motion or impact (bounce, hit flashes, flying notes) — rather than a static pose holding sticks?",
    criteria: [
      "Static — no sense of striking or playing",
      "A playing pose but little real motion or contact with the drums",
      "Clear drumming action on several pieces with some sense of rhythm/motion",
      "Lively, coordinated drumming — arms striking across the kit with strong motion and impact cues",
    ],
  },
  kit: {
    weight: 20,
    instructions:
      "Rate the DRUM KIT: is it a proper, recognizable kit — bass drum, toms, snare and cymbals/hi-hat — sensibly arranged around the player, versus a sparse or incomplete set.",
    criteria: [
      "No real kit, or one or two vague drums",
      "A partial kit missing obvious pieces",
      "A recognizable kit with most pieces present and arranged",
      "A full, well-arranged kit (bass, toms, snare, multiple cymbals) reading clearly",
    ],
  },
  beauty: {
    weight: 20,
    instructions:
      "Rate the overall CHARACTER and SCENE: appeal of the octopus design, color, stage composition, lighting and polish of the whole image.",
    criteria: [
      "Crude or unpleasant, with no real composition",
      "Basic and plain",
      "A pleasing, coherent character and stage with decent polish",
      "A striking, charming, polished composition with strong color, staging and atmosphere",
    ],
  },
};

// Factual, neutral descriptions of each RENDERED output.
const ITEMS = [
  { slug: "gemini-3.8-flash", render: "3D (Three.js / WebGL)",
    desc: "A dark 3D stage with a reflective floor and a full drum kit (several toms, snare, two cymbals on stands). A small pink-red octopus sits behind the kit; its body is largely hidden behind the drums and only a couple of arms are clearly visible, so the mapping of eight arms onto individual drum pieces is hard to read. Real 3D depth and a complete kit, but the octopus is small and its arm-to-drum assignment is unclear." },
  { slug: "glm-5.3", render: "2D (animated HTML canvas)",
    desc: "A clean cartoon stage with spotlights. A round purple octopus with big surprised eyes sits centered behind a white spiral-faced bass drum, with two gold cymbals and small toms around it. Several arms spread outward fairly symmetrically but most do not clearly grip sticks or land on specific drums. Pretty and tidy with a recognizable kit, but the eight-arm distribution reads as a decorative spread rather than purposeful drumming." },
  { slug: "deepseek-4.1-flash", render: "2D (animated HTML canvas)",
    desc: "A large, expressive purple octopus with big eyes spreads its arms wide over a full kit — a prominent white 'OCTO BASS DRUM', several toms and multiple cymbals on stands. Distinct arms reach out to different drums and cymbals, giving a clear sense of many limbs each covering a piece. Detailed, polished, large subject with good arm-to-drum coverage." },
  { slug: "mimo-2.6-flash", render: "2D (animated HTML canvas)",
    desc: "A purple octopus with dotted, suckered arms sits behind a kit of red-and-white toms, a large cream bass drum and cymbals under spotlights. Arms splay around the kit but their grip on sticks and contact with specific drums is only loosely shown. A complete, clean kit; moderate on purposeful arm assignment." },
  { slug: "ling-3.1-flash", render: "2D (animated HTML canvas)",
    desc: "An energetic purple octopus holds drumsticks over a kit accented with glowing cyan and orange and a lightning-bolt bass drum, with musical notes and sparkles flying around to convey rhythm and motion. Multiple arms clearly hold sticks and strike the drums and cymbals. Strong sense of active drumming and arm-to-drum action, lively and colorful." },
  { slug: "glm-5.3-flash", render: "2D (animated HTML canvas)",
    desc: "A reddish-brown octopus sits center with a 'LIVE' label in the corner, a few cymbals and drums around it and arms spread holding thin sticks. The kit is smaller and sparser and the arms read as thin lines, so coverage of distinct drum pieces is modest. Simpler and less polished than the richer versions." },
  { slug: "opus-4.8", render: "2D (animated HTML canvas)",
    desc: "A cute purple octopus with big eyes holds sticks over a symmetric kit — red and blue toms, an 'OCTO BEAT' bass drum, and a cymbal on each side. Arms reach to the drums fairly clearly, but the pose is quite symmetric and static. Clean, charming character and a tidy, readable kit." },
  { slug: "tierflow-pro", render: "2D (animated HTML canvas)",
    desc: "A purple octopus sits amid a large kit with several cream toms and multiple cymbals, arms spread to reach the various pieces. The kit is big and the many arms cover a lot of the drums, giving good distribution, over a dark, moody stage. Good coverage, slightly busy composition." },
  { slug: "muse-spark", render: "2D (SVG 动画)",
    desc: "A pink octopus sits behind an 'OCTO-8' bass drum in an underwater-themed teal scene with seaweed and bubbles, cymbals on stands and drumsticks raised. Thematically distinctive (an underwater drummer) and pretty, with sticks held up ready to strike; arm-to-drum assignment is moderate and the kit is fairly standard." },
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
  dimLabels: { arms: "八腕分配", drumming: "打击协调", kit: "鼓组完整", beauty: "整体美感" },
  results,
};
writeFileSync(join(ROOT, "octopus-drummer", "scores.json"), JSON.stringify(out, null, 2));
console.log(`\nWrote octopus-drummer/scores.json — ${results.length} versions, top: ${results[0].slug} (${results[0].total}).`);
