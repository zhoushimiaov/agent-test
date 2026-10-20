import test from "node:test";
import assert from "node:assert/strict";
import { QuotaLimiter } from "../src/quota.js";

// Tiny transactional memory store with a FIFO lock: all test requests share
// one storage instance and therefore expose non-atomic read-modify-write bugs.
class Storage {
  constructor() { this.values = new Map(); this.lock = Promise.resolve(); this.alarmAt = null; }
  async transaction(fn) {
    const prior = this.lock;
    let unlock;
    this.lock = new Promise((resolve) => { unlock = resolve; });
    await prior;
    try { return await fn(this); } finally { unlock(); }
  }
  async get(key) { return this.values.get(key); }
  async put(key, value) { this.values.set(key, value); }
  async delete(key) { return this.values.delete(key); }
  async getAlarm() { return this.alarmAt; }
  async setAlarm(at) { this.alarmAt = at; }
  async deleteAll() { this.values.clear(); }
}
const A = "a".repeat(64);
const B = "b".repeat(64);
function setup() {
  const state = { storage: new Storage() };
  return { obj: new QuotaLimiter(state), storage: state.storage };
}
async function call(obj, path, data) {
  const r = await obj.fetch(new Request("https://quota.internal/" + path, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }));
  return { status: r.status, body: await r.json() };
}
const reservation = (identity, id, budget = 100, limit = 3) =>
  ({ identity, requestId: id, limit, dailyBudget: budget });

test("atomic concurrent reservations enforce per-visitor cap", async () => {
  const { obj, storage } = setup();
  const attempts = await Promise.all(
    Array.from({ length: 10 }, (_, i) => call(obj, "reserve", reservation(A, "request-" + i)))
  );
  assert.equal(attempts.filter((x) => x.body.ok).length, 3);
  assert.equal(storage.values.get("u:" + A), 3);
  assert.equal(storage.values.get("total"), 3);
  assert.ok(storage.alarmAt != null);
});

test("global daily budget also caps different visitors", async () => {
  const { obj, storage } = setup();
  const attempts = await Promise.all([
    call(obj, "reserve", reservation(A, "a1", 2)),
    call(obj, "reserve", reservation(A, "a2", 2)),
    call(obj, "reserve", reservation(B, "b1", 2)),
    call(obj, "reserve", reservation(B, "b2", 2)),
  ]);
  assert.equal(attempts.filter((x) => x.body.ok).length, 2);
  assert.equal(storage.values.get("total"), 2);
  assert.ok(attempts.some((x) => x.body.reason === "daily-budget"));
});

test("refund is idempotent and never reduces unrelated usage", async () => {
  const { obj, storage } = setup();
  const a = reservation(A, "a1");
  const b = reservation(B, "b1");
  await call(obj, "reserve", a);
  await call(obj, "reserve", b);
  await call(obj, "refund", a);
  await call(obj, "refund", a);
  assert.equal(storage.values.get("u:" + A), 0);
  assert.equal(storage.values.get("u:" + B), 1);
  assert.equal(storage.values.get("total"), 1);
});

test("successful finalized reservation cannot be refunded", async () => {
  const { obj, storage } = setup();
  const a = reservation(A, "successful");
  assert.equal((await call(obj, "reserve", a)).body.ok, true);
  assert.equal((await call(obj, "reserve", a)).body.ok, true);
  assert.equal(storage.values.get("total"), 1);
  await call(obj, "finalize", a);
  await call(obj, "refund", a);
  assert.equal(storage.values.get("total"), 1);
});

test("invalid quota request is rejected", async () => {
  const { obj } = setup();
  const result = await call(obj, "reserve", reservation("invalid-ip-hash", "a1"));
  assert.equal(result.status, 400);
});

test("daily object alarm clears aged quota state", async () => {
  const { obj, storage } = setup();
  await call(obj, "reserve", reservation(A, "a1"));
  await obj.alarm();
  assert.equal(storage.values.size, 0);
});
