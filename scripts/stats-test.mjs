import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { recordEngagement, recordVisit, readDashboard } from "../stats/store.js";
import { authenticated } from "../stats/auth.js";
import statsLogin from "../api/stats-login.js";
import statsData from "../api/stats-data.js";
import statsPage from "../api/stats-page.js";
import telemetry from "../api/telemetry.js";

const originalFetch = globalThis.fetch;
const saved = Object.fromEntries(["KV_REST_API_URL", "KV_REST_API_TOKEN", "STATS_ADMIN_PASSWORD", "STATS_SESSION_SECRET"].map((name) => [name, process.env[name]]));
const strings = new Map(), hashes = new Map(), sets = new Map();
function command([name, ...args]) {
  const key = String(args[0]);
  switch (name) {
    case "SET":
      if (args.includes("NX") && strings.has(key)) return null;
      strings.set(key, String(args[1])); return "OK";
    case "GET": return strings.get(key) ?? null;
    case "EXPIRE": return 1;
    case "SADD": {
      const set = sets.get(key) || new Set();
      const before = set.size;
      set.add(String(args[1])); sets.set(key, set); return set.size - before;
    }
    case "SCARD": return sets.get(key)?.size || 0;
    case "SUNION": return [...new Set(args.flatMap((item) => [...(sets.get(String(item)) || [])]))];
    case "HINCRBY": {
      const hash = hashes.get(key) || new Map();
      const value = Number(hash.get(args[1]) || 0) + Number(args[2]);
      hash.set(args[1], value); hashes.set(key, hash); return value;
    }
    case "HMGET": return args.slice(1).map((field) => hashes.get(key)?.get(field) ?? null);
    default: throw new Error("Unexpected Redis command: " + name);
  }
}
globalThis.fetch = async (url, init) => {
  assert.match(String(url), /^https:\/\/test\.upstash\.io/);
  assert.equal(init.headers.authorization, "Bearer test-token");
  const payload = JSON.parse(init.body);
  return Response.json(Array.isArray(payload[0]) ? payload.map((item) => ({ result: command(item) })) : { result: command(payload) });
};
Object.assign(process.env, {
  KV_REST_API_URL: "https://test.upstash.io", KV_REST_API_TOKEN: "test-token",
  STATS_ADMIN_PASSWORD: "test-owner-password", STATS_SESSION_SECRET: "test-signing-secret"
});
try {
  const visitorId = randomUUID(), sessionOne = randomUUID(), sessionTwo = randomUUID();
  await recordVisit(process.env, visitorId, sessionOne);
  await recordVisit(process.env, visitorId, sessionOne);
  await recordEngagement(process.env, visitorId, sessionOne);
  await recordEngagement(process.env, visitorId, sessionOne);
  await recordVisit(process.env, visitorId, sessionTwo);
  const summary = await readDashboard(process.env, 7);
  assert.equal(summary.totals.sessions, 2);
  assert.equal(summary.totals.unique, 1);
  assert.equal(summary.totals.returning, 1);
  assert.equal(summary.totals.engaged, 1);
  assert.equal(summary.totals.bounceRate, 50);

  const unauthorized = new Request("https://example.com/api/stats-data");
  assert.equal((await statsData.fetch(unauthorized)).status, 401);
  const badOrigin = new Request("https://example.com/api/stats-login", { method: "POST", headers: { origin: "https://other.example" }, body: "{}" });
  assert.equal((await statsLogin.fetch(badOrigin)).status, 403);
  const badPassword = new Request("https://example.com/api/stats-login", { method: "POST", headers: { origin: "https://example.com" }, body: JSON.stringify({ password: "wrong" }) });
  assert.equal((await statsLogin.fetch(badPassword)).status, 401);
  const login = new Request("https://example.com/api/stats-login", { method: "POST", headers: { origin: "https://example.com" }, body: JSON.stringify({ password: "test-owner-password" }) });
  const loginResult = await statsLogin.fetch(login);
  assert.equal(loginResult.status, 200);
  const cookie = loginResult.headers.get("set-cookie").split(";")[0];
  const authorized = new Request("https://example.com/api/stats-data?days=7", { headers: { cookie } });
  assert.equal(authenticated(authorized, process.env), true);
  assert.equal((await statsData.fetch(authorized)).status, 200);
  const page = await statsPage.fetch(new Request("https://example.com/stats"));
  assert.equal(page.headers.get("cache-control"), "no-store");
  assert.match(await page.text(), /Owner password/);
  assert.doesNotMatch(await (await statsPage.fetch(new Request("https://example.com/stats"))).text(), /Game searches/);
  const invalidTelemetry = new Request("https://example.com/api/telemetry", { method: "POST", headers: { origin: "https://example.com", "content-type": "application/json" }, body: JSON.stringify({ type: "visit", visitorId: "bad", sessionId: "bad" }) });
  assert.equal((await telemetry.fetch(invalidTelemetry)).status, 400);
  console.log("Stats test passed: unique and returning visits, bounce estimate, owner session, access guard and input validation");
} finally {
  globalThis.fetch = originalFetch;
  for (const [name, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[name]; else process.env[name] = value;
  }
}
