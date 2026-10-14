import { authenticated } from "../stats/auth.js";
import { renderStatsPage } from "../stats/page.js";

export default {
  fetch(request) {
    if (request.method !== "GET") return new Response(null, { status: 405 });
    return new Response(renderStatsPage(authenticated(request, process.env)), {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
        "x-robots-tag": "noindex, nofollow",
        "x-frame-options": "DENY",
        "content-security-policy": "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
      }
    });
  }
};
