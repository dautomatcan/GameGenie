const platforms = __PLATFORMS__;
const platformByCode = Object.fromEntries(platforms.map((platform) => [platform.code, platform]));
const groupOrder = ["PC and Mobile", "Xbox", "PlayStation", "Nintendo", "Retro"];
const sorts = new Set(["popular", "recent", "rating", "critics", "title"]);
const $ = (id) => document.getElementById(id);
const make = (tag, className, value) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value !== undefined) node.textContent = value;
  return node;
};
const copy = {
  en: {
    pageTitle: "Browse games — GameGenie", metaDescription: "Browse real games by platform, release date and rating across PC, consoles, handhelds and arcade boards.",
    finderLink: "✦ AI game finder", kicker: "YOUR OPEN GAME SHELF", title: "Browse freely", intro: "No prompt needed. Pick a system, sort the catalogue, and keep exploring.", sticker: "NEW QUEST: EXPLORE",
    systemsBar: "Choose a system", allSystems: "All systems", platformNote: "The same systems as the Game Finder, from current consoles to arcade boards.", systemsStatus: "46 systems ready",
    resultsBar: "Game catalogue", browseTag: "BROWSE MODE", resultsLabel: "A WHOLE WORLD OF GAMES", resultsTitle: "Take your pick!", selectionSummary: "Showing games from all systems.",
    sortLabel: "Sort by", sortPopular: "Most popular", sortRecent: "Newest releases", sortRating: "Top rated", sortCritics: "Critic scores", sortTitle: "Title A–Z",
    popularExplainer: "Popularity reflects RAWG library adds or IGDB rating activity. Download totals are not available.",
    recentExplainer: "Newest releases use each catalogue's release date. Future games are excluded.",
    ratingExplainer: "Top rated uses community and combined scores. Some older games have too few ratings to rank.",
    criticsExplainer: "Critic scores use Metacritic or IGDB critic ratings where available.",
    titleExplainer: "Games are ordered alphabetically by title.",
    curatedExplainer: "CPS board lists are curated; artwork and ratings come from IGDB. They may represent later ports.",
    loading: "Opening the game shelf…", loadingMore: "Loading more games…", shown: "Showing {count} games for {platform}.", noGames: "No catalogued games with artwork for this view. Try another sort or system.", error: "The game catalogue is temporarily unavailable. Please try again.",
    loadMore: "Load more games ↓", resultsStatus: "Real games, real artwork", footerBrand: "✦ GameGenie · Browse at your own pace", footerData: "Game data and images by", footerAnd: "and", footerStats: "A random browser ID helps count visits.",
    detailBar: "Game details", closeDetail: "Close game details", loadingDetail: "Loading game details…", expect: "What to expect", gameplay: "Gameplay & video", reviews: "Reviews & game page", gamePage: "Game page", gameplaySearch: "Gameplay on YouTube", reviewSearch: "Reviews on YouTube", releaseUnknown: "Release unknown", unrated: "Not rated"
  },
  vi: {
    pageTitle: "Duyệt trò chơi — GameGenie", metaDescription: "Duyệt game theo hệ máy, ngày phát hành và điểm đánh giá trên PC, console, máy cầm tay và hệ arcade.",
    finderLink: "✦ AI tìm game", kicker: "KỆ GAME MỞ RỘNG", title: "Duyệt game tự do", intro: "Không cần nhập từ khóa. Chọn hệ máy, sắp xếp danh sách và khám phá.", sticker: "NHIỆM VỤ MỚI: KHÁM PHÁ",
    systemsBar: "Chọn hệ máy", allSystems: "Tất cả hệ máy", platformNote: "Cùng bộ hệ máy với mục Tìm game, từ console mới đến máy arcade.", systemsStatus: "Sẵn sàng khám phá 46 hệ máy",
    resultsBar: "Danh mục trò chơi", browseTag: "CHẾ ĐỘ DUYỆT", resultsLabel: "THẾ GIỚI GAME RỘNG MỞ", resultsTitle: "Chọn game nào!", selectionSummary: "Đang hiển thị game từ mọi hệ máy.",
    sortLabel: "Sắp xếp", sortPopular: "Phổ biến nhất", sortRecent: "Phát hành gần đây", sortRating: "Đánh giá cao", sortCritics: "Điểm nhà phê bình", sortTitle: "Tên A–Z",
    popularExplainer: "Độ phổ biến dựa trên lượt thêm vào thư viện RAWG hoặc lượt đánh giá IGDB. Không có số lượt tải xuống.",
    recentExplainer: "Ngày phát hành theo dữ liệu của từng danh mục. Không hiển thị game chưa phát hành.",
    ratingExplainer: "Điểm đánh giá dựa trên người chơi và điểm tổng hợp. Một số game cũ có quá ít đánh giá để xếp hạng.",
    criticsExplainer: "Điểm nhà phê bình lấy từ Metacritic hoặc IGDB nếu có.",
    titleExplainer: "Game được sắp xếp theo thứ tự chữ cái.",
    curatedExplainer: "Danh sách board CPS được tuyển chọn; hình ảnh và điểm từ IGDB có thể là của bản phát hành khác.",
    loading: "Đang mở kệ game…", loadingMore: "Đang tải thêm game…", shown: "Đang hiển thị {count} game cho {platform}.", noGames: "Chưa có game kèm hình cho mục này. Hãy thử cách sắp xếp hoặc hệ máy khác.", error: "Danh mục game đang tạm thời không khả dụng. Vui lòng thử lại.",
    loadMore: "Xem thêm game ↓", resultsStatus: "Game thật, hình ảnh thật", footerBrand: "✦ GameGenie · Khám phá theo cách của bạn", footerData: "Dữ liệu và hình ảnh game từ", footerAnd: "và", footerStats: "Mã ngẫu nhiên trên trình duyệt giúp đếm lượt truy cập.",
    detailBar: "Chi tiết trò chơi", closeDetail: "Đóng chi tiết trò chơi", loadingDetail: "Đang tải chi tiết…", expect: "Bạn sẽ trải nghiệm gì", gameplay: "Gameplay và video", reviews: "Đánh giá và trang game", gamePage: "Trang game", gameplaySearch: "Gameplay trên YouTube", reviewSearch: "Đánh giá trên YouTube", releaseUnknown: "Chưa rõ ngày phát hành", unrated: "Chưa có điểm"
  }
};
const groupVi = { "PC and Mobile": "PC và di động", Xbox: "Xbox", PlayStation: "PlayStation", Nintendo: "Nintendo", Retro: "Máy cổ điển" };
const genreVi = { Action: "Hành động", Adventure: "Phiêu lưu", Indie: "Độc lập", Puzzle: "Giải đố", Platform: "Đi cảnh", Shooter: "Bắn súng", "Role-playing (RPG)": "Nhập vai", Simulator: "Mô phỏng", Strategy: "Chiến thuật", Racing: "Đua xe", Fighting: "Đối kháng", Arcade: "Arcade", Sport: "Thể thao", Music: "Âm nhạc" };
let language = "en", theme = "light", platformCode = "all", sort = "popular", page = 0;
let games = [], hasMore = false, loading = false, aborter = null, detailTrigger = null, catalogueSource = "rawg";
try { if (sessionStorage.getItem("gamegenie-language") === "vi") language = "vi"; } catch { /* Storage may be unavailable. */ }
try { if (sessionStorage.getItem("gamegenie-theme") === "dark") theme = "dark"; } catch { /* Storage may be unavailable. */ }
const initial = new URL(location.href).searchParams;
if (platformByCode[initial.get("platform")]) platformCode = initial.get("platform");
if (sorts.has(initial.get("sort"))) sort = initial.get("sort");
const t = (key, values = {}) => (copy[language][key] || copy.en[key] || key).replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? ""));
const labelFor = (code) => code === "all" ? t("allSystems") : platformByCode[code]?.label || code;
const genres = (items) => language === "vi" ? items.map((genre) => genreVi[genre] || genre) : items;

function themeUI() {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#11172d" : "#368be9";
  const button = document.querySelector("[data-theme-toggle]");
  button.setAttribute("aria-pressed", String(theme === "dark"));
  button.setAttribute("aria-label", theme === "dark" ? "Turn on light mode" : "Turn on dark mode");
  button.querySelector("span").textContent = theme === "dark" ? "☀" : "☾";
}
function explainSort() {
  $("sortExplainer").textContent = t(catalogueSource === "curated" ? "curatedExplainer" : sort + "Explainer");
}
function updateLanguage() {
  document.documentElement.lang = language;
  document.title = t("pageTitle");
  document.querySelector('meta[name="description"]').content = t("metaDescription");
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll("[data-lang]").forEach((button) => {
    const active = button.dataset.lang === language;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelector(".language-switch").setAttribute("aria-label", language === "vi" ? "Ngôn ngữ" : "Language");
  document.querySelectorAll("[data-group-name]").forEach((node) => {
    node.textContent = (language === "vi" ? groupVi[node.dataset.groupName] : node.dataset.groupName) + " · " + node.dataset.count;
  });
  $("selectionSummary").textContent = platformCode === "all" ? t("selectionSummary") : t("shown", { count: games.length, platform: labelFor(platformCode) });
  if (!loading && page && !$("browseStatus").classList.contains("error")) {
    $("browseStatus").textContent = t("shown", { count: games.length, platform: labelFor(platformCode) });
  }
  $("closeBrowseDetail").setAttribute("aria-label", t("closeDetail"));
  explainSort();
  themeUI();
  if (loading && !games.length) showSkeletons();
  else renderCards();
}
function renderPlatforms() {
  for (const groupName of groupOrder) {
    const items = platforms.filter((platform) => platform.group === groupName);
    const wrapper = make("details", "group");
    wrapper.dataset.group = groupName;
    if (items.some((platform) => platform.code === platformCode)) wrapper.open = true;
    const heading = make("summary", "group-heading");
    const name = make("span", "group-label");
    name.dataset.groupName = groupName; name.dataset.count = String(items.length);
    heading.append(name, make("span", "group-chevron", "⌄"));
    wrapper.append(heading);
    wrapper.addEventListener("toggle", () => {
      if (wrapper.open) document.querySelectorAll("#browsePlatformGroups .group").forEach((other) => {
        if (other !== wrapper) other.open = false;
      });
    });
    const choices = make("div", "choices");
    for (const platform of items) {
      const button = make("button", "choice", platform.label);
      button.type = "button";
      button.dataset.browsePlatform = platform.code;
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", platform.label + (platform.year ? ", " + platform.year : ""));
      if (platform.year) button.append(make("small", "choice-year", String(platform.year)));
      button.addEventListener("click", () => choosePlatform(platform.code));
      choices.append(button);
    }
    wrapper.append(choices);
    $("browsePlatformGroups").append(wrapper);
  }
  refreshPlatformSelection();
}
function refreshPlatformSelection() {
  document.querySelectorAll("[data-browse-platform]").forEach((button) => {
    const active = button.dataset.browsePlatform === platformCode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}
function syncUrl() {
  const url = new URL(location.href);
  if (platformCode === "all") url.searchParams.delete("platform");
  else url.searchParams.set("platform", platformCode);
  if (sort === "popular") url.searchParams.delete("sort");
  else url.searchParams.set("sort", sort);
  history.replaceState(null, "", url);
}
function choosePlatform(code) {
  if (code === platformCode) return;
  platformCode = code;
  refreshPlatformSelection();
  syncUrl();
  loadFirstPage();
}
function cardFor(game) {
  const button = make("button", "browse-card");
  button.type = "button";
  button.setAttribute("aria-label", game.title + ", " + game.platformLabel);
  const imageWrap = make("div", "browse-image");
  const fallback = make("span", "browse-image-fallback", "✦");
  imageWrap.append(fallback);
  if (game.image) {
    const image = make("img");
    image.src = game.image;
    image.alt = "";
    image.loading = "lazy";
    image.addEventListener("load", () => fallback.remove(), { once: true });
    image.addEventListener("error", () => image.remove(), { once: true });
    imageWrap.append(image);
  }
  const score = sort === "critics" ? Number(game.criticRating || 0) : Number(game.rating || 0);
  if (score) imageWrap.append(make("span", "browse-score", sort === "critics" ? Math.round(score) + "/100" : "★ " + score.toFixed(1)));
  const body = make("div", "browse-card-body");
  body.append(make("div", "browse-card-meta", genres(game.genres || []).join(" · ") || game.platformLabel));
  body.append(make("h3", "", game.title));
  const foot = make("div", "browse-card-foot");
  foot.append(make("span", "", game.platformLabel), make("span", "", game.year && game.year !== "—" ? game.year : "✦"));
  body.append(foot);
  button.append(imageWrap, body);
  button.addEventListener("click", () => openDetail(game, button));
  return button;
}
function renderCards() {
  const grid = $("browseGrid");
  grid.replaceChildren();
  if (!games.length && !loading) grid.append(make("div", "browse-empty", t("noGames")));
  games.forEach((game) => grid.append(cardFor(game)));
  $("loadMore").hidden = !hasMore || loading;
}
function showSkeletons() {
  const grid = $("browseGrid");
  grid.replaceChildren(...Array.from({ length: 6 }, () => make("div", "browse-skeleton")));
}
async function fetchPage(nextPage, signal) {
  const query = new URLSearchParams({ platform: platformCode, sort, page: String(nextPage) });
  const response = await fetch("/api/browse?" + query, { signal, credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || t("error"));
  return data;
}
async function loadFirstPage() {
  aborter?.abort();
  aborter = new AbortController();
  const signal = aborter.signal;
  page = 0; games = []; hasMore = false; loading = true; catalogueSource = "rawg";
  $("browseStatus").classList.remove("error");
  $("browseStatus").textContent = t("loading");
  $("selectionSummary").textContent = platformCode === "all" ? t("selectionSummary") : labelFor(platformCode);
  $("loadMore").hidden = true;
  showSkeletons();
  try {
    const data = await fetchPage(1, signal);
    if (signal.aborted) return;
    games = data.games || [];
    hasMore = !!data.hasMore;
    catalogueSource = data.source;
    page = 1;
    $("browseStatus").textContent = t("shown", { count: games.length, platform: labelFor(platformCode) });
    $("selectionSummary").textContent = platformCode === "all" ? t("selectionSummary") : labelFor(platformCode);
    explainSort();
  } catch (error) {
    if (signal.aborted) return;
    $("browseStatus").textContent = error.message || t("error");
    $("browseStatus").classList.add("error");
  } finally {
    if (!signal.aborted) { loading = false; renderCards(); }
  }
}
async function loadMore() {
  if (loading || !hasMore) return;
  loading = true;
  $("loadMore").hidden = true;
  $("browseStatus").textContent = t("loadingMore");
  const signal = aborter.signal;
  try {
    const data = await fetchPage(page + 1, signal);
    if (signal.aborted) return;
    const seen = new Set(games.map((game) => game.source + ":" + game.id));
    const nextGames = (data.games || []).filter((game) => !seen.has(game.source + ":" + game.id));
    games.push(...nextGames);
    $("browseGrid").append(...nextGames.map(cardFor));
    page += 1;
    hasMore = !!data.hasMore;
    $("browseStatus").textContent = t("shown", { count: games.length, platform: labelFor(platformCode) });
  } catch (error) {
    if (signal.aborted) return;
    $("browseStatus").textContent = error.message || t("error");
    $("browseStatus").classList.add("error");
  } finally {
    if (!signal.aborted) { loading = false; $("loadMore").hidden = !hasMore; }
  }
}
function external(url, text) {
  const a = make("a", "link-pill", text + " ↗");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
}
function closeDetail() {
  const backdrop = $("browseDetailBackdrop");
  backdrop.classList.remove("show");
  backdrop.hidden = true;
  detailTrigger?.focus();
}
async function openDetail(game, trigger) {
  detailTrigger = trigger;
  const backdrop = $("browseDetailBackdrop");
  backdrop.hidden = false;
  backdrop.classList.add("show");
  const root = $("browseDetailContent");
  root.className = "detail-wait";
  root.textContent = t("loadingDetail");
  $("closeBrowseDetail").focus();
  try {
    const response = await fetch("/api/detail", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: game.id, source: game.source, platform: game.platform, keywords: "browse overview", language }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || t("error"));
    if (!backdrop.classList.contains("show")) return;
    root.replaceChildren();
    root.className = "";
    if (data.image || game.image) {
      const imageWrap = make("div", "detail-image");
      const image = make("img");
      image.src = data.image || game.image;
      image.alt = data.title || game.title;
      image.addEventListener("error", () => imageWrap.remove(), { once: true });
      imageWrap.append(image); root.append(imageWrap);
    }
    const inner = make("div", "dialog-inner");
    const meta = genres(data.genres || game.genres || []).join(" · ") + " · " + (data.released || game.released || t("releaseUnknown"));
    inner.append(make("div", "detail-kicker", meta));
    const title = make("h2", "", data.title || game.title);
    title.id = "browseDetailTitle";
    inner.append(title);
    if (data.note) inner.append(make("div", "notice", data.note));
    const overview = make("div", "detail-section");
    overview.append(make("h3", "", t("expect")), make("p", "", data.expect || data.synopsis || ""));
    inner.append(overview);
    const videos = make("div", "detail-section"), videoLinks = make("div", "link-list");
    videos.append(make("h3", "", t("gameplay")));
    (data.videos || []).forEach((item) => videoLinks.append(external(item.url, item.label || t("gameplay"))));
    (data.videoSearches || []).forEach((item, index) => videoLinks.append(external(item.url, index ? t("reviewSearch") : t("gameplaySearch"))));
    if (!videoLinks.childElementCount) videoLinks.append(external("https://www.youtube.com/results?search_query=" + encodeURIComponent((data.title || game.title) + " gameplay"), t("gameplaySearch")));
    videos.append(videoLinks); inner.append(videos);
    const reviews = make("div", "detail-section"), reviewLinks = make("div", "link-list");
    reviews.append(make("h3", "", t("reviews")));
    (data.reviews || []).forEach((item) => reviewLinks.append(external(item.url, item.label || t("gamePage"))));
    reviews.append(reviewLinks); inner.append(reviews);
    root.append(inner);
  } catch (error) {
    if (!backdrop.classList.contains("show")) return;
    root.className = "detail-wait";
    root.textContent = error.message || t("error");
  }
}

$("allSystems").addEventListener("click", () => choosePlatform("all"));
$("browseSort").value = sort;
$("browseSort").addEventListener("change", (event) => {
  sort = event.target.value;
  syncUrl();
  explainSort();
  loadFirstPage();
});
$("loadMore").addEventListener("click", loadMore);
$("closeBrowseDetail").addEventListener("click", closeDetail);
$("browseDetailBackdrop").addEventListener("click", (event) => { if (event.target === $("browseDetailBackdrop")) closeDetail(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && $("browseDetailBackdrop").classList.contains("show")) closeDetail(); });
document.querySelectorAll("[data-lang]").forEach((button) => button.addEventListener("click", () => {
  language = button.dataset.lang;
  try { sessionStorage.setItem("gamegenie-language", language); } catch { /* Storage may be unavailable. */ }
  updateLanguage();
}));
document.querySelector("[data-theme-toggle]").addEventListener("click", () => {
  theme = theme === "dark" ? "light" : "dark";
  try { sessionStorage.setItem("gamegenie-theme", theme); } catch { /* Storage may be unavailable. */ }
  themeUI();
});
renderPlatforms();
updateLanguage();
if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting) && hasMore && !loading) loadMore();
  }, { rootMargin: "350px" });
  observer.observe(document.querySelector(".browse-more"));
}
loadFirstPage();
