import test from "node:test";
import assert from "node:assert/strict";
import { normalizeJevResponse } from "../src/score.js";

const rubric = {
  dimLabels: { a: "A", b: "B" },
  dims: {
    a: { criteria: ["fail", "ok", "great"], weight: 60 },
    b: { criteria: ["fail", "ok", "great"], weight: 40 },
  },
};
const valid = () => ({
  model: "jev-test",
  answers: {
    a: { score: 2, confidence: 0.9 },
    b: { score: 1.5, confidence: 0.8 },
  },
});
test("returns weighted 0-100 scores", () => {
  const s = normalizeJevResponse(valid(), rubric);
  assert.equal(s.total, 90);
  assert.equal(s.dims.a.frac, 1);
  assert.equal(s.dims.b.frac, 0.75);
});
test("rejects missing dimensions, out-of-range and non-finite numbers", () => {
  const no = valid(); delete no.answers.b;
  assert.throws(() => normalizeJevResponse(no, rubric), /非法维度/);
  const over = valid(); over.answers.a.score = 10;
  assert.throws(() => normalizeJevResponse(over, rubric), /非法维度/);
  const nan = valid(); nan.answers.b.confidence = NaN;
  assert.throws(() => normalizeJevResponse(nan, rubric), /非法维度/);
});
test("rejects incorrect rubric weights", () => {
  const bad = structuredClone(rubric);
  bad.dims.b.weight = 20;
  assert.throws(() => normalizeJevResponse(valid(), bad), /权重/);
});
