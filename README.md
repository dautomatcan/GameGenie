# Game Orbit

An AI game finder for PC, PlayStation, Xbox, Nintendo handhelds and consoles, and Capcom CPS arcade boards.

## How it works

1. Select a platform before entering keywords.
2. Groq's free-tier openai/gpt-oss-120b model proposes real titles and explains the fit.
3. The server searches RAWG for exact title matches, checks platform listings where available, and returns RAWG thumbnails.
4. Opening a game fetches its catalog details, asks the model for a focused gameplay summary, and shows available trailers, YouTube gameplay and review searches, and RAWG or Metacritic review links.

Switch 2 and CPS board listings may be incomplete in RAWG. Matches for these platforms are visibly marked when the exact release or board cannot be verified.

## API keys

The private Site lets each visitor add their own free [Groq API key](https://console.groq.com/keys) and [RAWG API key](https://rawg.io/apidocs) in **API settings**. They are stored in that browser's local storage and sent to the Site server with each request. They are never included in published source or URLs.

For a centrally configured deployment, set GROQ_API_KEY and RAWG_API_KEY as server-side environment variables. The worker prefers those values over browser-provided keys. The current interface still asks visitors to add keys; change that UI if you configure server-side keys for all users.

## Local build

This is a dependency-free Sites Worker ESM project.

Run:

    bash scripts/build.sh
    node scripts/validate-artifact.mjs

The build embeds public/index.html, public/styles.css, and public/app.js into dist/server/index.js. Deploy the built artifact with the Sites workflow. RAWG attribution is included on the page.

## API selection

Groq lists openai/gpt-oss-120b on its free plan with 30 requests per minute and 1,000 requests per day, and supports JSON output. This makes it suitable for short recommendation and detail responses. RAWG's free plan supplies searchable game metadata and images with attribution. Free-tier limits and provider availability may change.
