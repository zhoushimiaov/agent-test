// Shared validator for TypeSafe Jev score responses. Neither its score nor
// its model metadata is trusted until every dimension passes validation.
export function normalizeJevResponse(raw, rubric) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw) ||
      !raw.answers || typeof raw.answers !== "object") {
    throw new Error("Jev 返回数据格式错误。");
  }
  const dims = {};
  let total = 0;
  let sumWeights = 0;
  for (const [key, dim] of Object.entries(rubric.dims)) {
    const levels = dim.criteria?.length - 1;
    if (!Number.isSafeInteger(levels) || levels < 1 ||
        !Number.isFinite(dim.weight) || dim.weight <= 0) {
      throw new Error("评分标准配置无效：" + key);
    }
    const answer = Object.prototype.hasOwnProperty.call(raw.answers, key) ? raw.answers[key] : null;
    const score = answer?.score;
    const confidence = answer?.confidence ?? 0;
    if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > levels ||
        typeof confidence !== "number" || !Number.isFinite(confidence) ||
        confidence < 0 || confidence > 1) {
      throw new Error("Jev 返回非法维度分数：" + key);
    }
    const frac = score / levels;
    dims[key] = {
      score: Number(score.toFixed(2)),
      confidence: Number(confidence.toFixed(2)),
      frac: Number(frac.toFixed(3)),
    };
    total += dim.weight * frac;
    sumWeights += dim.weight;
  }
  if (Math.abs(sumWeights - 100) > 0.0001 || !Number.isFinite(total)) {
    throw new Error("评分权重总和必须为 100。");
  }
  const model = typeof raw.model === "string" && raw.model.length <= 100 ? raw.model : "jev";
  return {
    total: Math.round(total),
    dims,
    dimLabels: rubric.dimLabels,
    weights: Object.fromEntries(Object.entries(rubric.dims).map(([key, dim]) => [key, dim.weight])),
    jev: model,
  };
}
