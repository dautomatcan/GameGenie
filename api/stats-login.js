import { sameOrigin, sessionCookie, validPassword } from "../stats/auth.js";

const headers = { "cache-control": "no-store", "content-type": "application/json" };

export default {
  async fetch(request) {
    if (request.method !== "POST") return Response.json({ error: "Method not allowed." }, { status: 405, headers });
    if (!sameOrigin(request)) return Response.json({ error: "Forbidden." }, { status: 403, headers });
    if (Number(request.headers.get("content-length") || 0) > 512) return Response.json({ error: "Invalid request." }, { status: 413, headers });
    let body;
    try {
      const text = await request.text();
      if (text.length > 512) throw new Error("Too large");
      body = JSON.parse(text);
    } catch { return Response.json({ error: "Invalid request." }, { status: 400, headers }); }
    if (!process.env.STATS_SESSION_SECRET || !process.env.STATS_ADMIN_PASSWORD) {
      return Response.json({ error: "Statistics login is not configured." }, { status: 503, headers });
    }
    if (!validPassword(body?.password, process.env)) return Response.json({ error: "Incorrect password." }, { status: 401, headers });
    return Response.json({ ok: true }, { headers: { ...headers, "set-cookie": sessionCookie(process.env) } });
  }
};
