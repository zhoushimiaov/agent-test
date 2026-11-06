import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { ENGINEERING_RUBRICS } from "../src/engineering-rubrics.js";
import { getRubric } from "../src/rubrics.js";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const ENGINEERING = [
  ["roadster", 9, ["vehicle", "starman", "space", "flight"]],
  ["sht-tmd", 6, ["fidelity", "physics", "visual", "hud", "city"]],
  ["forest-cabin", 1, ["construction", "material", "light", "presentation"]],
];
const contentOf = (p) => readFileSync(join(ROOT, p), "utf8");

function getPresets() {
  const html = contentOf("playground/index.html");
  const json = html.match(/<script id="zoo-prompts" type="application\/json">([\s\S]*?)<\/script>/);
  assert.ok(json, "Missing generated prompt catalog");
  return JSON.parse(json[1]);
}

test("Playground publishes all 11 benchmark prompts, including the new Engineering projects", () => {
  const presets = getPresets();
  assert.equal(presets.length, 11);
  assert.equal(new Set(presets.map((p) => p.slug)).size, 11);
  for (const [slug] of ENGINEERING) {
    const preset = presets.find((p) => p.slug === slug);
    assert.ok(preset, "Missing Playground prompt: " + slug);
    assert.ok(preset.prompt.length > 200);
    assert.match(preset.notice, /公开复刻题面/);
    const markdown = contentOf(slug + "/PROMPT.md");
    const source = markdown.match(/```text\s*\n([\s\S]*?)```/);
    assert.ok(source, "The prompt must be stored in a text fence: " + slug);
    assert.equal(preset.prompt, source[1].trim(), "Generated preset diverged from PROMPT.md: " + slug);
    assert.match(contentOf(slug + "/REFERENCES.md"), /尚未|未收录|未归档|未存在|缺口|缺失|无法验证|未存/);
  }
});

test("Engineering leaderboard, prompt, Worker rubric and offline scoring script agree", () => {
  assert.equal(Object.keys(ENGINEERING_RUBRICS).length, 3);
  for (const [slug, expectedCount, expectedDims] of ENGINEERING) {
    const rubric = ENGINEERING_RUBRICS[slug];
    assert.ok(rubric, "Missing engineering rubric: " + slug);
    assert.equal(getRubric(slug, "some other user prompt"), rubric);
    assert.deepEqual(Object.keys(rubric.dims), expectedDims);
    assert.deepEqual(Object.keys(rubric.dimLabels), expectedDims);
    assert.equal(Object.values(rubric.dims).reduce((n, d) => n + d.weight, 0), 100);
    for (const dim of Object.values(rubric.dims)) {
      assert.ok(dim.instructions.length > 50);
      assert.equal(dim.criteria.length, 4);
    }
    const scores = JSON.parse(contentOf(slug + "/scores.json"));
    const weights = Object.fromEntries(Object.entries(rubric.dims).map(([key, d]) => [key, d.weight]));
    assert.deepEqual(scores.weights, weights, "Weight drift in " + slug);
    assert.deepEqual(scores.dimLabels, rubric.dimLabels, "Label drift in " + slug);
    assert.equal(scores.results.length, expectedCount);
    const html = contentOf(slug + "/index.html");
    const found = [...html.matchAll(/href="\.\.\/viewer\/\?category=([^"&]+)&amp;model=([^"&]+)"/g)]
      .map((m) => { assert.equal(m[1], slug); return m[2]; });
    assert.equal(found.length, expectedCount, "HTML card count mismatch in " + slug);
    const ids = scores.results.map((x) => x.slug);
    assert.equal(new Set(ids).size, expectedCount, "duplicate IDs in " + slug);
    assert.deepEqual(new Set(found), new Set(ids));
    for (const item of scores.results) {
      assert.ok(existsSync(join(ROOT, slug, item.slug + ".html")), "Missing model HTML: " + item.slug);
      assert.ok(existsSync(join(ROOT, slug, "thumbs", item.slug + ".webp")), "Missing thumbnail: " + item.slug);
      assert.deepEqual(Object.keys(item.dims), expectedDims, "Score data dimension drift: " + item.slug);
    }
    const scoring = contentOf("jev-score-" + slug + ".mjs");
    assert.match(scoring, /import \{ ENGINEERING_RUBRICS \}/);
    assert.ok(scoring.includes('ENGINEERING_RUBRICS["' + slug + '"]'));
  }
});
