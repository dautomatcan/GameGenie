import assert from "node:assert/strict";
import worker from "../dist/server/index.js";

const game = {
  id: 42, name: "Stardew Valley", slug: "stardew-valley",
  released: "2016-02-26", background_image: "https://media.rawg.io/example.jpg",
  rating: 4.4, genres: [{ name: "Simulation" }],
  platforms: [{ platform: { name: "PC" } }],
  description_raw: "Grow crops, meet neighbors, and explore a valley.",
  metacritic_url: "https://www.metacritic.com/game/stardew-valley/"
};
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const address = String(url);
  if (address.includes("api.groq.com")) {
    const payload = JSON.parse(init.body);
    const content = payload.max_tokens > 500
      ? { games: [{ title: "Stardew Valley", why: "Cozy farming with a gentle pace." }] }
      : { fit: "The quiet farming rhythm fits your request.", expect: "Plant crops and build relationships.", videoQueries: ["Stardew Valley PC gameplay", "Stardew Valley PC review"] };
    return Response.json({ choices: [{ message: { content: JSON.stringify(content) } }] });
  }
  if (address.includes("/movies")) return Response.json({ results: [] });
  if (address.includes("/games/42")) return Response.json(game);
  if (address.includes("/games?")) return Response.json({ results: [game] });
  throw new Error("Unexpected external call: " + address);
};
try {
  const homepage = await worker.fetch(new Request("https://example.com/"), {});
  assert.equal(homepage.status, 200);
  assert.match(await homepage.text(), /GAME ORBIT/);
  const css = await worker.fetch(new Request("https://example.com/styles.css"), {});
  assert.equal(css.status, 200);
  const js = await worker.fetch(new Request("https://example.com/app.js"), {});
  assert.equal(js.status, 200);
  const request = (path, body) => worker.fetch(new Request("https://example.com" + path, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
  }), {});
  const missing = await request("/api/recommend", { platform: "pc", keywords: "cozy farming" });
  assert.equal(missing.status, 401);
  const auth = { groqKey: "test", rawgKey: "test" };
  const result = await request("/api/recommend", { ...auth, platform: "pc", keywords: "cozy farming" });
  assert.equal(result.status, 200);
  const recommendations = await result.json();
  assert.equal(recommendations.games[0].title, "Stardew Valley");
  assert.equal(recommendations.games[0].verified, true);
  assert.equal(recommendations.games[0].image, game.background_image);
  const detail = await request("/api/detail", { ...auth, id: 42, platform: "pc", keywords: "cozy farming" });
  assert.equal(detail.status, 200);
  const details = await detail.json();
  assert.equal(details.reviews.length, 2);
  assert.match(details.videoSearches[0].url, /youtube\.com/);
  console.log("Smoke test passed: homepage, assets, key guard, recommendations, artwork, video and review links");
} finally {
  globalThis.fetch = originalFetch;
}
