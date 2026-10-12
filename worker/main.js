const MODEL = "openai/gpt-oss-120b";
const PLATFORMS = {
  pc: ["PC", /^pc$/i], ps5: ["PlayStation 5", /playstation 5/i],
  ps4: ["PlayStation 4", /playstation 4/i], ps3: ["PlayStation 3", /playstation 3/i],
  ps2: ["PlayStation 2", /playstation 2/i], ps1: ["PlayStation 1", /^(playstation|playstation 1)$/i],
  xbox: ["Xbox family", /^xbox/i], switch2: ["Nintendo Switch 2", /nintendo switch 2/i],
  switch: ["Nintendo Switch", /^nintendo switch$/i], wiiu: ["Wii U", /wii u/i],
  wii: ["Wii", /^wii$/i], gamecube: ["GameCube", /gamecube/i],
  nds: ["Nintendo DS", /^nintendo ds$/i], "3ds": ["Nintendo 3DS", /nintendo 3ds/i],
  gba: ["Game Boy Advance", /game boy advance/i], gbc: ["Game Boy Color", /game boy color/i],
  gb: ["Game Boy", /^game boy$/i], cps3: ["Capcom CPS-3", /arcade/i],
  cps2: ["Capcom CPS-2", /arcade/i], cps1: ["Capcom CPS-1", /arcade/i]
};
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const fail = (message, status = 400) => reply({ error: message }, status);
const clean = (value, max = 240) => String(value || "").replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, max);
const norm = (value) => String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
const key = (value) => typeof value === "string" && value.length < 300 && /^[A-Za-z0-9_.-]+$/.test(value) ? value : "";
const names = (game) => (game.platforms || []).map((entry) => entry.platform?.name).filter(Boolean);
const onPlatform = (game, code) => names(game).some((name) => PLATFORMS[code][1].test(name));
const rare = (code) => code === "switch2" || code.startsWith("cps");
const rawgPage = (game) => "https://rawg.io/games/" + encodeURIComponent(game.slug || "");
async function rawg(path, apiKey, params = {}) {
  const url = new URL("https://api.rawg.io/api" + path);
  url.searchParams.set("key", apiKey);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));
  const result = await fetch(url, { headers: { accept: "application/json" } });
  if (!result.ok) throw new Error(result.status === 401 || result.status === 403 ? "RAWG rejected the API key." : "RAWG is unavailable (" + result.status + ").");
  return result.json();
}
async function groq(messages, apiKey, maxTokens) {
  const result = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", headers: { authorization: "Bearer " + apiKey, "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.5, max_tokens: maxTokens, response_format: { type: "json_object" }, reasoning_effort: "low" })
  });
  const data = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(result.status === 401 ? "Groq rejected the API key." : result.status === 429 ? "Groq's free tier is busy. Try again shortly." : data.error?.message || "The AI service is unavailable.");
  try { return JSON.parse(data.choices[0].message.content); }
  catch { throw new Error("The AI returned an unexpected response. Try again."); }
}
async function recommend(body, env) {
  const platform = PLATFORMS[body.platform], keywords = clean(body.keywords, 300);
  if (!platform || keywords.length < 3) return fail("Choose a platform and enter at least three characters.");
  const groqKey = key(env.GROQ_API_KEY || body.groqKey), rawgKey = key(env.RAWG_API_KEY || body.rawgKey);
  if (!groqKey || !rawgKey) return fail("Add your free Groq and RAWG API keys in Settings.", 401);
  const plan = await groq([
    { role: "system", content: "Recommend real video games. Return JSON only: {\"games\":[{\"title\":\"exact released game title\",\"why\":\"one sentence matching the keywords\"}]}. Choose 9 diverse released games known to be playable on the requested hardware. For Capcom CPS boards choose games that ran specifically on the named CPS revision, not home ports. Never invent titles. No markdown." },
    { role: "user", content: "Platform: " + platform[0] + ". Desired keywords: " + keywords }
  ], groqKey, 1250);
  const suggestions = Array.isArray(plan.games) ? plan.games.slice(0, 9).filter((entry) => typeof entry?.title === "string") : [];
  if (!suggestions.length) return fail("The AI couldn't find titles. Try different keywords.", 502);
  const found = await Promise.all(suggestions.map(async (entry) => {
    const title = clean(entry.title, 100);
    try {
      const result = await rawg("/games", rawgKey, { search: title, page_size: 8, search_precise: true });
      const exact = (result.results || []).filter((game) => norm(game.name) === norm(title));
      const game = exact.find((candidate) => onPlatform(candidate, body.platform)) || (rare(body.platform) ? exact[0] : null);
      if (!game) return null;
      const verified = onPlatform(game, body.platform) && !body.platform.startsWith("cps");
      return { id: game.id, title: game.name, year: game.released?.slice(0, 4) || "—",
        image: game.background_image || null, rating: game.rating ? Number(game.rating).toFixed(1) : null,
        genres: (game.genres || []).slice(0, 2).map((genre) => genre.name),
        reason: clean(entry.why, 220), verified, note: verified ? null : "Exact platform release needs confirmation." };
    } catch { return null; }
  }));
  const seen = new Set();
  const games = found.filter((game) => { if (!game || seen.has(game.id)) return false; seen.add(game.id); return true; }).slice(0, 6);
  if (!games.length) return fail("No catalog matches were found for that platform. Try broader keywords.", 404);
  return reply({ games, platform: platform[0], keywords, model: MODEL });
}
async function detail(body, env) {
  const id = Number(body.id), platform = PLATFORMS[body.platform];
  if (!Number.isSafeInteger(id) || id < 1 || !platform) return fail("Invalid game selection.");
  const groqKey = key(env.GROQ_API_KEY || body.groqKey), rawgKey = key(env.RAWG_API_KEY || body.rawgKey);
  if (!groqKey || !rawgKey) return fail("Add your API keys in Settings.", 401);
  const [game, movies] = await Promise.all([
    rawg("/games/" + id, rawgKey), rawg("/games/" + id + "/movies", rawgKey).catch(() => ({ results: [] }))
  ]);
  const verified = onPlatform(game, body.platform) && !body.platform.startsWith("cps");
  if (!verified && !rare(body.platform)) return fail("This game is not listed for the selected platform.", 404);
  const synopsis = clean((game.description_raw || "").replace(/\s+/g, " "), 900);
  const insight = await groq([
    { role: "system", content: "Return JSON only with fit, expect, videoQueries. fit: two short sentences explaining keyword match. expect: one honest sentence about gameplay. videoQueries: two YouTube search phrases, one for gameplay and one for reviews, with the exact title and platform. Use only supplied facts. Do not invent specific videos or URLs. No markdown." },
    { role: "user", content: JSON.stringify({ title: game.name, platform: platform[0], keywords: clean(body.keywords, 300), genres: (game.genres || []).map((genre) => genre.name), released: game.released, synopsis }) }
  ], groqKey, 450);
  const videos = (movies.results || []).slice(0, 2).map((movie) => ({
    label: clean(movie.name, 90), url: movie.data?.max || movie.data?.["480"] || ""
  })).filter((item) => /^https:\/\//.test(item.url));
  const queries = Array.isArray(insight.videoQueries) ? insight.videoQueries.slice(0, 2).map((query) => clean(query, 160)) : [];
  const reviews = [{ label: "RAWG community reviews", url: rawgPage(game) }];
  if (/^https:\/\//.test(game.metacritic_url || "")) reviews.push({ label: "Metacritic reviews", url: game.metacritic_url });
  return reply({ title: game.name, image: game.background_image || null, released: game.released || null,
    genres: (game.genres || []).slice(0, 3).map((genre) => genre.name), fit: clean(insight.fit, 500),
    expect: clean(insight.expect, 250), synopsis, videos,
    videoSearches: queries.map((query) => ({ label: query, url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(query) })),
    reviews, verified, note: verified ? null : "RAWG does not confirm this exact platform or CPS board. Check compatibility before playing." });
}
const page = __PAGE__, css = __CSS__, client = __CLIENT__;
export default { async fetch(request, env) {
  const path = new URL(request.url).pathname;
  if (request.method === "GET" && path === "/") return new Response(page, { headers: { "content-type": "text/html; charset=utf-8" } });
  if (request.method === "GET" && path === "/styles.css") return new Response(css, { headers: { "content-type": "text/css; charset=utf-8" } });
  if (request.method === "GET" && path === "/app.js") return new Response(client, { headers: { "content-type": "text/javascript; charset=utf-8" } });
  if (request.method === "POST" && (path === "/api/recommend" || path === "/api/detail")) {
    let body; try { body = await request.json(); } catch { return fail("Invalid request body."); }
    if (!body || typeof body !== "object") return fail("Invalid request body.");
    try { return path === "/api/recommend" ? await recommend(body, env) : await detail(body, env); }
    catch (cause) { return fail(cause.message || "Unexpected server error.", 502); }
  }
  return new Response("Not found", { status: 404 });
} };
