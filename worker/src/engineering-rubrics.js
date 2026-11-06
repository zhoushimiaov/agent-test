// Shared single source of truth for the three Engineering benchmark rubrics.
// Offline jev-score-* scripts and the online Worker import these exact objects.
// Changing the rubric changes NEW evaluations only; existing scores.json remains
// a historical snapshot and must not be silently rewritten.

// roadster: source migrated verbatim from jev-score-roadster.mjs at 2ef8430.
const roadster = (() => {
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
return { task: TASK, dimLabels: {
  "vehicle": "整车还原",
  "starman": "Starman 姿态",
  "space": "太空场景",
  "flight": "飞行动力学"
}, dims: DIMS };
})();

// sht-tmd: source migrated verbatim from jev-score-sht-tmd.mjs at 2ef8430.
const sht_tmd = (() => {
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
return { task: TASK, dimLabels: {
  "fidelity": "造型还原",
  "physics": "工程物理",
  "visual": "三维表现",
  "hud": "信息交互",
  "city": "城市环境"
}, dims: DIMS };
})();

// forest-cabin: source migrated verbatim from jev-score-forest-cabin.mjs at 2ef8430.
const forest_cabin = (() => {
const TASK =
  "Create a self-contained web page presenting Peter Zumthor's Leis Houses (莱斯木屋) — " +
  "timber houses in a Swiss alpine valley built in the local Strickbau method, where squared " +
  "logs are stacked layer by layer on a stone plinth under a low-pitched roof. The building " +
  "carries almost no ornament: its character comes from the thickness of the timber, the " +
  "shadows in the joints, and the way daylight travels through the interior. The page should " +
  "let the viewer roam the building and study it, judged on: how faithfully the construction " +
  "is modelled (stacked log courses, stone plinth, gable and roof proportions, window and door " +
  "openings), the material detail (wood grain, joint seams, masonry), the interior light and " +
  "atmosphere (raking light through openings, soft shadow, silence), and the presentation " +
  "(camera views and interface) that communicates the architecture.";

// Judgment dimensions. Weights combine into a 0-100 overall score.
const DIMS = {
  construction: {
    weight: 30,
    instructions:
      "Rate the CONSTRUCTION FIDELITY: is the building actually built as stacked log courses (Strickbau) on a stone plinth with a low gabled roof — distinct horizontal timber layers with visible joints at the corners, a stone base, correct gable and roof pitch, real window/door openings — versus a generic box, a cabin made of smooth walls, or an abstract mass with no timber logic?",
    criteria: [
      "No building, or an abstract mass/box with no recognizable timber construction",
      "A house-like shape, but the construction is generic — smooth walls, no log courses, no plinth, or wrong roof",
      "A clearly timber building with stacked courses, a stone base and a gabled roof; some joints/openings approximate",
      "Faithful Strickbau — layered log courses with corner joints, stone plinth, correct gable and low roof pitch, real openings, proportions right",
    ],
  },
  material: {
    weight: 25,
    instructions:
      "Rate MATERIAL AND DETAIL: how convincing the timber is (grain, weathered tone, thickness of each course, joint seams and shadow lines) and the masonry plinth, versus flat untextured surfaces or plastic-looking geometry.",
    criteria: [
      "Flat, untextured surfaces with no material character",
      "Basic color only — wood and stone told apart by hue, no grain, seams or weathering",
      "Readable materials — timber tone and grain, visible course seams, a stone base with some texture",
      "Rich, tactile materials — weathered wood grain, deep joint shadows, layered stone, convincing surface detail at close range",
    ],
  },
  light: {
    weight: 25,
    instructions:
      "Rate INTERIOR LIGHT AND ATMOSPHERE: raking daylight through openings, soft indirect bounce, deep quiet shadow, haze or mist in the valley — the sense of a silent, contemplative space — versus flat even lighting or a scene with no atmosphere.",
    criteria: [
      "Flat, evenly lit render with no atmosphere or shadow",
      "Some lighting variation, but no real sense of light entering the interior or of mood",
      "A convincing lit scene — directional daylight, shadow and some interior glow through openings",
      "Atmospheric and evocative — raking light through openings, soft bounce, deep quiet shadow, valley haze; the space feels silent",
    ],
  },
  presentation: {
    weight: 20,
    instructions:
      "Rate PRESENTATION: the camera work and interface that let a viewer study the building — multiple architectural views (axon, facade, interior/hearth), orbit or walkthrough, labelled hotspots or parameters — versus a single static view with no way to explore.",
    criteria: [
      "One static view, no way to explore or identify anything",
      "A single controllable camera with no other views or information",
      "Several camera views and some labels/parameters that help study the building",
      "A curated architectural presentation — multiple named views (axon/facade/interior), hotspots, environment presets, a considered interface",
    ],
  },
};
return { task: TASK, dimLabels: {
  "construction": "构造还原",
  "material": "材质细节",
  "light": "室内光影",
  "presentation": "呈现与漫游"
}, dims: DIMS };
})();

export const ENGINEERING_RUBRICS = Object.freeze({
  "roadster": roadster,
  "sht-tmd": sht_tmd,
  "forest-cabin": forest_cabin,
});
