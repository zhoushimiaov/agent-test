// Per-category Jev (TypeSafe System One) scoring rubrics for the playground.
// These mirror the judged dimensions used on the site's own leaderboards
// (jev-score*.mjs): same task framing, same weighted Score questions, same
// 0..1-per-dimension → weighted 0..100 total. "把评审规则发给 typesafe" means
// this rubric (task + instructions + ordered criteria) is sent as the System
// One `questions`, and the model's output depiction (vision caption) + source
// code go into `state`. Slugs match the preset prompts in build.mjs.

export const RUBRICS = {
  "pelican-bicycle": {
    task: "Create 'a pelican riding a bicycle' as a self-contained web page.",
    dimLabels: { pelican: "鹈鹕还原", bicycle: "单车结构", riding: "骑行姿态", scene: "场景构图" },
    dims: {
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
    },
  },
  "jellyfish-float": {
    task:
      "Create a self-contained web page animating 'a jellyfish floating in water'. " +
      "What matters is a translucent, luminous bell (伞体) that reads as a layered, " +
      "semi-transparent body; soft trailing tentacles that drape and flow naturally; " +
      "and a convincing underwater atmosphere with light attenuation and scattering " +
      "(god rays, glow, depth). Photoreal accuracy is not required — translucency, " +
      "softness and a sense of gentle flow are the point.",
    dimLabels: { translucency: "伞体通透感", tentacles: "柔体律动", light: "水下光线", beauty: "整体美感" },
    dims: {
      translucency: {
        weight: 30,
        instructions:
          "Judging the jellyfish's BELL (伞体), rate how translucent and layered it reads — a soft semi-transparent membrane with inner structures faintly visible through it, a luminous rim and gradients, rather than a flat opaque dome. Translucency and layering are the headline test for this task.",
        criteria: [
          "No bell, or a flat opaque shape with no transparency",
          "A bell shape but mostly flat or solid, with little real translucency",
          "A clearly translucent bell with some gradient and glow, inner structure partly visible",
          "A richly translucent, layered bell — soft membrane, luminous rim, inner structures showing through, convincing depth",
        ],
      },
      tentacles: {
        weight: 25,
        instructions:
          "Judging the TENTACLES / oral arms, rate how soft, numerous and naturally flowing they look — fine strands that drape and curve organically as if drifting in water, rather than stiff, sparse or ruler-straight lines.",
        criteria: [
          "No tentacles at all",
          "A few stiff or straight strands with little sense of soft drape",
          "Multiple tentacles with some natural curve and flow",
          "Many fine, soft tentacles draping and curving organically with a strong sense of gentle underwater flow",
        ],
      },
      light: {
        weight: 25,
        instructions:
          "Rate the UNDERWATER LIGHT: god rays or light shafts from above, soft attenuation into darker depth, scattering, drifting particles, and the jellyfish's own glow lighting the surrounding water. A flat, uniform background is weak.",
        criteria: [
          "Flat, with no sense of underwater light or depth",
          "A plain water-colored background with minimal lighting",
          "Some light shafts, glow or depth gradient giving an underwater feel",
          "Convincing underwater light — soft god rays, depth attenuation, scattering/particles and glow working together",
        ],
      },
      beauty: {
        weight: 20,
        instructions:
          "Rate the overall AESTHETIC and composition: color harmony, framing, depth layering (e.g. background jellyfish), polish and how pleasing and cohesive the whole image is.",
        criteria: [
          "Crude or unpleasant, with no real composition",
          "Basic and plain",
          "A pleasing, coherent composition with decent polish",
          "A striking, elegant, polished composition with strong color, depth and atmosphere",
        ],
      },
    },
  },
  "elephant-tightrope": {
    task:
      "Create a self-contained web page animating 'an elephant walking a tightrope'. " +
      "An elephant is a huge, heavy animal balancing on a thin high wire, typically " +
      "using a long balance pole; the dramatic contrast between the enormous weight " +
      "and the thin wire — which should bow/sag into a tension curve under the load — " +
      "is the whole point. A clearly recognizable, prominent elephant and a convincing " +
      "sense of weight and wire tension are what matter; photoreal accuracy is not required.",
    dimLabels: { weight: "重量感 / 配重", wire: "钢丝张力", elephant: "大象造型", scene: "场景氛围" },
    dims: {
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
    },
  },
  "rhino-orbit": {
    task:
      "Create a self-contained web page animating 'a rhinoceros orbiting the Earth'. " +
      "The rhino is meant to be a bold, exaggerated, prominent cartoon form with clearly " +
      "visible detail (horns, legs, skin folds) — NOT shrunk to a tiny dot on the orbit. " +
      "Realistic rhino/Earth scale is deliberately NOT a goal; the character of the rhino, " +
      "the orbital motion, the Earth and the overall space scene are what matter.",
    dimLabels: { rhino: "犀牛造型", orbit: "轨道运动", earth: "地球质感", scene: "场景氛围" },
    dims: {
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
    },
  },
};

// Fallback for the categories that have no dedicated rubric yet (penguin,
// whale, octopus, lion) and for 自定义 prompts. Four generic creative-coding
// dimensions; `taskHint` (the preset's own prompt or title) is folded into the
// task so Jev still knows what was asked.
export const GENERIC = {
  dimLabels: { subject: "主体还原", motion: "动态表现", scene: "场景氛围", beauty: "整体美感" },
  dims: {
    subject: {
      weight: 35,
      instructions:
        "Rate how clearly and faithfully the MAIN SUBJECT asked for in the task is depicted — recognizable, well-formed and prominent in the frame rather than vague, broken or off-brief.",
      criteria: [
        "The requested subject is absent or unrecognizable",
        "Something subject-like is present but barely reads as what was asked for",
        "The subject is clearly the right thing and readable, but stiff, crude or lacking detail",
        "A bold, well-formed, detailed and appealing rendition of exactly what was asked for",
      ],
    },
    motion: {
      weight: 25,
      instructions:
        "Rate the ANIMATION / motion: whether the scene actually moves in a way that fits the task (believable, smooth, purposeful) rather than being static or jittery/broken.",
      criteria: [
        "Static, or motion is broken/glitchy",
        "Minimal or mechanical motion with little life",
        "Clear, smooth motion that fits the brief reasonably well",
        "Convincing, lively, well-timed motion that strongly serves the concept",
      ],
    },
    scene: {
      weight: 20,
      instructions:
        "Rate the overall SCENE and composition around the subject: background, setting, framing, depth, lighting and supporting detail.",
      criteria: [
        "Blank or empty, no scene",
        "A minimal hint of setting",
        "A coherent, decent scene with some depth and framing",
        "A rich, coherent, well-composed scene with layered, fitting detail",
      ],
    },
    beauty: {
      weight: 20,
      instructions:
        "Rate the overall AESTHETIC and polish: color harmony, cohesion and how pleasing and finished the whole result looks.",
      criteria: [
        "Crude or unpleasant, no real composition",
        "Basic and plain",
        "A pleasing, coherent, decently polished result",
        "A striking, elegant, highly polished result",
      ],
    },
  },
};

// Resolve the rubric for a slug. Unknown / custom slugs get GENERIC, with the
// caller-supplied prompt text folded into the task so the judgment stays on-brief.
export function getRubric(slug, taskHint) {
  const r = RUBRICS[slug];
  if (r) return r;
  const task =
    "Judge a self-contained web page built for this creative task:\n" +
    (taskHint ? `"${String(taskHint).slice(0, 600)}"` : "(an open creative-coding prompt)") +
    "\nJudge how well it realizes that brief as an animated web page.";
  return { task, dimLabels: GENERIC.dimLabels, dims: GENERIC.dims };
}

