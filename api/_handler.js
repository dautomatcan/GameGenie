import worker from "../dist/server/index.js";
import { recordApiUsage } from "../stats/store.js";

export default {
  async fetch(request) {
    const result = await worker.fetch(request, process.env);
    const path = new URL(request.url).pathname;
    const route = path === "/api/recommend" ? "recommend" : path === "/api/browse" ? "browse" : "detail";
    try { await recordApiUsage(process.env, route, result.ok); }
    catch { /* Analytics downtime must never break game recommendations. */ }
    return result;
  }
};
