// Score every pelican-bicycle version with TypeSafe's Jev (System One) model.
// Jev is text-only, so each version is judged from a strictly factual,
// neutral description of its RENDERED output (produced by vision subagents) —
// Jev assigns the graded quality judgment on each dimension. Run:
//   TYPESAFE_API_KEY=... node jev-score.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(fileURLToPath(import.meta.url));
const KEY = process.env.TYPESAFE_API_KEY;
if (!KEY) { console.error("missing TYPESAFE_API_KEY"); process.exit(1); }

// The task every model was given.
const TASK = "Create 'a pelican riding a bicycle' as a self-contained web page.";

// Judgment dimensions. Each is a Score question with ordered, situation-based
// levels (index 0 = worst). Weights combine into a 0-100 overall score.
const DIMS = {
  pelican: {
    weight: 30,
    instructions:
      "Judging ONLY the pelican creature in this depiction of 'a pelican riding a bicycle', rate how clearly recognizable and well-formed it is. A pelican's defining trait is a long beak with a large throat pouch.",
    criteria: [
      "No bird at all, or an unrecognizable blob",
      "A bird is present but barely reads as a pelican (no clear pouched beak)",
      "Clearly a pelican with a pouched beak, but stiff, rough, or oddly proportioned",
      "A convincing, well-proportioned, appealing pelican with a clear pouched beak",
    ],
  },
  bicycle: {
    weight: 25,
    instructions:
      "Judging ONLY the vehicle, rate how well it is a complete, structurally correct BICYCLE (two round spoked wheels, a connected frame, pedals, handlebars). A motorcycle, a one-wheeled or broken/cut-off vehicle is not a correct bicycle.",
    criteria: [
      "No bicycle, or the wrong vehicle entirely (e.g. a motorcycle)",
      "Bike-like but broken: missing/incomplete wheels, cut off, or malformed frame",
      "A recognizable complete bicycle with some odd or stretched geometry",
      "A clean, structurally correct bicycle: two round wheels, proper frame, pedals, handlebars",
    ],
  },
  riding: {
    weight: 25,
    instructions:
      "Rate how convincingly the pelican is actually RIDING the bicycle: seated on the saddle with legs/feet reaching the pedals and a plausible riding posture, rather than floating, perched on top, or merged into the frame.",
    criteria: [
      "Pelican and bike are separate, or the bird just sits on top with no connection",
      "Body rests over the frame but no legs/feet reach the pedals; posture unclear",
      "Seated on the bike with legs toward the pedals, posture slightly off",
      "Clearly seated and pedaling: legs on pedals, hands/body in a believable riding pose",
    ],
  },
  scene: {
    weight: 20,
    instructions:
      "Rate the richness and coherence of the overall SCENE and composition around the subject (background, setting, framing, supporting detail).",
    criteria: [
      "Blank or empty background, no scene",
      "A minimal hint of setting (e.g. a bare ground line)",
      "A coherent simple scene (sky, road, a few elements)",
      "A rich, coherent, well-composed scene with layered, fitting detail",
    ],
  },
};

// Factual, neutral descriptions of each RENDERED output (from vision review).
const ITEMS = [
  { slug: "gemini-3.8-flash", render: "2D SVG illustration",
    desc: "Flat 2D vector illustration of a white pelican with a large orange beak and throat pouch, sitting upright on a teal bicycle; a red scarf trails behind it. The bicycle has two complete round spoked wheels, a visible frame, pedals, and a handlebar bell, and the pelican's orange legs extend down toward the pedals. The scene is a seaside road with blue sky, clouds, a sun, sailboats on blue water, and a row of palm trees behind a white railing, with a game-style HUD showing speed and cadence overlaid on top." },
  { slug: "glm-5.3-flash", render: "2D SVG illustration",
    desc: "Flat 2D vector illustration of a white pelican with an orange beak and pouch and a red scarf, leaning forward in a horizontal riding posture on a red bicycle. Both wheels are round and complete with spokes, and the pelican's orange legs connect down to the pedals and frame. The background is a daytime scene with blue sky, one white cloud, a sun, green rounded hills, and a gray road with a white dashed centerline." },
  { slug: "glm-5.3-3d", render: "3D (Three.js)",
    desc: "3D rendered scene with an orange desert-gradient background and a dark circular road track with dashed lane markings. A white rounded, blobby figure built from stacked spheres (the pelican) wears a small red cone hat and an orange element near its head, at the right of the frame. The bicycle is almost entirely cut off at the bottom edge; only a partial red/yellow frame and part of a dark wheel are visible, so the bird is not clearly shown seated on a complete bike." },
  { slug: "tierflow-pro-router", render: "2D SVG illustration",
    desc: "Flat 2D SVG illustration of a white pelican with an orange beak and pouch leaning forward on a teal bicycle. The bicycle has two complete round spoked wheels, a visible frame, pedals and a dashed chain line, and the pelican's orange legs reach down to the pedals. The background shows blue sky with clouds and a sun, green rounded hills, and a gray road with dashed lane markings; a HUD below displays cadence, speed and distance." },
  { slug: "tierflow-pro-router-3d", render: "3D (Three.js)",
    desc: "Low-poly 3D rendering of a white faceted pelican with an orange beak seated on a teal bicycle, with orange legs extending to the pedals. Both wheels are round and complete with thin spokes, and the full frame and handlebars are visible. The environment is a green low-poly grass field with faceted trees, a gray road with a white crosswalk-style marking, and blue sky; a HUD shows face count, cadence, speed and camera angle." },
  { slug: "mimo-2.6-pro", render: "2D illustration",
    desc: "Soft painterly 2D illustration of a white pelican-like bird with an orange beak and pouch wearing a green helmet and an orange scarf, seated on a MOTORCYCLE rather than a bicycle. The vehicle is an orange/red motorbike with two round wheels, an engine body and visible frame, and the bird sits on it with legs toward the footrests. The background is a dusk landscape with a purple-and-orange sky, clouds, distant hills, a small lit house, a windmill, butterflies and a yellow field." },
  { slug: "qwen-3.8-max-tabbit", render: "2D SVG illustration",
    desc: "Flat 2D vector illustration. A white pelican with a yellow beak and visible throat pouch is present, body horizontal with the head and open beak pointing right. A dark navy bicycle with two round spoked wheels, a visible frame and an orange seat/pedal element is beneath the bird, but the pelican's rounded body overlaps and sits across the frame rather than being clearly seated on a saddle with legs on pedals. The scene has light blue sky with a sun and clouds, green hills and a gray dashed road." },
  { slug: "qwen-3.8-max-qoder", render: "2D illustration",
    desc: "2D illustration on a cream gradient background with a soft sun. A white pelican-like bird with a large orange beak and throat pouch is present, body upright and rounded, facing right. The bicycle is a long, low recumbent-style frame in orange with two round thin-spoked wheels; the front wheel is set far forward with an elongated orange bar reaching to it, and the pelican is seated in the middle with small feet near pedals. The frame geometry is stretched and nonstandard, and the handlebar is an extended orange rod rather than a conventional handlebar." },
  { slug: "deepseek-4.1-flash", render: "2D SVG illustration",
    desc: "Flat 2D vector illustration with a light blue sky, a single cloud, an orange sun, green rolling hills and a gray road with white dashes. A white pelican with a long neck and a large orange beak with throat pouch is present, body elongated and lying horizontally, head and beak pointing right. An orange-framed bicycle with two complete round wheels, dark tires, gray spokes, a visible frame, pedals and a dark saddle is below the bird. The pelican's body rests on top of the frame but no legs or feet reach the pedals, so it is perched above rather than pedaling." },
  { slug: "k2.8-preview", render: "2D SVG illustration",
    desc: "Flat 2D vector illustration framed by a dark navy border, with a blue sky, clouds, a sun, green hills, cartoon trees and a dashed road. A white pelican with small head tufts, an eye, and a yellow beak with throat pouch is present, rounded body horizontal and head pointing right. A red-framed bicycle with two round black spoked wheels, a visible frame, an orange seat tube and dark handlebars sits beneath the bird. The pelican's body rests on top of the frame rather than being seated on a saddle with legs on the pedals, so it is perched above the bike." },
  { slug: "k3-raccoon", render: "2D illustration",
    desc: "Flat 2D cartoon illustration on a plain white background. A white pelican with an orange cap and a large open orange beak with throat pouch is present, plus a blue wing patch; it is seated upright on the bicycle with its legs bent down to the pedals in a riding posture. The bicycle has an orange frame, two round black tires with orange rims, visible pedals and handlebars, and the bird is on the saddle gripping the handlebar area. There is no background scenery (no sky, road or landscape) and a drop shadow sits under the wheels." },
  { slug: "k3-crush", render: "2D SVG illustration",
    desc: "Flat 2D vector illustration against a blue sky with clouds, a glowing sun and green triangular mountains over a dark road with dashes. A white pelican with an orange beak and throat pouch is present, but it is small and compressed low on the bicycle, with its head and beak overlapping the front/handlebar region rather than clearly seated upright on a saddle. A red-framed bicycle with two round wheels (white rims, dark blue tires), a visible frame and pedals is present. The bird's body is partly merged with the frame near the handlebars, making its posture and seating position unclear." },
  { slug: "k3-svg", render: "2D SVG illustration",
    desc: "Flat 2D SVG illustration titled 'Pelican on a Bicycle'. A large white pelican with a big orange beak and visible throat pouch, a black eye, red neck marking, and a feather-lined wing leans forward over the bike. It is seated on a blue-framed bicycle with yellow/orange legs reaching down to the pedals and two round complete wheels with visible spokes, frame, and handlebar. The background is a blue sky with stylized clouds, small bird silhouettes, a bright yellow sun, grey road, and green bushes." },
  { slug: "k3-3d", render: "2D SVG illustration",
    desc: "Flat 2D SVG hand-drawn illustration titled '鹈鹕的晨间骑行'. A white pelican with a red dotted scarf, a long thin yellow beak and a large hanging pink throat pouch sits upright on a red/orange bicycle, its orange legs connected to the pedals. The bicycle has two round complete wheels with grey spokes and a brown wicker front basket holding two blue fish. The background shows a grey road with white dashes, green rolling hills, green trees, a yellow sun with rays, white clouds, and blue sky; the pelican is seated on the bike." },
  { slug: "sonnet-5.5-tabbit", render: "2D SVG illustration",
    desc: "Flat 2D vector illustration. A white pelican wearing a red cap, with a large orange triangular beak and orange pouch, a black eye, a grey folded wing, and a grey fish-like tail fin, is seated on a red-framed bicycle. The bicycle has two round complete black wheels with grey spokes and red hubs, a visible crank/pedals and an orange seat post. The scene has a light blue sky, yellow sun, green mountains, a lighter horizontal band behind, and green grass with dashes in the foreground; the pelican is positioned on the bike." },
  { slug: "haiku-5.5-tabbit", render: "2D SVG illustration",
    desc: "Flat 2D vector illustration. A white pelican wearing a blue striped cone hat, with an orange beak and visible throat pouch and a small red neck mark, sits on a red-framed bicycle that has a yellow fork/seat tube. The bicycle shows two round complete black wheels with thin spokes and red hubs, a visible frame and pedals with small black feet near them. The background is a blue sky gradient with a yellow sun and rays, two white clouds, green triangular mountains, and green grass; the pelican is seated on the bike." },
  { slug: "muse-spark-1.3", render: "2D SVG illustration",
    desc: "Flat 2D vector illustration occupying the upper portion of an otherwise blank white frame. A white pelican with a blue cap, orange beak and throat pouch, and a red scarf has its body positioned above and overlapping a red-framed bicycle; the lower body obscures the junction so it is unclear whether its legs reach the pedals. The bicycle has two round complete wheels (black tires, grey spokes) with a yellow seat tube and a downward crank/pedal visible. The background shows a grey road with a white dashed center line, green hills, blue sky, a yellow sun, and a partial cloud." },
  { slug: "space-bunny", render: "3D (Three.js)",
    desc: "A 3D rendered scene with shadows and depth. A white rounded 3D pelican wearing a blue hat, with an orange beak and inflated throat pouch and a small red neck, sits on a red 3D bicycle with yellow fork/legs and two round complete black tires with spokes. The bike rests on a grey asphalt road with white dashed lane markings. The background has green grassland, several green coniferous trees, small triangular shapes, a blue sky, and one grey cloud; the pelican is seated on the bike." },
  { slug: "hy4", render: "2D SVG illustration (animated)",
    desc: "Flat 2D SVG illustration titled 'Pelican on a Bicycle'. A white pelican with a large orange beak and throat pouch, a black eye, and a teal scarf trailing behind leans forward in a riding posture on a red/orange bicycle. The bicycle has two round complete black wheels with grey spokes, a visible red frame, handlebars, and pedals, and the pelican's orange legs bend down and connect to the pedals. The background is a daytime scene with blue sky, a bright sun, several white clouds, green rounded hills, and a grey road with dashed markings; an interactive control bar (pause, pseudo-3D view, speed, bell) sits below the illustration." },
  { slug: "gemma4", render: "2D SVG illustration (animated)",
    desc: "Flat 2D SVG illustration on a pale cyan background titled '骑行的鹈鹕'. A white pelican with a yellow beak and small thin yellow legs stands over a thin pink/magenta angular bicycle frame. Only one wheel is attached near the frame; a second black spoked wheel is detached and floating well to the right, clearly separated from the frame, so the bicycle reads as incomplete and broken. The pelican stands within the frame rather than being seated on a saddle with its legs on the pedals. The scene is minimal: a plain light background, one small cloud, and a single dashed road line." },
  { slug: "gpt6-luna", render: "2D SVG illustration (animated)",
    desc: "Flat 2D SVG illustration. A white pelican with a small head tuft, a black eye, and a large orange beak with a reddish throat pouch sits upright on a coral-red bicycle. The bicycle has two round complete black wheels with grey spokes, a full connected frame, handlebars, and an orange crank with pedals; the pelican's rounded body rests on the saddle, but no distinct legs are visibly reaching the pedals. The scene is simple and coherent: a light blue sky panel, a yellow sun, two white clouds, a green grass strip, and a grey road with a white dashed centerline." },
  { slug: "ling-3.1-flash", render: "2D SVG illustration (animated)",
    desc: "Flat 2D SVG illustration titled '鹈鹕骑行记 / Pelican on a Bicycle'. A white pelican with a large orange beak and throat pouch, a black eye, a red scarf, and a detailed wing leans forward over the handlebars in a riding posture on a red bicycle. The bicycle has two round complete wheels with grey spokes, a connected red frame, handlebars, and an orange crank/pedals, and the pelican's legs reach down toward the pedals. The background is a daytime scene with blue sky, a bright sun, white clouds, small bird silhouettes, green rounded hills, green grass, and a grey road with white dashed markings." },
  { slug: "sensenova-6.8-flash", render: "2D SVG illustration (animated)",
    desc: "Flat 2D SVG illustration. An orange/tan pelican with a two-tone pouched beak, a small eye and a folded wing is positioned on a red bicycle, its orange legs and arms reaching down to the pedals and handlebars. The bicycle has two round complete wheels with grey spokes, a connected red frame, handlebars, and pedals. The pelican's body sits somewhat high above the saddle so the posture is a little perched and awkward, though its legs do reach the pedals. The background is a coherent daytime scene with blue sky, a sun, white clouds, green triangular mountains, and a grey road with white dashed markings." },
  { slug: "solar-mini-4", render: "2D SVG illustration (animated)",
    desc: "Flat 2D SVG illustration titled '鹈鹕骑车小队' on a dark blue night-sky background. A small round YELLOW bird with a tiny orange beak — reading more like a generic chick than a clearly pouched pelican — is perched on top of a dark grey bicycle, with two thin legs dangling down rather than being seated on a saddle with feet on the pedals. The bicycle has two round wheels with spokes and a long dark frame, but its geometry is unusual and the bird sits on top of it. The scene has a dark gradient sky, a bright yellow sun, one white cloud, green trees, a green grass strip, and a dark road with dashes; Play/Pause/Speed controls sit below the illustration." },
  { slug: "opus-4.8", render: "2D SVG illustration (SVG + SMIL)",
    desc: "Flat 2D SVG illustration titled 'Pelican on a Bicycle' (pure SVG + SMIL animation). A white pelican with a large orange pouched beak, a black eye, a small head tuft, a red neck marking and a detailed wing is clearly seated on a black-framed bicycle, with orange legs bending down and connecting to the pedals in a believable riding posture. The bicycle has two round complete wheels with grey spokes, a full connected frame and handlebars. The background is a coherent daytime scene with a soft sun, white clouds, green rolling hills, two small trees, and a grey road with white dashed markings." },
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
  console.log(`${item.slug.padEnd(24)} total=${entry.total}  ` +
    Object.entries(dims).map(([k, v]) => `${k}=${v.score}`).join(" "));
}

results.sort((a, b) => b.total - a.total);
results.forEach((e, i) => (e.rank = i + 1));

const out = {
  generatedAt: new Date().toISOString(),
  model: results[0]?.jev || "jev",
  weights: Object.fromEntries(Object.entries(DIMS).map(([k, d]) => [k, d.weight])),
  dimLabels: { pelican: "鹈鹕还原", bicycle: "单车结构", riding: "骑行姿态", scene: "场景构图" },
  results,
};
writeFileSync(join(ROOT, "pelican-bicycle", "scores.json"), JSON.stringify(out, null, 2));
console.log(`\nWrote pelican-bicycle/scores.json — ${results.length} versions, top: ${results[0].slug} (${results[0].total}).`);

