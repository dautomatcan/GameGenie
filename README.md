# GameGenie

An AI game finder for PC, Android, iOS, PlayStation, Xbox, Nintendo handhelds and consoles, and Capcom CPS arcade boards.

## How it works

1. Choose English or Vietnamese on the welcome overlay or in the app. The selection stays in the current browser tab and changing it after a search refreshes the recommendations in that language.
2. Choose from 46 PC, mobile, console, handheld, and Capcom CPS arcade choices. The screenshot's download services and digital variants are excluded. You can type keywords before choosing a platform; a platform is required to search.
3. Groq's free-tier openai/gpt-oss-120b model proposes real titles and explains the fit in the selected language. Official game titles stay unchanged for catalog matching. The app shows up to nine verified picks and the dice button requests fresh titles without repeating earlier picks from the same search.
4. Where configured, the server verifies exact title and platform matches against IGDB and uses its screenshots or cover art. RAWG remains a fallback for catalog matching and artwork. Matches without sourced artwork are left out of the results.
5. Opening a game fetches its catalog details, asks the model for a focused gameplay summary in the selected language, and shows available videos, YouTube gameplay and review searches, and IGDB, RAWG, or Metacritic links.

The platform catalog and screenshot years are in data/platforms.json. IGDB lists 43 of the 46 platform choices separately. The three CPS arcade boards remain marked as unverified because IGDB and RAWG do not distinguish them. Artwork is fetched on demand for suggested games; the screenshot contains platform names, not a complete game list to bulk import.

## One-time owner setup

Visitors do not enter API keys. The server uses keys configured by the app owner, and the browser never receives them.

1. Create a free [Groq API key](https://console.groq.com/keys), a free [RAWG API key](https://rawg.io/apidocs), and a [Twitch developer application for IGDB](https://api-docs.igdb.com/).
2. Copy .env.example to .env.local in this folder.
3. Fill in GROQ_API_KEY, RAWG_API_KEY, IGDB_CLIENT_ID, and IGDB_CLIENT_SECRET in .env.local.
4. Start or restart the local preview.

The .env.local file is ignored by Git. You can also supply these values as process environment variables instead. Groq and RAWG are required for recommendations; without IGDB credentials, the app falls back to RAWG and marks unconfirmed platforms appropriately. IGDB access tokens are requested and renewed by the server.

For a public release, create a dedicated Groq project and key for this app and set conservative project rate limits. Keep the RAWG key in the server's secret store too. Visitors can use your app without seeing either key, but they can still consume your account quotas by making requests to the app.

## Key protection

Keys and the IGDB access token are read only by the server and are never returned to the browser. The API accepts same-origin JSON requests, caps request size, and applies a small local rate limit. The local preview listens only on 127.0.0.1.

Before making the app public, keep the keys in hosting secrets and configure a shared edge rate limiter such as Cloudflare's [Rate Limiting binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) as AI_RATE_LIMITER. Public endpoints can still be used by people who do not visit the page, so server-side keys alone cannot prevent quota abuse.

## Local preview

From this folder, run:

    npm run preview

Then open http://localhost:8787. Press Ctrl+C to stop the preview server. No dependency installation is needed.

Run npm test to rebuild and check the worker and its mocked recommendation flow.

## GitHub and Vercel later

This repository contains the source for the local preview. The app's AI and catalog requests run through a server worker, so GitHub Pages alone cannot serve the recommendation API. A future Vercel deployment needs a serverless adapter for the worker and the four API credentials configured as Vercel environment variables. Keep `.env.local` on your computer; it is ignored by Git and is not needed by visitors.

## Build

This is a dependency-free Sites Worker ESM project.

Run:

    bash scripts/build.sh
    node scripts/validate-artifact.mjs

The build embeds public/index.html, public/styles.css, and public/app.js into dist/server/index.js. IGDB and RAWG attribution is included on the page.

## API selection

Groq lists openai/gpt-oss-120b on its free plan and supports JSON output. IGDB provides platform-specific catalog data and images; RAWG supplies a fallback and review links. Free-tier limits and provider availability may change.
