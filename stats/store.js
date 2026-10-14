import { createHmac } from "node:crypto";

const DAY_TTL = 100 * 24 * 60 * 60;
const VISITOR_TTL = 365 * 24 * 60 * 60;
const SESSION_TTL = 24 * 60 * 60;
const FIELDS = ["sessions", "engaged", "returning", "recommend", "recommendOk", "detail", "detailOk"];

function connection(env) {
  const address = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!address || !token) throw new Error("Analytics storage is not configured.");
  const url = new URL(address);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".upstash.io")) throw new Error("Invalid analytics storage URL.");
  return { url: url.href.replace(/\/$/, ""), token };
}

async function execute(env, commands) {
  const { url, token } = connection(env);
  const multiple = Array.isArray(commands[0]);
  const response = await fetch(url + (multiple ? "/pipeline" : ""), {
    method: "POST",
    headers: { authorization: "Bearer " + token, "content-type": "application/json" },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error("Analytics storage is unavailable.");
  const data = await response.json();
  const items = multiple ? data : [data];
  if (!Array.isArray(items) || items.some((item) => item?.error)) throw new Error("Analytics storage rejected a command.");
  return multiple ? items.map((item) => item.result) : items[0].result;
}

const day = (date = new Date()) => date.toISOString().slice(0, 10);
const dailyKey = (date) => "gg:daily:" + date;
const visitorSetKey = (date) => "gg:visitors:" + date;
const hashId = (env, type, id) => {
  if (!env.STATS_SESSION_SECRET) throw new Error("Analytics signing secret is not configured.");
  return createHmac("sha256", env.STATS_SESSION_SECRET).update(type + ":" + id).digest("hex");
};

export async function recordVisit(env, visitorId, sessionId) {
  const visitor = hashId(env, "visitor", visitorId);
  const session = hashId(env, "session", visitorId + ":" + sessionId);
  const date = day();
  const sessionKey = "gg:session:" + session;
  const firstSession = await execute(env, ["SET", sessionKey, date, "NX", "EX", SESSION_TTL]);
  if (firstSession !== "OK") return;
  const visitorKey = "gg:visitor:" + visitor;
  const firstVisitor = await execute(env, ["SET", visitorKey, date, "NX", "EX", VISITOR_TTL]);
  const commands = [
    ["EXPIRE", visitorKey, VISITOR_TTL],
    ["SADD", visitorSetKey(date), visitor],
    ["EXPIRE", visitorSetKey(date), DAY_TTL],
    ["HINCRBY", dailyKey(date), "sessions", 1],
    ["EXPIRE", dailyKey(date), DAY_TTL]
  ];
  if (firstVisitor !== "OK") commands.push(["HINCRBY", dailyKey(date), "returning", 1]);
  await execute(env, commands);
}

export async function recordEngagement(env, visitorId, sessionId) {
  const session = hashId(env, "session", visitorId + ":" + sessionId);
  const date = await execute(env, ["GET", "gg:session:" + session]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || "")) return;
  const firstEngagement = await execute(env, ["SET", "gg:engaged:" + session, "1", "NX", "EX", SESSION_TTL]);
  if (firstEngagement === "OK") await execute(env, ["HINCRBY", dailyKey(date), "engaged", 1]);
}

export async function recordApiUsage(env, route, ok) {
  if (!(env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL) || !(env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN)) return;
  const date = day();
  await execute(env, [
    ["HINCRBY", dailyKey(date), route, 1],
    ...(ok ? [["HINCRBY", dailyKey(date), route + "Ok", 1]] : []),
    ["EXPIRE", dailyKey(date), DAY_TTL]
  ]);
}

export async function readDashboard(env, span) {
  const dates = Array.from({ length: span }, (_, index) => {
    const value = new Date();
    value.setUTCDate(value.getUTCDate() - (span - index - 1));
    return day(value);
  });
  const commands = dates.flatMap((date) => [
    ["HMGET", dailyKey(date), ...FIELDS],
    ["SCARD", visitorSetKey(date)]
  ]);
  const values = await execute(env, commands);
  const rows = dates.map((date, index) => {
    const counters = Object.fromEntries(FIELDS.map((field, fieldIndex) => [field, Number(values[index * 2]?.[fieldIndex] || 0)]));
    return { date, ...counters, unique: Number(values[index * 2 + 1] || 0) };
  });
  const union = await execute(env, ["SUNION", ...dates.map(visitorSetKey)]);
  const totals = Object.fromEntries(FIELDS.map((field) => [field, rows.reduce((sum, row) => sum + row[field], 0)]));
  totals.unique = Array.isArray(union) ? union.length : 0;
  totals.bounces = Math.max(0, totals.sessions - totals.engaged);
  totals.bounceRate = totals.sessions ? Math.round(totals.bounces / totals.sessions * 1000) / 10 : 0;
  totals.returnRate = totals.sessions ? Math.round(totals.returning / totals.sessions * 1000) / 10 : 0;
  return { days: rows, totals, range: span, updatedAt: new Date().toISOString() };
}
