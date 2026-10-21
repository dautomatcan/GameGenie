const platforms = __PLATFORMS__;
const groups = ["PC and Mobile", "Xbox", "PlayStation", "Nintendo", "Retro"].map((name) => ({
  name, items: platforms.filter((platform) => platform.group === name)
}));
let selected = null, searchPlatform = null, currentKeywords = "";
const el = (id) => document.getElementById(id);
const copy = {
  en: {
    appTitle: "GameGenie — Your next game is out there", metaDescription: "Discover your next favorite game across PC, mobile, consoles, handhelds and arcade boards.",
    welcomeLink: "Welcome", howLink: "How it works", browseFreely: "Browse freely", ready: "Ready to explore", finderBar: "Game finder",
    finderKicker: "LET'S PLAY SOMETHING GOOD", finderTitle: "Find your next obsession", finderIntro: "Two little steps. A whole new world of games.", matcher: "★ GAME MATCHER",
    choosePlatform: "Choose your platform", describeVibe: "Describe your vibe", findGames: "Find my games", helperStart: "You can type now. Choose a platform before searching.",
    finderStatus: "Powered by curiosity and a little AI magic", statusReady: "READY", resultsBar: "Your game discoveries", resultsLabel: "YOUR PERSONAL GAME SHELF",
    resultsTitle: "Good games, incoming!", resultsStart: "Choose a platform and describe what you love to play.", discovering: "Discovering games...",
    emptyTitle: "Your picks will land here", emptyBody: "Start a search above and let the adventure begin.", resultsStatus: "Real games, matched to your mood",
    footerPowered: "✦ GameGenie · Powered by Groq GPT-OSS 120B", footerData: "Game data and images by", footerAnd: "and", footerVideo: "Video searches open YouTube.", footerStats: "A random browser ID helps count visits.",
    welcomeBar: "Welcome to GameGenie", welcomeKicker: "YOUR NEXT FAVORITE IS OUT THERE", welcomeTitle1: "Ready to find", welcomeTitle2: "your next game?",
    welcomeIntro: "Pick a platform, tell us your vibe, and we’ll match you with real games worth playing.", welcomeMood: "✨  Made for your mood", welcomeRetro: "🕹️  Retro to next-gen",
    enter: "Enter GameGenie", sticker: "new quest unlocked!", detailBar: "Game details", loadingDetail: "Loading game details...", platformCount: "🎮  {count} platforms",
    keywordsLabel: "Game keywords", keywordsPlaceholder: "e.g. cozy exploration, great soundtrack, not too hard...", closeDetail: "Close game details",
    selectedHint: "{platform} selected. Try a mood, genre, setting, or mechanic.", unverifiedHint: " Exact releases may need confirmation.",
    resultsSummary: "{count} picks for {platform} · {keywords}", gameGeneric: "Game", artworkFor: "Artwork for {title}", releaseUnknown: "Release unknown",
    whyPick: "Why this pick", expectTitle: "What to expect", gameplayTitle: "Gameplay & video", reviewsTitle: "Reviews & game page", fallbackExpect: "Explore the game details.",
    trailer: "Watch trailer", gameplayFind: "Find gameplay on YouTube", youtubeGameplay: "Gameplay on YouTube", youtubeReview: "Reviews on YouTube",
    igdbPage: "IGDB game page", rawgReviews: "RAWG community reviews", metacriticReviews: "Metacritic reviews",
    selectedError: "Choose a platform before searching.", keywordsError: "Describe your vibe in at least three characters.", searching: "Searching...", genericError: "Something went wrong. Please try again.",
    groupRetro: "Retro", unverifiedTitle: "RAWG may not confirm the exact system release.", reroll: "Reroll", rerollLabel: "Reroll games", noFresh: "No new picks found. Try different keywords.", historyFull: "Try a new search for more games.",
    enableDark: "Turn on dark mode", enableLight: "Turn on light mode"
  },
  vi: {
    appTitle: "GameGenie — Tìm trò chơi tiếp theo", metaDescription: "Tìm trò chơi yêu thích tiếp theo trên PC, di động, console, máy cầm tay và hệ arcade.",
    welcomeLink: "Giới thiệu", howLink: "Cách dùng", browseFreely: "Duyệt game tự do", ready: "Sẵn sàng khám phá", finderBar: "Tìm trò chơi",
    finderKicker: "CÙNG TÌM MỘT GAME HAY", finderTitle: "Tìm trò chơi hợp gu", finderIntro: "Hai bước nhỏ, rất nhiều trò chơi để khám phá.", matcher: "★ GỢI Ý GAME",
    choosePlatform: "Chọn hệ máy", describeVibe: "Mô tả gu của bạn", findGames: "Tìm game cho tôi", helperStart: "Bạn có thể nhập trước. Hãy chọn hệ máy trước khi tìm kiếm.",
    finderStatus: "Một chút tò mò, một chút phép màu AI", statusReady: "SẴN SÀNG", resultsBar: "Game dành cho bạn", resultsLabel: "KỆ GAME CỦA RIÊNG BẠN",
    resultsTitle: "Game hay sắp xuất hiện!", resultsStart: "Chọn hệ máy và mô tả kiểu game bạn thích.", discovering: "Đang tìm game...",
    emptyTitle: "Gợi ý sẽ hiện ở đây", emptyBody: "Bắt đầu tìm kiếm ở trên để khám phá game mới.", resultsStatus: "Game có thật, hợp với gu của bạn",
    footerPowered: "✦ GameGenie · Sử dụng Groq GPT-OSS 120B", footerData: "Dữ liệu và hình ảnh game từ", footerAnd: "và", footerVideo: "Liên kết tìm video mở YouTube.", footerStats: "Mã ngẫu nhiên trên trình duyệt giúp đếm lượt truy cập.",
    welcomeBar: "Chào mừng đến GameGenie", welcomeKicker: "GAME YÊU THÍCH TIẾP THEO ĐANG CHỜ BẠN", welcomeTitle1: "Sẵn sàng tìm", welcomeTitle2: "game tiếp theo?",
    welcomeIntro: "Chọn hệ máy, nói điều bạn thích, rồi khám phá những trò chơi có thật hợp với bạn.", welcomeMood: "✨  Hợp với tâm trạng", welcomeRetro: "🕹️  Từ cổ điển đến hiện đại",
    enter: "Vào GameGenie", sticker: "nhiệm vụ mới đã mở!", detailBar: "Chi tiết trò chơi", loadingDetail: "Đang tải chi tiết...", platformCount: "🎮  {count} hệ máy",
    keywordsLabel: "Từ khóa trò chơi", keywordsPlaceholder: "VD: phiêu lưu nhẹ nhàng, nhạc hay, không quá khó...", closeDetail: "Đóng chi tiết trò chơi",
    selectedHint: "Đã chọn {platform}. Hãy thử nhập tâm trạng, thể loại, bối cảnh hoặc cách chơi.", unverifiedHint: " Có thể cần xác nhận game có trên hệ máy này.",
    resultsSummary: "{count} gợi ý cho {platform} · {keywords}", gameGeneric: "Trò chơi", artworkFor: "Hình của {title}", releaseUnknown: "Chưa rõ ngày phát hành",
    whyPick: "Vì sao game này hợp gu", expectTitle: "Bạn sẽ trải nghiệm gì", gameplayTitle: "Gameplay và video", reviewsTitle: "Đánh giá và trang game", fallbackExpect: "Khám phá chi tiết trò chơi.",
    trailer: "Xem trailer", gameplayFind: "Tìm gameplay trên YouTube", youtubeGameplay: "Gameplay trên YouTube", youtubeReview: "Đánh giá trên YouTube",
    igdbPage: "Trang game trên IGDB", rawgReviews: "Đánh giá cộng đồng trên RAWG", metacriticReviews: "Đánh giá trên Metacritic",
    selectedError: "Hãy chọn hệ máy trước khi tìm kiếm.", keywordsError: "Hãy mô tả gu của bạn bằng ít nhất ba ký tự.", searching: "Đang tìm...", genericError: "Đã xảy ra lỗi. Vui lòng thử lại.",
    groupRetro: "Máy cổ điển", unverifiedTitle: "RAWG có thể không xác nhận được bản phát hành cho đúng hệ máy này.", reroll: "Đổi lượt", rerollLabel: "Đổi danh sách game", noFresh: "Không tìm được game mới. Hãy thử từ khóa khác.", historyFull: "Hãy tìm kiếm mới để xem thêm game.",
    enableDark: "Bật chế độ tối", enableLight: "Bật chế độ sáng"
  }
};
const genreVi = {
  "Adventure": "Phiêu lưu", "Arcade": "Arcade", "Card & Board Game": "Bài và cờ", "Fighting": "Đối kháng", "Hack and slash/Beat 'em up": "Chặt chém",
  "Indie": "Độc lập", "Music": "Âm nhạc", "Platform": "Đi cảnh", "Point-and-click": "Trỏ và nhấp", "Puzzle": "Giải đố",
  "Racing": "Đua xe", "Real Time Strategy (RTS)": "Chiến thuật thời gian thực", "Role-playing (RPG)": "Nhập vai", "Shooter": "Bắn súng",
  "Simulator": "Mô phỏng", "Sport": "Thể thao", "Strategy": "Chiến thuật", "Tactical": "Chiến thuật", "Turn-based strategy (TBS)": "Chiến thuật theo lượt",
  "Visual Novel": "Tiểu thuyết hình ảnh", "Action": "Hành động", "Simulation": "Mô phỏng", "RPG": "Nhập vai"
};
let language = "en", theme = "light", lastResults = null, searchSequence = 0, lastRequestedKeywords = "", lastError = "";
const seenTitles = new Map();
const titleKey = (value) => String(value || "").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
try { if (sessionStorage.getItem("gamegenie-language") === "vi") language = "vi"; } catch { /* Storage may be unavailable. */ }
try { if (sessionStorage.getItem("gamegenie-theme") === "dark") theme = "dark"; } catch { /* Storage may be unavailable. */ }
const t = (name, values = {}) => (copy[language][name] || copy.en[name] || name).replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
const genres = (items) => language === "vi" ? items.map((name) => genreVi[name] || name) : items;
const localizedError = (message) => {
  if (message === "No fresh games were found for this search. Try different keywords.") return t("noFresh");
  if (language === "en") return message;
  if (message === copy.en.selectedError) return t("selectedError");
  if (message === copy.en.keywordsError) return t("keywordsError");
  if (message === "The AI service is busy. Try again shortly." || message === "Too many requests. Please wait a minute.") return "Dịch vụ AI đang bận. Vui lòng thử lại sau ít phút.";
  if (message === "No catalog matches with artwork were found for that platform. Try broader keywords.") return "Không tìm thấy game phù hợp có hình ảnh cho hệ máy này. Hãy thử từ khóa rộng hơn.";
  if (message === "The AI couldn't find titles. Try different keywords.") return "AI chưa tìm được game phù hợp. Hãy thử từ khóa khác.";
  if (message === "Recommendations are temporarily unavailable.") return "Tính năng gợi ý đang tạm thời không khả dụng.";
  return t("genericError");
};
const make = (tag, className, content) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
};
function showError(message) { lastError = message; el("error").textContent = localizedError(message); el("error").classList.add("show"); }
function clearError() { lastError = ""; el("error").classList.remove("show"); }
function showModal(id) { el(id).classList.add("show"); document.body.style.overflow = "hidden"; el(id).querySelector(".close").focus(); }
function hideModal(id) { el(id).classList.remove("show"); document.body.style.overflow = ""; }
function hideWelcome() {
  el("welcomeBackdrop").hidden = true;
  el("appShell").inert = false;
  document.body.classList.remove("welcome-open");
  el("finderTitle").focus();
}
function showWelcome() {
  el("appShell").inert = true;
  el("welcomeBackdrop").hidden = false;
  document.body.classList.add("welcome-open");
  el("enterApp").focus();
}
function link(url, label) {
  const node = make("a", "link-pill", label + " ↗");
  node.href = url; node.target = "_blank"; node.rel = "noopener noreferrer";
  return node;
}
function updateHelper() {
  if (!selected) { el("helper").textContent = t("helperStart"); return; }
  const platform = platforms.find((item) => item.code === selected);
  el("helper").textContent = t("selectedHint", { platform: platform.label }) +
    (platform.verification === "hardware" || platform.igdbId ? "" : t("unverifiedHint"));
}
function canReroll() {
  const history = [...seenTitles.values()];
  return !!lastResults && history.length < 80 && JSON.stringify(history).length < 2600;
}
function updateReroll() {
  const button = el("rerollBtn");
  button.disabled = el("findBtn").disabled || !canReroll();
  button.setAttribute("aria-label", t("rerollLabel"));
  button.title = !canReroll() && lastResults ? t("historyFull") : t("rerollLabel");
}
function applyTheme() {
  const dark = theme === "dark";
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = dark ? "#11172d" : "#368be9";
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    const label = t(dark ? "enableLight" : "enableDark");
    button.setAttribute("aria-pressed", String(dark));
    button.setAttribute("aria-label", label);
    button.title = label;
    button.querySelector("span").textContent = dark ? "☀" : "☾";
  });
}
function updateLanguage() {
  document.documentElement.lang = language;
  document.title = t("appTitle");
  document.querySelector('meta[name="description"]').content = t("metaDescription");
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll("[data-lang]").forEach((button) => {
    const active = button.dataset.lang === language;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelectorAll(".language-switch").forEach((group) => {
    group.setAttribute("aria-label", language === "vi" ? "Ngôn ngữ" : "Language");
  });
  applyTheme();
  document.querySelectorAll("[data-group-name]").forEach((node) => {
    node.textContent = (node.dataset.groupName === "Retro" ? t("groupRetro") : node.dataset.groupName) + "  ·  " + node.dataset.count;
  });
  document.querySelectorAll(".choice-unverified").forEach((button) => { button.title = t("unverifiedTitle"); });
  el("platformCount").textContent = t("platformCount", { count: platforms.length });
  el("keywords").placeholder = t("keywordsPlaceholder");
  el("keywords").setAttribute("aria-label", t("keywordsLabel"));
  document.querySelector("[data-close='detailBackdrop']").setAttribute("aria-label", t("closeDetail"));
  el("findBtn").textContent = t(el("findBtn").disabled ? "searching" : "findGames") + (el("findBtn").disabled ? "" : "  ✦");
  updateReroll();
  updateHelper();
  if (lastResults) el("resultsSub").textContent = t("resultsSummary", { count: lastResults.games.length, platform: lastResults.platform, keywords: lastResults.keywords });
  if (lastError) el("error").textContent = localizedError(lastError);
}
function setLanguage(next) {
  if (next === language) return;
  language = next;
  try { sessionStorage.setItem("gamegenie-language", next); } catch { /* Storage may be unavailable. */ }
  updateLanguage();
  if (lastRequestedKeywords && selected) runSearch(lastRequestedKeywords);
}
document.querySelectorAll("[data-lang]").forEach((button) => button.addEventListener("click", () => setLanguage(button.dataset.lang)));
document.querySelectorAll("[data-theme-toggle]").forEach((button) => button.addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark";
  try { sessionStorage.setItem("gamegenie-theme", theme); } catch { /* Storage may be unavailable. */ }
  applyTheme();
}));
el("enterApp").addEventListener("click", () => hideWelcome());
el("openWelcome").addEventListener("click", showWelcome);
el("enterApp").focus();
for (const group of groups) {
  const wrap = make("details", "group");
  wrap.dataset.group = group.name;
  const heading = make("summary", "group-heading");
  const label = make("span", "group-label", group.name + "  ·  " + group.items.length);
  label.dataset.groupName = group.name; label.dataset.count = String(group.items.length);
  const selectedBadge = make("span", "group-selected");
  selectedBadge.hidden = true;
  heading.append(label, selectedBadge, make("span", "group-chevron", "⌄"));
  wrap.append(heading);
  wrap.addEventListener("toggle", () => {
    if (wrap.open) document.querySelectorAll(".platform-groups .group").forEach((other) => {
      if (other !== wrap) other.open = false;
    });
  });
  const list = make("div", "choices");
  for (const platform of group.items) {
    const button = make("button", "choice", platform.label);
    button.type = "button"; button.dataset.platform = platform.code; button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", platform.label + (platform.year ? ", " + platform.year : ""));
    if (platform.year) button.append(make("small", "choice-year", String(platform.year)));
    if (platform.verification !== "hardware" && !platform.igdbId) {
      button.classList.add("choice-unverified");
      button.title = t("unverifiedTitle");
    }
    button.addEventListener("click", () => {
      selected = platform.code;
      document.querySelectorAll(".group-selected").forEach((badge) => { badge.hidden = true; });
      selectedBadge.textContent = "✓ " + platform.label;
      selectedBadge.hidden = false;
      document.querySelectorAll(".choice").forEach((choice) => {
        const active = choice.dataset.platform === platform.code;
        choice.classList.toggle("active", active);
        choice.setAttribute("aria-pressed", String(active));
      });
      updateHelper();
      clearError(); el("keywords").focus();
    });
    list.append(button);
  }
  wrap.append(list); el("platformGroups").append(wrap);
}
updateLanguage();
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => hideModal(button.dataset.close)));
document.querySelectorAll(".dialog-backdrop").forEach((backdrop) => backdrop.addEventListener("click", (event) => {
  if (event.target === backdrop) hideModal(backdrop.id);
}));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") document.querySelectorAll(".dialog-backdrop.show").forEach((modal) => hideModal(modal.id));
});
async function post(path, body) {
  const result = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await result.json().catch(() => null);
  if (!result.ok) throw new Error(data?.error || (result.status === 429 ? "Too many requests. Please wait a minute." : "Something went wrong."));
  if (!data || typeof data !== "object") throw new Error("Something went wrong.");
  return data;
}
function renderGames(data) {
  lastResults = data;
  el("grid").replaceChildren();
  el("resultsSub").textContent = t("resultsSummary", { count: data.games.length, platform: data.platform, keywords: data.keywords });
  for (const game of data.games) {
    const card = make("button", "card"); card.type = "button";
    const thumb = make("div", "thumb");
    if (game.image) {
      const image = make("img"); image.src = game.image; image.alt = t("artworkFor", { title: game.title }); image.loading = "eager";
      image.addEventListener("error", () => image.replaceWith(make("span", "thumb-fallback", "✦")), { once: true });
      thumb.append(image);
    } else thumb.append(make("span", "thumb-fallback", "✦"));
    const body = make("div", "cardbody");
    body.append(make("h3", "", game.title));
    body.append(make("div", "meta", genres(game.genres || []).join(" · ") || t("gameGeneric")));
    card.append(thumb, body);
    card.addEventListener("click", () => openDetail(game));
    el("grid").append(card);
  }
  if (!window.matchMedia("(min-width: 1180px)").matches) {
    el("results").scrollIntoView({ behavior: "smooth", block: "start" });
  }
}
async function runSearch(keywords, { reroll = false, platformCode = selected } = {}) {
  const requestNumber = ++searchSequence, requestLanguage = language;
  lastRequestedKeywords = keywords;
  el("rerollMessage").hidden = true;
  clearError(); el("loading").classList.add("show"); el("findBtn").disabled = true;
  el("findBtn").textContent = t("searching");
  updateReroll();
  try {
    const data = await post("/api/recommend", { platform: platformCode, keywords, language: requestLanguage,
      excludeTitles: reroll ? [...seenTitles.values()] : [] });
    if (requestNumber !== searchSequence) return;
    if (reroll) data.games = data.games.filter((game) => !seenTitles.has(titleKey(game.title)));
    if (!data.games.length) throw new Error("No fresh games were found for this search. Try different keywords.");
    if (!reroll) seenTitles.clear();
    data.games.forEach((game) => seenTitles.set(titleKey(game.title), game.title));
    searchPlatform = platformCode; currentKeywords = keywords; renderGames(data);
  } catch (error) { if (requestNumber === searchSequence) {
    if (reroll) { el("rerollMessage").textContent = localizedError(error.message); el("rerollMessage").hidden = false; }
    else showError(error.message);
  } }
  finally {
    if (requestNumber === searchSequence) {
      el("loading").classList.remove("show"); el("findBtn").disabled = false;
      el("findBtn").textContent = t("findGames") + "  ✦";
      updateReroll();
    }
  }
}
el("rerollBtn").addEventListener("click", () => {
  if (canReroll() && searchPlatform && currentKeywords) runSearch(currentKeywords, { reroll: true, platformCode: searchPlatform });
});
el("searchForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const keywords = el("keywords").value.trim();
  if (!selected) { showError(copy.en.selectedError); el("platformGroups").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
  if (keywords.length < 3) { showError(copy.en.keywordsError); el("keywords").focus(); return; }
  runSearch(keywords);
});
async function openDetail(game) {
  el("detailContent").className = "detail-wait";
  el("detailContent").textContent = t("loadingDetail");
  showModal("detailBackdrop");
  try {
    const data = await post("/api/detail", { id: game.id, source: game.source || "rawg", platform: searchPlatform, keywords: currentKeywords, language });
    const root = el("detailContent");
    root.className = ""; root.replaceChildren();
    if (data.image) {
      const wrap = make("div", "detail-image"), image = make("img");
      image.src = data.image; image.alt = t("artworkFor", { title: data.title });
      image.addEventListener("error", () => wrap.remove(), { once: true });
      wrap.append(image); root.append(wrap);
    }
    const inner = make("div", "dialog-inner");
    inner.append(make("div", "detail-kicker", (genres(data.genres || game.genres || []).join(" · ") || t("gameGeneric")) + " · " + (data.released || game.year || t("releaseUnknown")) + (game.rating ? " · ★ " + game.rating + "/5" : "")));
    const title = make("h2", "", data.title); title.id = "detailTitle"; inner.append(title);
    if (game.reason || data.fit) {
      const why = make("div", "detail-section detail-why");
      why.append(make("h3", "", t("whyPick")));
      if (game.reason) why.append(make("p", "", game.reason));
      if (data.fit && data.fit !== game.reason) why.append(make("p", "", data.fit));
      inner.append(why);
    }
    if (data.note) inner.append(make("div", "notice", data.note));
    const overview = make("div", "detail-section");
    overview.append(make("h3", "", t("expectTitle")));
    overview.append(make("p", "", data.expect || (language === "en" ? data.synopsis : "") || t("fallbackExpect")));
    inner.append(overview);
    const video = make("div", "detail-section"), videoLinks = make("div", "link-list");
    video.append(make("h3", "", t("gameplayTitle")));
    data.videos.forEach((item) => videoLinks.append(link(item.url, language === "vi" ? t("trailer") : item.label || t("trailer"))));
    data.videoSearches.forEach((item, index) => videoLinks.append(link(item.url, index === 0 ? t("youtubeGameplay") : t("youtubeReview"))));
    if (!videoLinks.childElementCount) videoLinks.append(link("https://www.youtube.com/results?search_query=" + encodeURIComponent(data.title + " gameplay"), t("gameplayFind")));
    video.append(videoLinks); inner.append(video);
    const reviews = make("div", "detail-section"), reviewLinks = make("div", "link-list");
    reviews.append(make("h3", "", t("reviewsTitle")));
    data.reviews.forEach((item) => reviewLinks.append(link(item.url, item.label.startsWith("IGDB") ? t("igdbPage") : item.label.startsWith("RAWG") ? t("rawgReviews") : item.label.startsWith("Metacritic") ? t("metacriticReviews") : item.label)));
    reviews.append(reviewLinks); inner.append(reviews); root.append(inner);
  } catch (error) {
    el("detailContent").className = "detail-wait"; el("detailContent").textContent = localizedError(error.message);
  }
}
