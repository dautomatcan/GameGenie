import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import worker from "../dist/server/index.js";
import recommendFunction from "../api/recommend.js";
import detailFunction from "../api/detail.js";

const platforms = JSON.parse(await readFile(new URL("../data/platforms.json", import.meta.url), "utf8"));
const screenshotSystems = "atari2600 atari5200 nes mastersystem atari7800 tg16 genesis tgcd snes cdi segacd jaguar sega32x saturn ps1 jaguarcd n64 dreamcast ps2 gamecube xboxog xbox360 ps3 wii wiiu gb lynx gamegear virtualboy gbc gba nds psp 3ds".split(" ");
for (const code of screenshotSystems) assert.ok(platforms.some((platform) => platform.code === code), "Missing screenshot platform: " + code);
assert.equal(new Set(platforms.map((platform) => platform.code)).size, platforms.length);
assert.ok(platforms.every((platform) => platform.verification !== "store"), "Store or digital variant included as a system");
assert.equal(platforms.filter((platform) => platform.igdbId).length, platforms.length - 3);
assert.deepEqual(platforms.filter((platform) => !platform.igdbId).map((platform) => platform.code).sort(), ["cps1", "cps2", "cps3"]);
const expectedGroups = {
  "PC and Mobile": "pc android ios",
  PlayStation: "ps5 ps4 ps3 ps2 ps1 psp",
  Nintendo: "switch2 switch nes snes n64 gamecube wii wiiu gb virtualboy gbc gba nds 3ds",
  Xbox: "xboxseries xboxone xboxog xbox360",
  Retro: "mastersystem tg16 genesis tgcd segacd sega32x saturn dreamcast atari2600 atari5200 atari7800 cdi jaguar jaguarcd lynx gamegear cps3 cps2 cps1"
};
for (const [group, codes] of Object.entries(expectedGroups)) {
  assert.deepEqual(
    platforms.filter((platform) => platform.group === group).map((platform) => platform.code).sort(),
    codes.split(" ").sort(),
    "Incorrect systems in " + group + " box"
  );
}

const game = {
  id: 42, name: "Stardew Valley", slug: "stardew-valley",
  released: "2016-02-26", background_image: "https://media.rawg.io/example.jpg",
  rating: 4.4, genres: [{ name: "Simulation" }],
  platforms: [{ platform: { id: 4, name: "PC" } }],
  description_raw: "Grow crops, meet neighbors, and explore a valley.",
  metacritic_url: "https://www.metacritic.com/game/stardew-valley/"
};
const sonic = { ...game, id: 4438, name: "Sonic the Hedgehog 2", slug: "sonic-the-hedgehog-2",
  background_image: "https://media.rawg.io/sonic.jpg", platforms: [], metacritic_url: null };
const igdbSonic = { id: 4438, name: "Sonic the Hedgehog 2", platforms: [29],
  cover: { image_id: "cover123" }, screenshots: [{ image_id: "shot123" }],
  genres: [{ name: "Platform" }], first_release_date: 725846400,
  release_dates: [{ platform: 29, date: 725846400 }], rating: 82,
  summary: "Sonic runs through colorful zones.", url: "https://www.igdb.com/games/sonic-the-hedgehog-2",
  videos: [{ name: "Gameplay video", video_id: "abcdefghijk" }] };
const screenshotImage = "https://media.rawg.io/screenshot.jpg";
let missingImage = false;
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  const address = String(url);
  if (address.includes("api.groq.com")) {
    const payload = JSON.parse(init.body);
    const genesis = JSON.stringify(payload.messages).includes("Platform: Genesis");
    const instruction = payload.messages[0].content;
    const recommending = instruction.startsWith("Recommend real video games.");
    const vietnamese = instruction.includes("natural Vietnamese");
    const content = recommending
      ? JSON.stringify(payload.messages).includes("Desired keywords: variety")
        ? { games: Array.from({ length: 18 }, (_, index) => ({ title: "Mock Game " + (index + 1), why: "A colorful match." })) }
        : { games: [{ title: genesis ? "Sonic the Hedgehog 2" : "Stardew Valley", why: vietnamese ? "Nhịp chơi nhẹ nhàng và đầy màu sắc." : "Colorful play with a gentle pace." }] }
      : { fit: vietnamese ? "Nhịp sống trong game hợp với gu của bạn." : "The quiet farming rhythm fits your request.",
        expect: vietnamese ? "Trồng cây và kết bạn với hàng xóm." : "Plant crops and build relationships.",
        videoQueries: ["Stardew Valley PC gameplay", "Stardew Valley PC review"] };
    return Response.json({ choices: [{ message: { content: JSON.stringify(content) } }] });
  }
  if (address.includes("id.twitch.tv/oauth2/token")) return Response.json({ access_token: "token_test", expires_in: 3600 });
  if (address.includes("api.igdb.com/v4/multiquery")) {
    assert.match(init.body, /platforms = \(29\)/);
    assert.match(init.body, /name ~ "Sonic the Hedgehog 2"/);
    return Response.json([{ name: "g0", result: [igdbSonic] }]);
  }
  if (address.includes("api.igdb.com/v4/games")) return Response.json([igdbSonic]);
  if (address.includes("/movies")) return Response.json({ results: [] });
  if (address.includes("/games/42/screenshots")) return Response.json({ results: [{ image: screenshotImage }] });
  if (address.includes("/games/42")) return Response.json({ ...game, background_image: missingImage ? null : game.background_image });
  if (address.includes("/games?")) {
    const requested = new URL(address).searchParams.get("search") || "";
    if (/^Mock Game \d+$/.test(requested)) {
      const number = Number(requested.slice(10));
      return Response.json({ results: [{ ...game, id: 1000 + number, name: requested, slug: "mock-game-" + number }] });
    }
    return Response.json({ results: requested.includes("Sonic") ? [sonic] : [{ ...game, background_image: missingImage ? null : game.background_image }] });
  }
  throw new Error("Unexpected external call: " + address);
};
try {
  const publicScript = await readFile(new URL("../dist/public/app.js", import.meta.url), "utf8");
  assert.doesNotMatch(publicScript, /__PLATFORMS__/);
  assert.match(publicScript, /^const platforms = \[/);
  const vercelRequest = (path) => new Request("https://example.com" + path, {
    method: "POST", headers: { "content-type": "application/json" }, body: "{}"
  });
  assert.equal((await recommendFunction.fetch(vercelRequest("/api/recommend"))).status, 400);
  assert.equal((await detailFunction.fetch(vercelRequest("/api/detail"))).status, 400);
  const homepage = await worker.fetch(new Request("https://example.com/"), {});
  assert.equal(homepage.status, 200);
  const html = await homepage.text();
  assert.match(html, /GAMEGENIE/);
  assert.equal((html.match(/data-lang="en"/g) || []).length, 2);
  assert.equal((html.match(/data-lang="vi"/g) || []).length, 2);
  assert.doesNotMatch(html, /API settings|Groq API key/);
  const css = await worker.fetch(new Request("https://example.com/styles.css"), {});
  assert.equal(css.status, 200);
  const js = await worker.fetch(new Request("https://example.com/app.js"), {});
  assert.equal(js.status, 200);
  const appScript = await js.text();
  assert.doesNotMatch(appScript, /localStorage|go-groq|go-rawg/);
  const request = (path, body, env = {}) => worker.fetch(new Request("https://example.com" + path, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
  }), env);
  const missing = await request("/api/recommend", { platform: "pc", keywords: "cozy farming", groqKey: "ignored", rawgKey: "ignored" });
  assert.equal(missing.status, 503);
  const crossSite = await worker.fetch(new Request("https://example.com/api/recommend", {
    method: "POST", headers: { "content-type": "application/json", origin: "https://other.example" },
    body: JSON.stringify({ platform: "pc", keywords: "cozy farming" })
  }), { GROQ_API_KEY: "test", RAWG_API_KEY: "test" });
  assert.equal(crossSite.status, 403);
  const env = { GROQ_API_KEY: "test", RAWG_API_KEY: "test" };
  const result = await request("/api/recommend", { platform: "pc", keywords: "cozy farming" }, env);
  assert.equal(result.status, 200);
  const recommendations = await result.json();
  assert.equal(recommendations.games[0].title, "Stardew Valley");
  assert.equal(recommendations.games[0].verified, true);
  assert.equal(recommendations.games[0].image, game.background_image);
  const firstVariety = await request("/api/recommend", { platform: "pc", keywords: "variety" }, env);
  assert.equal(firstVariety.status, 200);
  const firstNine = (await firstVariety.json()).games;
  assert.equal(firstNine.length, 9);
  assert.equal(new Set(firstNine.map((item) => item.title)).size, 9);
  const secondVariety = await request("/api/recommend", { platform: "pc", keywords: "variety", excludeTitles: firstNine.map((item) => item.title) }, env);
  assert.equal(secondVariety.status, 200);
  const secondNine = (await secondVariety.json()).games;
  assert.equal(secondNine.length, 9);
  assert.ok(secondNine.every((item) => !firstNine.some((previous) => previous.title === item.title)));
  const vietnameseResult = await request("/api/recommend", { platform: "pc", keywords: "phiêu lưu nhẹ nhàng", language: "vi" }, env);
  assert.equal(vietnameseResult.status, 200);
  const vietnamesePicks = await vietnameseResult.json();
  assert.equal(vietnamesePicks.language, "vi");
  assert.match(vietnamesePicks.games[0].reason, /Nhịp chơi nhẹ nhàng/);
  const detail = await request("/api/detail", { id: 42, platform: "pc", keywords: "cozy farming" }, env);
  assert.equal(detail.status, 200);
  const details = await detail.json();
  assert.equal(details.reviews.length, 2);
  assert.match(details.videoSearches[0].url, /youtube\.com/);
  const vietnameseDetail = await request("/api/detail", { id: 42, platform: "pc", keywords: "phiêu lưu nhẹ nhàng", language: "vi" }, env);
  assert.equal(vietnameseDetail.status, 200);
  assert.match((await vietnameseDetail.json()).fit, /Nhịp sống/);
  missingImage = true;
  const screenshotFallback = await request("/api/recommend", { platform: "pc", keywords: "cozy farming" }, env);
  assert.equal(screenshotFallback.status, 200);
  assert.equal((await screenshotFallback.json()).games[0].image, screenshotImage);
  const rareSystem = await request("/api/recommend", { platform: "genesis", keywords: "cozy farming" }, env);
  assert.equal(rareSystem.status, 200);
  assert.equal((await rareSystem.json()).games[0].verified, false);
  const igdbEnv = { ...env, IGDB_CLIENT_ID: "client", IGDB_CLIENT_SECRET: "secret" };
  const igdbResult = await request("/api/recommend", { platform: "genesis", keywords: "colorful platforming" }, igdbEnv);
  assert.equal(igdbResult.status, 200);
  const igdbPicks = await igdbResult.json();
  assert.equal(igdbPicks.games[0].source, "igdb");
  assert.equal(igdbPicks.games[0].verified, true);
  assert.match(igdbPicks.games[0].image, /^https:\/\/images\.igdb\.com\//);
  const igdbDetail = await request("/api/detail", { id: 4438, source: "igdb", platform: "genesis", keywords: "colorful platforming" }, igdbEnv);
  assert.equal(igdbDetail.status, 200);
  const igdbDetails = await igdbDetail.json();
  assert.equal(igdbDetails.verified, true);
  assert.equal(igdbDetails.videos.length, 1);
  assert.equal(igdbDetails.reviews.length, 2);
  const oversized = await worker.fetch(new Request("https://example.com/api/recommend", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ keywords: "a".repeat(5000), platform: "pc" })
  }), env);
  assert.equal(oversized.status, 413);
  let limited;
  for (let attempt = 0; attempt < 13; attempt += 1) {
    limited = await worker.fetch(new Request("https://example.com/api/recommend", {
      method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.10" },
      body: "{}"
    }), env);
  }
  assert.equal(limited.status, 429);
  console.log("Smoke test passed: homepage, assets, server-only keys, RAWG and IGDB recommendations, links, size and rate guards");
} finally {
  globalThis.fetch = originalFetch;
}
