const MODEL = "openai/gpt-oss-120b";
const MAX_RESULTS = 9;
const MAX_SUGGESTIONS = 18;
const PLATFORM_LIST = __PLATFORMS__;
const PLATFORMS = Object.fromEntries(PLATFORM_LIST.map((platform) => [platform.code, platform]));
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const fail = (message, status = 400) => reply({ error: message }, status);
const clean = (value, max = 240) => String(value || "").replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, max);
const norm = (value) => String(value || "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, " ").trim();
const titleKey = (value) => String(value || "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const key = (value) => typeof value === "string" && value.length < 300 && /^[A-Za-z0-9_.-]+$/.test(value) ? value : "";
const onPlatform = (game, platform) => (game.platforms || []).some((entry) => platform.rawgIds.includes(entry.platform?.id));
const verifiedFor = (game, platform) => platform.verification === "hardware" && onPlatform(game, platform);
const mayUseUnlisted = (game, platform) => platform.verification === "unlisted" || !(game.platforms || []).length;
const responseLanguage = (body) => body.language === "vi" ? "vi" : "en";
const platformNote = (language) => language === "vi"
  ? "Chưa xác nhận được bản phát hành cho đúng hệ máy này. Hãy kiểm tra khả năng tương thích trước khi chơi."
  : "This exact platform release could not be confirmed. Check compatibility before playing.";
const rawgPage = (game) => "https://rawg.io/games/" + encodeURIComponent(game.slug || "");
const localRateWindows = new Map();
async function guardApi(request, env, path) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return fail("Cross-site requests are not allowed.", 403);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") return fail("Send JSON requests.", 415);
  if (Number(request.headers.get("content-length") || 0) > 4096) return fail("Request is too large.", 413);
  const actor = request.headers.get("cf-connecting-ip") || "local";
  if (env.AI_RATE_LIMITER?.limit) {
    const { success } = await env.AI_RATE_LIMITER.limit({ key: path + ":" + actor });
    if (!success) return fail("Too many requests. Please wait a minute.", 429);
  } else {
    const now = Date.now(), id = path + ":" + actor;
    const current = localRateWindows.get(id);
    const window = current && current.reset > now ? current : { count: 0, reset: now + 60_000 };
    window.count += 1;
    localRateWindows.set(id, window);
    if (localRateWindows.size > 1000) {
      for (const [item, value] of localRateWindows) if (value.reset <= now) localRateWindows.delete(item);
    }
    if (window.count > 12) return fail("Too many requests. Please wait a minute.", 429);
  }
  return null;
}
async function readJsonBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Invalid request body.");
  const decoder = new TextDecoder();
  let bytes = 0, text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 4096) {
      await reader.cancel();
      throw new Error("Request is too large.");
    }
    text += decoder.decode(value, { stream: true });
  }
  return JSON.parse(text + decoder.decode());
}
async function rawg(path, apiKey, params = {}) {
  const url = new URL("https://api.rawg.io/api" + path);
  url.searchParams.set("key", apiKey);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, String(value));
  const result = await fetch(url, { headers: { accept: "application/json" } });
  if (!result.ok) throw new Error(result.status === 401 || result.status === 403 ? "RAWG rejected the API key." : "RAWG is unavailable (" + result.status + ").");
  return result.json();
}
function imageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "media.rawg.io" ? url.href : null;
  } catch { return null; }
}
async function artwork(game, apiKey) {
  const cover = imageUrl(game.background_image) || imageUrl(game.background_image_additional);
  if (cover) return cover;
  try {
    const screenshots = await rawg("/games/" + game.id + "/screenshots", apiKey, { page_size: 5 });
    return (screenshots.results || []).map((shot) => imageUrl(shot.image)).find(Boolean) || null;
  } catch { return null; }
}
let igdbTokenCache = null, igdbTokenPending = null;
async function igdbToken(env) {
  const clientId = key(env.IGDB_CLIENT_ID), clientSecret = key(env.IGDB_CLIENT_SECRET);
  if (!clientId || !clientSecret) throw new Error("IGDB is not configured.");
  if (igdbTokenCache?.clientId === clientId && igdbTokenCache.expires > Date.now()) return igdbTokenCache.token;
  if (igdbTokenPending?.clientId === clientId) return igdbTokenPending.promise;
  const promise = (async () => {
    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" })
    });
    if (!response.ok) throw new Error("IGDB authentication failed.");
    const data = await response.json();
    if (!key(data.access_token)) throw new Error("IGDB authentication failed.");
    igdbTokenCache = { clientId, token: data.access_token, expires: Date.now() + Math.max(0, Number(data.expires_in || 0) - 60) * 1000 };
    return data.access_token;
  })();
  igdbTokenPending = { clientId, promise };
  try { return await promise; }
  finally { if (igdbTokenPending?.promise === promise) igdbTokenPending = null; }
}
async function igdb(endpoint, query, env, retry = true) {
  const token = await igdbToken(env);
  const response = await fetch("https://api.igdb.com/v4/" + endpoint, {
    method: "POST", headers: { "Client-ID": key(env.IGDB_CLIENT_ID), authorization: "Bearer " + token,
      accept: "application/json", "content-type": "text/plain" }, body: query
  });
  if (response.status === 401 && retry) { igdbTokenCache = null; return igdb(endpoint, query, env, false); }
  if (!response.ok) throw new Error("IGDB is unavailable (" + response.status + ").");
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error("IGDB returned an unexpected response.");
  return data;
}
function igdbImage(game) {
  const imageId = game.screenshots?.find((shot) => /^[a-z0-9]+$/i.test(shot.image_id || ""))?.image_id || game.cover?.image_id;
  return /^[a-z0-9]+$/i.test(imageId || "") ? "https://images.igdb.com/igdb/image/upload/t_screenshot_med_2x/" + imageId + ".jpg" : null;
}
function igdbDate(game, platformId) {
  const dates = (game.release_dates || []).filter((release) => release.platform === platformId && Number.isFinite(release.date)).map((release) => release.date);
  const value = dates.length ? Math.min(...dates) : game.first_release_date;
  return Number.isFinite(value) ? new Date(value * 1000).toISOString().slice(0, 10) : null;
}
function igdbGamePage(game) {
  try {
    const url = new URL(game.url);
    return url.protocol === "https:" && ["www.igdb.com", "igdb.com"].includes(url.hostname) ? url.href : null;
  } catch { return null; }
}
async function igdbSuggestions(suggestions, platform, env) {
  const entries = suggestions.slice(0, MAX_SUGGESTIONS).map((entry) => ({ title: clean(entry.title, 100), reason: clean(entry.why, 220) }));
  const fields = "id,name,platforms,cover.image_id,screenshots.image_id,genres.name,first_release_date,release_dates.platform,release_dates.date,rating,summary,url";
  const found = [], seen = new Set();
  for (let start = 0; start < entries.length && found.length < MAX_RESULTS; start += 10) {
    const batch = entries.slice(start, start + 10);
    const query = batch.map((entry, index) => {
      const title = entry.title.replace(/["\\;{}]/g, " ").replace(/\s+/g, " ").trim();
      return `query games "g${start + index}" { fields ${fields}; where name ~ ${JSON.stringify(title)} & platforms = (${platform.igdbId}); limit 15; };`;
    }).join("\n");
    const results = await igdb("multiquery", query, env);
    const groups = new Map(results.map((result) => [result.name, result.result || []]));
    batch.forEach((entry, index) => {
      const matches = groups.get("g" + (start + index)) || [];
      const game = matches.find((candidate) => norm(candidate.name) === norm(entry.title) && candidate.platforms?.includes(platform.igdbId) && igdbImage(candidate));
      if (!game || seen.has(titleKey(game.name)) || found.length >= MAX_RESULTS) return;
      seen.add(titleKey(game.name));
      const released = igdbDate(game, platform.igdbId);
      found.push({ id: game.id, source: "igdb", title: game.name, year: released?.slice(0, 4) || "—",
        image: igdbImage(game), rating: game.rating ? (Number(game.rating) / 20).toFixed(1) : null,
        genres: (game.genres || []).slice(0, 2).map((genre) => genre.name), reason: entry.reason,
        verified: true, note: null });
    });
  }
  return found;
}
async function groq(messages, apiKey, maxTokens) {
  const result = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST", headers: { authorization: "Bearer " + apiKey, "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.5, max_tokens: maxTokens, response_format: { type: "json_object" }, reasoning_effort: "low" })
  });
  const data = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(result.status === 401 ? "The AI service is not configured correctly." : result.status === 429 ? "The AI service is busy. Try again shortly." : "The AI service is unavailable.");
  try { return JSON.parse(data.choices[0].message.content); }
  catch { throw new Error("The AI returned an unexpected response. Try again."); }
}
async function rawgSuggestions(suggestions, platform, rawgKey, language, blockedTitles = new Set()) {
  const found = await Promise.all(suggestions.map(async (entry) => {
    const title = clean(entry.title, 100);
    try {
      const result = await rawg("/games", rawgKey, { search: title, page_size: 8, search_precise: true });
      const exact = (result.results || []).filter((game) => norm(game.name) === norm(title));
      const game = exact.find((candidate) => onPlatform(candidate, platform)) || exact.find((candidate) => mayUseUnlisted(candidate, platform));
      if (!game) return null;
      const image = await artwork(game, rawgKey);
      if (!image) return null;
      const verified = verifiedFor(game, platform);
      return { id: game.id, source: "rawg", title: game.name, year: game.released?.slice(0, 4) || "—",
        image, rating: game.rating ? Number(game.rating).toFixed(1) : null,
        genres: (game.genres || []).slice(0, 2).map((genre) => genre.name),
        reason: clean(entry.why, 220), verified, note: verified ? null : platformNote(language) };
    } catch { return null; }
  }));
  const seen = new Set(blockedTitles);
  return found.filter((game) => { if (!game || seen.has(titleKey(game.title))) return false; seen.add(titleKey(game.title)); return true; }).slice(0, MAX_RESULTS);
}
async function recommend(body, env) {
  const platform = PLATFORMS[body.platform], keywords = clean(body.keywords, 300), language = responseLanguage(body);
  if (!platform || keywords.length < 3) return fail("Choose a platform and enter at least three characters.");
  if (body.excludeTitles !== undefined && (!Array.isArray(body.excludeTitles) || body.excludeTitles.length > 80)) return fail("Invalid excluded games.");
  const excludedTitles = (body.excludeTitles || []).filter((title) => typeof title === "string").map((title) => clean(title, 100)).filter(Boolean);
  const excluded = new Set(excludedTitles.map(titleKey));
  const groqKey = key(env.GROQ_API_KEY), rawgKey = key(env.RAWG_API_KEY);
  if (!groqKey || !rawgKey) return fail("Recommendations are temporarily unavailable.", 503);
  const plan = await groq([
    { role: "system", content: "Recommend real video games. Return JSON only: {\"games\":[{\"title\":\"exact released game title\",\"why\":\"one sentence matching the keywords\"}]}. Choose 18 diverse released games known to be playable on the named platform, with no repeated titles and none from the excluded titles. Use the exact title of the platform release. For hardware expansions, choose games released for that specific expansion. For Capcom CPS boards choose games that ran specifically on the named CPS revision, not home ports. Never invent titles. Keep game titles in their official spelling and do not translate them. " + (language === "vi" ? "Write every why sentence in natural Vietnamese, even if the keywords are in English." : "Write every why sentence in English, even if the keywords are in Vietnamese.") + " No markdown." },
    { role: "user", content: "Platform: " + platform.label + (platform.year ? " (introduced " + platform.year + ")" : "") + ". Desired keywords: " + keywords + ". Excluded titles: " + JSON.stringify(excludedTitles) }
  ], groqKey, 2600);
  const suggestionKeys = new Set();
  const suggestions = Array.isArray(plan.games) ? plan.games.slice(0, MAX_SUGGESTIONS).filter((entry) => {
    if (typeof entry?.title !== "string") return false;
    const title = titleKey(entry.title);
    if (!title || excluded.has(title) || suggestionKeys.has(title)) return false;
    suggestionKeys.add(title);
    return true;
  }) : [];
  if (!suggestions.length) return fail(excluded.size ? "No fresh games were found for this search. Try different keywords." : "The AI couldn't find titles. Try different keywords.", excluded.size ? 404 : 502);
  let games = [];
  if (platform.igdbId && key(env.IGDB_CLIENT_ID) && key(env.IGDB_CLIENT_SECRET)) {
    try {
      games = await igdbSuggestions(suggestions, platform, env);
    } catch { /* RAWG remains available when IGDB is temporarily unavailable. */ }
  }
  if (games.length < MAX_RESULTS) {
    const blocked = new Set([...excluded, ...games.map((game) => titleKey(game.title))]);
    const remaining = suggestions.filter((entry) => !blocked.has(titleKey(entry.title)));
    games.push(...await rawgSuggestions(remaining, platform, rawgKey, language, blocked));
  }
  games = games.slice(0, MAX_RESULTS);
  if (!games.length) return fail(excluded.size ? "No fresh games were found for this search. Try different keywords." : "No catalog matches with artwork were found for that platform. Try broader keywords.", 404);
  return reply({ games, platform: platform.label, keywords, language, model: MODEL });
}
async function igdbDetail(body, env) {
  const id = Number(body.id), platform = PLATFORMS[body.platform], language = responseLanguage(body);
  if (!Number.isSafeInteger(id) || id < 1 || !platform?.igdbId) return fail("Invalid game selection.");
  const groqKey = key(env.GROQ_API_KEY);
  if (!groqKey) return fail("Recommendations are temporarily unavailable.", 503);
  const fields = "id,name,platforms,cover.image_id,screenshots.image_id,genres.name,first_release_date,release_dates.platform,release_dates.date,summary,url,videos.name,videos.video_id";
  const matches = await igdb("games", `fields ${fields}; where id = ${id} & platforms = (${platform.igdbId}); limit 1;`, env);
  const game = matches.find((candidate) => candidate.id === id && candidate.platforms?.includes(platform.igdbId));
  if (!game) return fail("This game is not listed for the selected platform.", 404);
  const synopsis = clean((game.summary || "").replace(/\s+/g, " "), 900);
  const released = igdbDate(game, platform.igdbId);
  const [insight, rawgMatch] = await Promise.all([
    groq([
      { role: "system", content: "Return JSON only with fit, expect, videoQueries. fit: two short sentences explaining keyword match. expect: one honest sentence about gameplay. videoQueries: two YouTube search phrases, one for gameplay and one for reviews, with the exact title and platform. Use only supplied facts. Do not invent specific videos or URLs. " + (language === "vi" ? "Write fit and expect in natural Vietnamese. Keep official game titles unchanged. Use English search phrases in videoQueries for better YouTube coverage." : "Write fit and expect in English. Use English search phrases in videoQueries.") + " No markdown." },
      { role: "user", content: JSON.stringify({ title: game.name, platform: platform.label, keywords: clean(body.keywords, 300), genres: (game.genres || []).map((genre) => genre.name), released, synopsis }) }
    ], groqKey, 600),
    key(env.RAWG_API_KEY) ? rawg("/games", key(env.RAWG_API_KEY), { search: game.name, search_precise: true, page_size: 6 })
      .then((result) => (result.results || []).find((candidate) => norm(candidate.name) === norm(game.name))).catch(() => null) : null
  ]);
  const videos = (game.videos || []).slice(0, 2).filter((video) => /^[a-z0-9_-]{11}$/i.test(video.video_id || ""))
    .map((video) => ({ label: clean(video.name || "Game video", 90), url: "https://www.youtube.com/watch?v=" + video.video_id }));
  const queries = Array.isArray(insight.videoQueries) ? insight.videoQueries.slice(0, 2).map((query) => clean(query, 160)) : [];
  const reviews = [];
  const igdbPage = igdbGamePage(game);
  if (igdbPage) reviews.push({ label: "IGDB game page", url: igdbPage });
  if (rawgMatch?.slug) reviews.push({ label: "RAWG community reviews", url: rawgPage(rawgMatch) });
  if (/^https:\/\//.test(rawgMatch?.metacritic_url || "")) reviews.push({ label: "Metacritic reviews", url: rawgMatch.metacritic_url });
  return reply({ title: game.name, image: igdbImage(game), released, genres: (game.genres || []).slice(0, 3).map((genre) => genre.name),
    fit: clean(insight.fit, 500), expect: clean(insight.expect, 250), synopsis, videos,
    videoSearches: queries.map((query) => ({ label: query, url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(query) })),
    reviews, verified: true, note: null, language });
}
async function rawgDetail(body, env) {
  const id = Number(body.id), platform = PLATFORMS[body.platform], language = responseLanguage(body);
  if (!Number.isSafeInteger(id) || id < 1 || !platform) return fail("Invalid game selection.");
  const groqKey = key(env.GROQ_API_KEY), rawgKey = key(env.RAWG_API_KEY);
  if (!groqKey || !rawgKey) return fail("Recommendations are temporarily unavailable.", 503);
  const [game, movies] = await Promise.all([
    rawg("/games/" + id, rawgKey), rawg("/games/" + id + "/movies", rawgKey).catch(() => ({ results: [] }))
  ]);
  const verified = verifiedFor(game, platform);
  if (!onPlatform(game, platform) && !mayUseUnlisted(game, platform)) return fail("This game is not listed for the selected platform.", 404);
  const synopsis = clean((game.description_raw || "").replace(/\s+/g, " "), 900);
  const image = await artwork(game, rawgKey);
  const insight = await groq([
    { role: "system", content: "Return JSON only with fit, expect, videoQueries. fit: two short sentences explaining keyword match. expect: one honest sentence about gameplay. videoQueries: two YouTube search phrases, one for gameplay and one for reviews, with the exact title and platform. Use only supplied facts. Do not invent specific videos or URLs. " + (language === "vi" ? "Write fit and expect in natural Vietnamese. Keep official game titles unchanged. Use English search phrases in videoQueries for better YouTube coverage." : "Write fit and expect in English. Use English search phrases in videoQueries.") + " No markdown." },
    { role: "user", content: JSON.stringify({ title: game.name, platform: platform.label, keywords: clean(body.keywords, 300), genres: (game.genres || []).map((genre) => genre.name), released: game.released, synopsis }) }
  ], groqKey, 600);
  const videos = (movies.results || []).slice(0, 2).map((movie) => ({
    label: clean(movie.name, 90), url: movie.data?.max || movie.data?.["480"] || ""
  })).filter((item) => /^https:\/\//.test(item.url));
  const queries = Array.isArray(insight.videoQueries) ? insight.videoQueries.slice(0, 2).map((query) => clean(query, 160)) : [];
  const reviews = [{ label: "RAWG community reviews", url: rawgPage(game) }];
  if (/^https:\/\//.test(game.metacritic_url || "")) reviews.push({ label: "Metacritic reviews", url: game.metacritic_url });
  return reply({ title: game.name, image, released: game.released || null,
    genres: (game.genres || []).slice(0, 3).map((genre) => genre.name), fit: clean(insight.fit, 500),
    expect: clean(insight.expect, 250), synopsis, videos,
    videoSearches: queries.map((query) => ({ label: query, url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(query) })),
    reviews, verified, note: verified ? null : platformNote(language), language });
}
async function detail(body, env) {
  if (body.source === "igdb") return igdbDetail(body, env);
  if (!body.source || body.source === "rawg") return rawgDetail(body, env);
  return fail("Invalid game selection.");
}
const page = __PAGE__, css = __CSS__, client = __CLIENT__;
export default { async fetch(request, env) {
  const path = new URL(request.url).pathname;
  if (request.method === "GET" && path === "/") return new Response(page, { headers: { "content-type": "text/html; charset=utf-8" } });
  if (request.method === "GET" && path === "/styles.css") return new Response(css, { headers: { "content-type": "text/css; charset=utf-8" } });
  if (request.method === "GET" && path === "/app.js") return new Response(client, { headers: { "content-type": "text/javascript; charset=utf-8" } });
  if (request.method === "POST" && (path === "/api/recommend" || path === "/api/detail")) {
    const rejected = await guardApi(request, env, path);
    if (rejected) return rejected;
    let body;
    try { body = await readJsonBody(request); }
    catch (cause) { return fail(cause.message === "Request is too large." ? cause.message : "Invalid request body.", cause.message === "Request is too large." ? 413 : 400); }
    if (!body || typeof body !== "object") return fail("Invalid request body.");
    try { return path === "/api/recommend" ? await recommend(body, env) : await detail(body, env); }
    catch (cause) { return fail(cause.message || "Unexpected server error.", 502); }
  }
  return new Response("Not found", { status: 404 });
} };
