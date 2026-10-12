const groups = [
  { name: "PC & Xbox", items: [["pc", "PC"], ["xbox", "Xbox family"]] },
  { name: "PlayStation", items: [["ps5", "PS5"], ["ps4", "PS4"], ["ps3", "PS3"], ["ps2", "PS2"], ["ps1", "PS1"]] },
  { name: "Nintendo", items: [["switch2", "Switch 2"], ["switch", "Switch"], ["wiiu", "Wii U"], ["wii", "Wii"], ["gamecube", "GameCube"], ["3ds", "3DS"], ["nds", "DS"], ["gba", "GBA"], ["gbc", "GBC"], ["gb", "GB"]] },
  { name: "Arcade", items: [["cps3", "CPS-3"], ["cps2", "CPS-2"], ["cps1", "CPS-1"]] }
];
let selected = null, searchPlatform = null, currentKeywords = "";
const el = (id) => document.getElementById(id);
const make = (tag, className, content) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (content !== undefined) node.textContent = content;
  return node;
};
const keys = () => ({ groqKey: localStorage.getItem("go-groq") || "", rawgKey: localStorage.getItem("go-rawg") || "" });
function showError(message) { el("error").textContent = message; el("error").classList.add("show"); }
function clearError() { el("error").classList.remove("show"); }
function showModal(id) { el(id).classList.add("show"); document.body.style.overflow = "hidden"; el(id).querySelector(".close").focus(); }
function hideModal(id) { el(id).classList.remove("show"); document.body.style.overflow = ""; }
function link(url, label) {
  const node = make("a", "link-pill", label + " ↗");
  node.href = url; node.target = "_blank"; node.rel = "noopener noreferrer";
  return node;
}
for (const group of groups) {
  const wrap = make("div", "group");
  wrap.append(make("div", "group-label", group.name));
  const list = make("div", "choices");
  for (const [id, label] of group.items) {
    const button = make("button", "choice", label);
    button.type = "button"; button.dataset.platform = id; button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      selected = id;
      document.querySelectorAll(".choice").forEach((choice) => {
        const active = choice.dataset.platform === id;
        choice.classList.toggle("active", active);
        choice.setAttribute("aria-pressed", String(active));
      });
      el("keywords").disabled = false; el("findBtn").disabled = false;
      el("helper").textContent = "Try a mood, genre, setting, favorite mechanic, or a mix of them.";
      clearError(); el("keywords").focus();
    });
    list.append(button);
  }
  wrap.append(list); el("platformGroups").append(wrap);
}
el("settingsBtn").addEventListener("click", () => {
  const saved = keys();
  el("groqKey").value = saved.groqKey; el("rawgKey").value = saved.rawgKey;
  showModal("settingsBackdrop");
});
el("saveKeys").addEventListener("click", () => {
  localStorage.setItem("go-groq", el("groqKey").value.trim());
  localStorage.setItem("go-rawg", el("rawgKey").value.trim());
  hideModal("settingsBackdrop"); clearError();
});
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => hideModal(button.dataset.close)));
document.querySelectorAll(".dialog-backdrop").forEach((backdrop) => backdrop.addEventListener("click", (event) => {
  if (event.target === backdrop) hideModal(backdrop.id);
}));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") document.querySelectorAll(".dialog-backdrop.show").forEach((modal) => hideModal(modal.id));
});
async function post(path, body) {
  const result = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...body, ...keys() }) });
  const data = await result.json();
  if (!result.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}
function renderGames(data) {
  el("grid").replaceChildren();
  el("resultsSub").textContent = data.games.length + " picks for " + data.platform + " · " + data.keywords;
  for (const game of data.games) {
    const card = make("button", "card"); card.type = "button";
    const thumb = make("div", "thumb");
    if (game.image) {
      const image = make("img"); image.src = game.image; image.alt = "Artwork for " + game.title; image.loading = "lazy";
      thumb.append(image);
    } else thumb.append(make("span", "thumb-fallback", "✦"));
    if (game.rating) thumb.append(make("span", "score", "★ " + game.rating));
    const body = make("div", "cardbody");
    body.append(make("div", "meta", game.genres.join(" · ") || "Game"));
    body.append(make("h3", "", game.title));
    body.append(make("p", "reason", game.reason));
    if (game.note) body.append(make("div", "notice", game.note));
    const foot = make("div", "card-foot");
    foot.append(make("span", "", game.year + " · " + data.platform));
    foot.append(make("span", "arrow", "↗")); body.append(foot);
    card.append(thumb, body);
    card.addEventListener("click", () => openDetail(game));
    el("grid").append(card);
  }
  el("results").scrollIntoView({ behavior: "smooth", block: "start" });
}
el("searchForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const keywords = el("keywords").value.trim();
  if (!selected || keywords.length < 3) return;
  const saved = keys();
  if (!saved.groqKey || !saved.rawgKey) {
    el("settingsBtn").click(); showError("Add both free API keys, then run your search."); return;
  }
  clearError(); el("loading").classList.add("show"); el("findBtn").disabled = true;
  el("findBtn").textContent = "Searching...";
  try {
    const data = await post("/api/recommend", { platform: selected, keywords });
    searchPlatform = selected; currentKeywords = keywords; renderGames(data);
  } catch (error) { showError(error.message); }
  finally {
    el("loading").classList.remove("show"); el("findBtn").disabled = false;
    el("findBtn").textContent = "Find my games   ✦";
  }
});
async function openDetail(game) {
  el("detailContent").className = "detail-wait";
  el("detailContent").textContent = "Loading game details...";
  showModal("detailBackdrop");
  try {
    const data = await post("/api/detail", { id: game.id, platform: searchPlatform, keywords: currentKeywords });
    const root = el("detailContent");
    root.className = ""; root.replaceChildren();
    if (data.image) {
      const wrap = make("div", "detail-image"), image = make("img");
      image.src = data.image; image.alt = "Artwork for " + data.title;
      wrap.append(image); root.append(wrap);
    }
    const inner = make("div", "dialog-inner");
    inner.append(make("div", "detail-kicker", (data.genres.join(" · ") || "Game") + " · " + (data.released || "Release unknown")));
    const title = make("h2", "", data.title); title.id = "detailTitle"; inner.append(title);
    if (data.fit) inner.append(make("p", "", data.fit));
    if (data.note) inner.append(make("div", "notice", data.note));
    const overview = make("div", "detail-section");
    overview.append(make("h3", "", "What to expect"));
    overview.append(make("p", "", data.expect || data.synopsis || "Explore the game details on RAWG."));
    inner.append(overview);
    const video = make("div", "detail-section"), videoLinks = make("div", "link-list");
    video.append(make("h3", "", "Gameplay & video"));
    data.videos.forEach((item) => videoLinks.append(link(item.url, item.label || "Watch trailer")));
    data.videoSearches.forEach((item) => videoLinks.append(link(item.url, item.label)));
    if (!videoLinks.childElementCount) videoLinks.append(link("https://www.youtube.com/results?search_query=" + encodeURIComponent(data.title + " gameplay"), "Find gameplay on YouTube"));
    video.append(videoLinks); inner.append(video);
    const reviews = make("div", "detail-section"), reviewLinks = make("div", "link-list");
    reviews.append(make("h3", "", "Reviews & game page"));
    data.reviews.forEach((item) => reviewLinks.append(link(item.url, item.label)));
    reviews.append(reviewLinks); inner.append(reviews); root.append(inner);
  } catch (error) {
    el("detailContent").className = "detail-wait"; el("detailContent").textContent = error.message;
  }
}
