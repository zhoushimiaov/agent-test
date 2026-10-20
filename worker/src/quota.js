// Atomic daily quotas for Zoo Test free Jev scoring.
// Kept independent of the Worker entrypoint so Node unit tests can import it.
function json(body, status) {
  return new Response(JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export class QuotaLimiter {
  constructor(state) { this.state = state; }

  async fetch(request) {
    if (request.method !== "POST") return json({ error: "POST only" }, 405);
    let data;
    try { data = await request.json(); } catch (_) { return json({ error: "invalid JSON" }, 400); }
    if (typeof data.identity !== "string" || !/^[a-f0-9]{64}$/.test(data.identity) ||
        typeof data.requestId !== "string" || data.requestId.length > 80) {
      return json({ error: "invalid quota request" }, 400);
    }
    const path = new URL(request.url).pathname;
    const storage = this.state.storage;
    if (path === "/reserve") {
      const { limit, dailyBudget, identity, requestId } = data;
      if (!Number.isSafeInteger(limit) || limit < 1 ||
          !Number.isSafeInteger(dailyBudget) || dailyBudget < 1) {
        return json({ error: "invalid quota limits" }, 400);
      }
      const result = await storage.transaction(async (tx) => {
        const prior = await tx.get("r:" + requestId);
        const used = Number((await tx.get("u:" + identity)) || 0);
        const total = Number((await tx.get("total")) || 0);
        if (prior) return { ok: true, remaining: Math.max(0, limit - used) };
        if (used >= limit) return { ok: false, reason: "visitor" };
        if (total >= dailyBudget) return { ok: false, reason: "daily-budget" };
        await tx.put("u:" + identity, used + 1);
        await tx.put("total", total + 1);
        await tx.put("r:" + requestId, identity);
        return { ok: true, remaining: Math.max(0, limit - used - 1) };
      });
      // Daily instances are discarded after their quota window has closed.
      if (await storage.getAlarm() == null) {
        await storage.setAlarm(Date.now() + 72 * 60 * 60 * 1000);
      }
      return json(result, 200);
    }
    if (path === "/finalize") {
      await storage.delete("r:" + data.requestId);
      return json({ ok: true }, 200);
    }
    if (path === "/refund") {
      await storage.transaction(async (tx) => {
        const key = "r:" + data.requestId;
        const identity = await tx.get(key);
        if (!identity) return; // idempotent; never decrement someone else's count
        const used = Number((await tx.get("u:" + identity)) || 0);
        const total = Number((await tx.get("total")) || 0);
        if (used > 0) await tx.put("u:" + identity, used - 1);
        if (total > 0) await tx.put("total", total - 1);
        await tx.delete(key);
      });
      return json({ ok: true }, 200);
    }
    return json({ error: "not found" }, 404);
  }

  async alarm() {
    await this.state.storage.deleteAll();
  }
}
