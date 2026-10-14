import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "gg_stats_session";
const SESSION_SECONDS = 7 * 24 * 60 * 60;

function equal(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

function signature(value, secret) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function authenticated(request, env) {
  if (!env.STATS_SESSION_SECRET) return false;
  const cookie = request.headers.get("cookie")?.split("; ").find((part) => part.startsWith(COOKIE + "="))?.slice(COOKIE.length + 1);
  if (!cookie) return false;
  const [expires, proof, extra] = cookie.split(".");
  if (extra || !/^\d{10,13}$/.test(expires || "") || !proof) return false;
  if (Number(expires) < Date.now()) return false;
  return equal(proof, signature(expires, env.STATS_SESSION_SECRET));
}

export function validPassword(submitted, env) {
  return typeof submitted === "string" && !!env.STATS_ADMIN_PASSWORD && equal(submitted, env.STATS_ADMIN_PASSWORD);
}

export function sessionCookie(env) {
  const expires = String(Date.now() + SESSION_SECONDS * 1000);
  const value = expires + "." + signature(expires, env.STATS_SESSION_SECRET);
  return COOKIE + "=" + value + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=" + SESSION_SECONDS;
}

export function clearSessionCookie() {
  return COOKIE + "=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}

export function sameOrigin(request) {
  const origin = request.headers.get("origin");
  return !!origin && origin === new URL(request.url).origin;
}
