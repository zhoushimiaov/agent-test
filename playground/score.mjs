// Pure score response validation. Never trust third-party response fields
// before rendering them in the Playground UI.
export function validateScoreResponse(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("评分服务返回的数据格式错误。");
  }
  const validNumber = (n, min, max) =>
    typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
  if (!Number.isInteger(input.total) || !validNumber(input.total, 0, 100)) {
    throw new Error("评分服务返回了非法总分。");
  }
  const labels = input.dimLabels;
  const dims = input.dims;
  if (!labels || typeof labels !== "object" || Array.isArray(labels) ||
      !dims || typeof dims !== "object" || Array.isArray(dims)) {
    throw new Error("评分服务返回的维度数据不完整。");
  }
  const keys = Object.keys(labels);
  if (keys.length < 1 || keys.length > 12) {
    throw new Error("评分维度数量无效。");
  }
  const validated = keys.map((key) => {
    const label = labels[key];
    const dim = Object.prototype.hasOwnProperty.call(dims, key) ? dims[key] : null;
    if (typeof label !== "string" || label.length < 1 || label.length > 80 ||
        !dim || !validNumber(dim.frac, 0, 1) ||
        !validNumber(dim.score, 0, 100) ||
        !validNumber(dim.confidence, 0, 1)) {
      throw new Error("评分维度数据无效：" + key);
    }
    return { key, label, frac: dim.frac, score: dim.score, confidence: dim.confidence };
  });
  if (typeof input.jev !== "string" || input.jev.length > 100) {
    throw new Error("评分模型信息无效。");
  }
  if (typeof input.hadScreenshot !== "boolean" || typeof input.usedOurKey !== "boolean") {
    throw new Error("评分模式信息无效。");
  }
  const remaining = input.remaining == null ? null : input.remaining;
  if (remaining !== null && (!Number.isSafeInteger(remaining) || remaining < 0)) {
    throw new Error("剩余额度信息无效。");
  }
  return {
    total: input.total, dimensions: validated, model: input.jev,
    hadScreenshot: input.hadScreenshot, usedOurKey: input.usedOurKey,
    remaining, sourceTruncated: input.sourceTruncated === true,
    basis: input.hadScreenshot ? "单帧截图描述 + 代码" : "仅代码推断",
  };
}
