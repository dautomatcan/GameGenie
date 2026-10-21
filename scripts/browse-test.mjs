import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import worker from "../dist/server/index.js";

const platforms = JSON.parse(await readFile(new URL("../data/platforms.json", import.meta.url), "utf8"));
const env = { RAWG_API_KEY: "test", IGDB_CLIENT_ID: "client", IGDB_CLIENT_SECRET: "secret", GROQ_API_KEY: "test" };
const calls = [];
const originalFetch = globalThis.fetch;
const rawgGame = { id: 10, name: "Sample PC Game", slug: "sample-pc-game", released: "2024-05-02", rating: 4.2,
  added: 900, metacritic: 80, background_image: "https://media.rawg.io/sample.jpg",
  genres: [{ name: "Action" }], platforms: [{ platform: { id: 4 } }], description_raw: "An action game." };
const igdbGame = { id: 20, name: "Sample Genesis Game", platforms: [29], cover: { image_id: "cover123" },
  genres: [{ name: "Platform" }], first_release_date: 725846400, total_rating: 80, total_rating_count: 100,
  url: "https://www.igdb.com/games/sample-genesis-game" };
globalThis.fetch = async (url, init) => {
  const address = String(url);
  calls.push({ address, body: init?.body });
  if (address.includes("id.twitch.tv/oauth2/token")) return Response.json({ access_token: "token_test", expires_in: 3600 });
  if (address.includes("api.igdb.com/v4/multiquery")) return Response.json([{ name: "c0", result: [{ ...igdbGame, id: 30, name: "Forgotten Worlds" }] }]);
  if (address.includes("api.igdb.com/v4/games")) return Response.json([igdbGame]);
  if (address.includes("api.groq.com")) return Response.json({ error: "Unavailable" }, { status: 503 });
  if (address.includes("/games/10/movies")) return Response.json({ results: [] });
  if (address.includes("/games/10")) return Response.json(rawgGame);
  if (address.includes("/games?")) return Response.json({ results: [rawgGame], next: null });
  throw new Error("Unexpected external call: " + address);
};

try {
  const browsePage = await worker.fetch(new Request("https://example.com/browse"), env);
  assert.equal(browsePage.status, 200);
  assert.match(await browsePage.text(), /Browse freely/);
  const browseClient = await worker.fetch(new Request("https://example.com/browse.js"), env);
  assert.doesNotMatch(await browseClient.text(), /__PLATFORMS__/);
  const browseRequest = (query) => worker.fetch(new Request("https://example.com/api/browse?" + query), env);
  assert.equal((await browseRequest("platform=unknown")).status, 400);
  assert.equal((await browseRequest("sort=downloads")).status, 400);
  const pc = await browseRequest("platform=pc&sort=popular&page=1");
  assert.equal(pc.status, 200);
  assert.match(pc.headers.get("cache-control"), /s-maxage=600/);
  assert.equal((await pc.json()).games[0].title, "Sample PC Game");
  assert.ok(calls.some((call) => call.address.includes("/games?") && new URL(call.address).searchParams.get("ordering") === "-added"));
  const genesis = await browseRequest("platform=genesis&sort=rating&page=1");
  assert.equal((await genesis.json()).games[0].source, "igdb");
  assert.ok(calls.some((call) => String(call.body).includes("platforms = (29)") && String(call.body).includes("sort total_rating desc")));
  const cps = await browseRequest("platform=cps1&sort=title&page=1");
  assert.equal((await cps.json()).games[0].title, "Forgotten Worlds");
  for (const platform of platforms) assert.ok(platform.code, "Every Game Finder platform has a browse code");
  const detail = await worker.fetch(new Request("https://example.com/api/detail", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: 10, source: "rawg", platform: "pc", keywords: "browse overview" })
  }), env);
  assert.equal(detail.status, 200, "Catalog details remain available when the AI service is down");
  const details = await detail.json();
  assert.match(details.videoSearches[0].url, /youtube\.com/);
  assert.match(details.reviews[0].url, /rawg\.io/);
  console.log("Browse test passed: page, platform sources, sorting, cache, and detail fallback");
} finally {
  globalThis.fetch = originalFetch;
}
