import worker from "../dist/server/index.js";
import { recordApiUsage } from "../stats/store.js";

export default {
  async fetch(request) {
    const result = await worker.fetch(request, process.env);
    const route = new URL(request.url).pathname === "/api/recommend" ? "recommend" : "detail";
    try { await recordApiUsage(process.env, route, result.ok); }
    catch { /* Analytics downtime must never break game recommendations. */ }
    return result;
  }
};
