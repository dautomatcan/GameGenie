// First-party visit counts use a random browser ID. No names, IP addresses, or game keywords are sent.
if (navigator.doNotTrack !== "1" && crypto.randomUUID) {
  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const getId = (storage, key) => {
    try {
      let value = storage.getItem(key);
      if (!valid.test(value || "")) {
        value = crypto.randomUUID();
        storage.setItem(key, value);
      }
      return value;
    } catch { return crypto.randomUUID(); }
  };
  let visitorId, sessionId;
  try {
    visitorId = getId(window.localStorage, "gamegenie-anon-visitor");
    sessionId = getId(window.sessionStorage, "gamegenie-anon-session");
  } catch { /* Some privacy modes block storage entirely. */ }
  if (visitorId && sessionId) {
    const send = (type) => fetch("/api/telemetry", {
      method: "POST", credentials: "same-origin", keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type, visitorId, sessionId })
    }).catch(() => null);
    const visit = send("visit");
    let engaged = false;
    const engage = async () => {
      if (engaged) return;
      engaged = true;
      await visit;
      await send("engage");
    };
    document.addEventListener("click", (event) => {
      if (event.target.closest("#enterApp, #findBtn, #rerollBtn, [data-lang], [data-theme-toggle], #grid button")) engage();
    });
    document.getElementById("keywords")?.addEventListener("input", engage, { once: true });
  }
}
