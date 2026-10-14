import { authenticated } from "../stats/auth.js";
import { readDashboard } from "../stats/store.js";

const headers = { "cache-control": "no-store", "content-type": "application/json", "x-robots-tag": "noindex, nofollow" };

export default {
  async fetch(request) {
    if (request.method !== "GET") return Response.json({ error: "Method not allowed." }, { status: 405, headers });
    if (!authenticated(request, process.env)) return Response.json({ error: "Sign in to view statistics." }, { status: 401, headers });
    const range = Number(new URL(request.url).searchParams.get("days") || 7);
    if (![7, 30].includes(range)) return Response.json({ error: "Choose 7 or 30 days." }, { status: 400, headers });
    try { return Response.json(await readDashboard(process.env, range), { headers }); }
    catch { return Response.json({ error: "Statistics are temporarily unavailable." }, { status: 503, headers }); }
  }
};
