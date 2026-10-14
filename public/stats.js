const $ = (id) => document.getElementById(id);
const number = (value) => new Intl.NumberFormat("en-US").format(value || 0);

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: "same-origin", ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Please try again.");
  return payload;
}

if (document.body.dataset.signedIn === "true") {
  let range = 7;
  async function refresh() {
    const status = $("status");
    status.classList.remove("error");
    status.textContent = "Loading statistics…";
    try {
      const data = await request("/api/stats-data?days=" + range);
      const totals = data.totals;
      $("unique").textContent = number(totals.unique);
      $("returning").textContent = number(totals.returning);
      $("returnRate").textContent = totals.returnRate + "% of visits came back";
      $("bounceRate").textContent = totals.bounceRate + "%";
      $("apiTotal").textContent = number(totals.recommend + totals.detail);
      $("recommend").textContent = number(totals.recommend);
      $("detail").textContent = number(totals.detail);
      $("apiOk").textContent = number(totals.recommendOk + totals.detailOk);
      $("apiErrors").textContent = number(totals.recommend + totals.detail - totals.recommendOk - totals.detailOk);
      const chart = $("chart");
      chart.replaceChildren();
      const highest = Math.max(1, ...data.days.map((day) => day.sessions));
      data.days.forEach((day, index) => {
        const slot = document.createElement("div");
        slot.className = "bar-slot";
        slot.title = day.date + ": " + number(day.sessions) + " visits";
        const bar = document.createElement("div");
        bar.className = "bar";
        bar.style.height = Math.max(2, day.sessions / highest * 138) + "px";
        slot.append(bar);
        if (range === 7 || index % 5 === 0 || index === data.days.length - 1) {
          const label = document.createElement("small");
          label.textContent = day.date.slice(5);
          slot.append(label);
        }
        chart.append(slot);
      });
      chart.setAttribute("aria-label", data.days.map((day) => day.date + ": " + day.sessions + " visits").join("; "));
      const rows = $("dailyRows");
      rows.replaceChildren();
      [...data.days].reverse().forEach((day) => {
        const tr = document.createElement("tr");
        [day.date, day.sessions, day.unique, day.returning, Math.max(0, day.sessions - day.engaged), day.recommend, day.detail].forEach((value) => {
          const td = document.createElement("td");
          td.textContent = typeof value === "number" ? number(value) : value;
          tr.append(td);
        });
        rows.append(tr);
      });
      $("updatedAt").textContent = "Updated " + new Date(data.updatedAt).toLocaleString();
      $("dashboardContent").hidden = false;
      status.textContent = totals.sessions ? "Showing the last " + range + " days." : "No visits recorded yet. Counts start after this feature is deployed.";
    } catch (error) {
      status.textContent = error.message;
      status.classList.add("error");
    }
  }
  document.querySelectorAll("[data-days]").forEach((button) => button.addEventListener("click", () => {
    range = Number(button.dataset.days);
    document.querySelectorAll("[data-days]").forEach((item) => item.classList.toggle("selected", item === button));
    refresh();
  }));
  $("refreshBtn").addEventListener("click", refresh);
  $("logoutBtn").addEventListener("click", async () => {
    await fetch("/api/stats-logout", { method: "POST", credentials: "same-origin" });
    location.reload();
  });
  refresh();
} else {
  $("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.submitter;
    button.disabled = true;
    const errorNode = $("loginError");
    errorNode.hidden = true;
    try {
      await request("/api/stats-login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: $("password").value })
      });
      location.reload();
    } catch (error) {
      errorNode.textContent = error.message;
      errorNode.hidden = false;
      button.disabled = false;
    }
  });
}
