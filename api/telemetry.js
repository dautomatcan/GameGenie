import { recordEngagement, recordVisit } from "../stats/store.js";
import { sameOrigin } from "../stats/auth.js";

const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = { "cache-control": "no-store" };

export default {
  async fetch(request) {
    if (request.method !== "POST") return new Response(null, { status: 405, headers });
    if (!sameOrigin(request)) return new Response(null, { status: 403, headers });
    if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return new Response(null, { status: 415, headers });
    if (Number(request.headers.get("content-length") || 0) > 512) return new Response(null, { status: 413, headers });
    let payload;
    try {
      const text = await request.text();
      if (text.length > 512) throw new Error("Too large");
      payload = JSON.parse(text);
    } catch { return new Response(null, { status: 400, headers }); }
    if (!idPattern.test(payload?.visitorId || "") || !idPattern.test(payload?.sessionId || "") || !["visit", "engage"].includes(payload?.type)) {
      return new Response(null, { status: 400, headers });
    }
    try {
      if (payload.type === "visit") await recordVisit(process.env, payload.visitorId, payload.sessionId);
      else await recordEngagement(process.env, payload.visitorId, payload.sessionId);
    } catch { return new Response(null, { status: 503, headers }); }
    return new Response(null, { status: 204, headers });
  }
};
