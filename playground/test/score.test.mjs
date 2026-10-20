import test from "node:test";
import assert from "node:assert/strict";
import { validateScoreResponse } from "../score.mjs";

const sample = () => ({
  total: 88,
  dimLabels: { a: "美感" },
  dims: { a: { frac: 0.8, score: 2.4, confidence: 0.9 } },
  jev: "jev-test",
  hadScreenshot: false,
  usedOurKey: true,
  remaining: 2,
});
test("accepts a valid score and identifies code-only evaluation", () => {
  const result = validateScoreResponse(sample());
  assert.equal(result.total, 88);
  assert.equal(result.dimensions[0].label, "美感");
  assert.equal(result.basis, "仅代码推断");
});
test("rejects HTML-like and malformed score payloads", () => {
  const p = sample(); p.total = NaN;
  assert.throws(() => validateScoreResponse(p), /总分/);
  p.total = 88; p.dims.a.frac = Infinity;
  assert.throws(() => validateScoreResponse(p), /维度/);
  p.dims.a.frac = 0.8; p.remaining = -1;
  assert.throws(() => validateScoreResponse(p), /额度/);
});
test("rejects missing dimensions and invalid mode flags", () => {
  const p = sample(); delete p.dims.a;
  assert.throws(() => validateScoreResponse(p), /维度/);
  p.dims.a = { frac: .5, score: 1.5, confidence: 0 };
  p.hadScreenshot = 'yes';
  assert.throws(() => validateScoreResponse(p), /模式/);
});
