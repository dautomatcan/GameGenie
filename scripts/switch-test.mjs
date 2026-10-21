import assert from "node:assert/strict";
import worker from "../dist/server/index.js";

const env = { GROQ_API_KEY: "test", RAWG_API_KEY: "test", IGDB_CLIENT_ID: "client", IGDB_CLIENT_SECRET: "secret" };
const originalFetch = globalThis.fetch;
let rawgCalls = 0;
const switchGame = { id: 101, name: "Switch Game", platforms: [130], cover: { image_id: "switchcover" },
  first_release_date: 1750000000, total_rating_count: 20, genres: [{ name: "Adventure" }] };
const switch2Game = { id: 102, name: "Switch 2 Exclusive", platforms: [508], cover: { image_id: "switch2cover" },
  first_release_date: 1750000000, total_rating_count: 20, genres: [{ name: "Action" }] };
globalThis.fetch = async (url, init) => {
  const address = String(url);
  if (address.includes("id.twitch.tv/oauth2/token")) return Response.json({ access_token: "test_token", expires_in: 3600 });
  if (address.includes("api.igdb.com/v4/games")) return Response.json([switchGame, switch2Game]);
  if (address.includes("api.igdb.com/v4/multiquery")) {
    assert.match(init.body, /platforms = \(130\)/);
    return Response.json([{ name: "g0", result: [switch2Game] }]);
  }
  if (address.includes("api.groq.com")) return Response.json({ choices: [{ message: { content: JSON.stringify({ games: [
    { title: "Switch 2 Exclusive", why: "A match for your keywords." }
  ] }) } }] });
  if (address.includes("api.rawg.io")) { rawgCalls++; throw new Error("Switch titles must not use RAWG's mixed platform tags."); }
  throw new Error("Unexpected external call: " + address);
};

try {
  const browse = (platform) => worker.fetch(new Request("https://example.com/api/browse?platform=" + platform), env);
  const switchResults = await (await browse("switch")).json();
  assert.deepEqual(switchResults.games.map((game) => game.title), ["Switch Game"]);
  assert.equal(switchResults.source, "igdb");
  const switch2Results = await (await browse("switch2")).json();
  assert.deepEqual(switch2Results.games.map((game) => game.title), ["Switch 2 Exclusive"]);
  const recommendation = await worker.fetch(new Request("https://example.com/api/recommend", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ platform: "switch", keywords: "action adventure" })
  }), env);
  assert.equal(recommendation.status, 404, "A Switch 2-only game must not become a Switch recommendation");
  assert.equal(rawgCalls, 0);
  console.log("Switch test passed: separate Switch and Switch 2 catalogues and strict recommendation verification");
} finally {
  globalThis.fetch = originalFetch;
}
