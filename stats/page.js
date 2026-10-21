export function renderStatsPage(signedIn) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>GameGenie — Private statistics</title>
  <link rel="stylesheet" href="/stats.css">
  <script src="/stats.js" defer></script>
</head>
<body data-signed-in="${signedIn ? "true" : "false"}">
  <div class="wallpaper" aria-hidden="true"><span class="spark star-a">✦</span><span class="spark star-b">✳</span><span class="spark star-c">✦</span></div>
  <header class="toolbar"><a class="brand" href="/">✦ <span>GameGenie<span class="exe">.exe</span></span></a><span class="toolbar-tag">OWNER SPACE</span><a class="back" href="/">← Back to the app</a></header>
  <main class="shell">
    <div class="intro"><div class="eyebrow">PRIVATE CONTROL ROOM</div><h1>Your GameGenie stats <span>✦</span></h1><p>See how people discover games, and how often they come back.</p></div>
    ${signedIn ? `<section class="window dashboard" aria-label="Statistics dashboard">
      <div class="titlebar"><span>📊 &nbsp;Statistics.exe</span><span class="private-badge">🔒 PRIVATE</span></div>
      <div class="window-body">
        <div class="controls"><div class="range-switch" role="group" aria-label="Date range"><button type="button" data-days="7" class="selected">Last 7 days</button><button type="button" data-days="30">Last 30 days</button></div><button type="button" id="refreshBtn" class="secondary">↻ Refresh</button><button type="button" id="logoutBtn" class="secondary">Sign out</button></div>
        <p id="status" class="status" role="status">Loading statistics…</p>
        <div id="dashboardContent" hidden>
          <div class="metric-grid">
            <article class="metric peach"><span class="metric-icon">👀</span><span class="metric-label">Unique visitors</span><strong id="unique">—</strong><small>Distinct anonymous browsers in this period</small></article>
            <article class="metric lavender"><span class="metric-icon">↩</span><span class="metric-label">Returning visits</span><strong id="returning">—</strong><small id="returnRate">—</small></article>
            <article class="metric mint"><span class="metric-icon">↗</span><span class="metric-label">Bounce rate</span><strong id="bounceRate">—</strong><small>Visits with no app interaction</small></article>
            <article class="metric sky"><span class="metric-icon">🎮</span><span class="metric-label">API requests</span><strong id="apiTotal">—</strong><small>Recommendation and detail requests</small></article>
          </div>
          <div class="lower-grid">
            <section class="panel chart-panel"><div class="panel-head"><div><span class="eyebrow">AUDIENCE</span><h2>Visits over time</h2></div><span class="legend"><i></i> Visits</span></div><div id="chart" class="chart" role="img" aria-label="Daily visits chart"></div></section>
            <section class="panel api-panel"><div class="panel-head"><div><span class="eyebrow">APP API</span><h2>What people used</h2></div><span class="panel-icon">⚡</span></div><div class="api-row"><span>Game searches</span><strong id="recommend">—</strong></div><div class="api-row"><span>Game detail opens</span><strong id="detail">—</strong></div><div class="api-row"><span>Browse catalogue pages</span><strong id="browse">—</strong></div><div class="api-row"><span>Successful requests</span><strong id="apiOk">—</strong></div><div class="api-row"><span>Unsuccessful requests</span><strong id="apiErrors">—</strong></div></section>
          </div>
          <section class="panel table-panel"><div class="panel-head"><div><span class="eyebrow">DAILY LOG</span><h2>Day by day</h2></div><span class="panel-icon">🗓️</span></div><div class="table-wrap"><table><thead><tr><th>Date (UTC)</th><th>Visits</th><th>Unique</th><th>Returning</th><th>Bounced</th><th>Searches</th><th>Details</th><th>Browse</th></tr></thead><tbody id="dailyRows"></tbody></table></div></section>
        </div>
      </div>
      <div class="statusbar"><span>✦ Counts begin when tracking is deployed</span><span id="updatedAt">—</span></div>
    </section>` : `<section class="window login-window" aria-label="Owner sign in"><div class="titlebar"><span>🔒 &nbsp;Owner access</span><span class="private-badge">GAMEGENIE</span></div><div class="window-body"><div class="login-icon">✦</div><h2>Just for you.</h2><p>Enter your private owner password to view visitor and API statistics.</p><form id="loginForm"><label for="password">Owner password</label><input type="password" id="password" autocomplete="current-password" required><button class="primary" type="submit">Open statistics →</button></form><p class="error" id="loginError" role="alert" hidden></p></div><div class="statusbar"><span>🔐 Password stays on the server</span></div></section>`}
    <p class="fineprint">Visitors are counted with a random browser ID. GameGenie stores no visitor names or IP addresses in these statistics. “Returning” means a browser started another visit within the last year; clearing browser storage counts as a new visitor. API counts cover GameGenie requests that reach its functions, not activity on your provider accounts.</p>
  </main>
</body>
</html>`;
}
