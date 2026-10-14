import { clearSessionCookie, sameOrigin } from "../stats/auth.js";

export default {
  fetch(request) {
    if (request.method !== "POST") return new Response(null, { status: 405 });
    if (!sameOrigin(request)) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: { "cache-control": "no-store", "set-cookie": clearSessionCookie() } });
  }
};
