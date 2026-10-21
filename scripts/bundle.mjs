import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
let source = await readFile(resolve(root, "worker/main.js"), "utf8");
const platforms = JSON.parse(await readFile(resolve(root, "data/platforms.json"), "utf8"));
const cpsGames = JSON.parse(await readFile(resolve(root, "data/cps-games.json"), "utf8"));
source = source.replace("__PLATFORMS__", JSON.stringify(platforms));
source = source.replace("__CPS_GAMES__", JSON.stringify(cpsGames));
for (const [token, path] of [
  ["__PAGE__", "public/index.html"],
  ["__CSS__", "public/styles.css"],
  ["__CLIENT__", "public/app.js"],
  ["__BROWSE_PAGE__", "public/browse.html"],
  ["__BROWSE_CSS__", "public/browse.css"],
  ["__BROWSE_CLIENT__", "public/browse.js"]
]) {
  let content = await readFile(resolve(root, path), "utf8");
  if (path === "public/app.js" || path === "public/browse.js") content = content.replace("__PLATFORMS__", JSON.stringify(platforms));
  source = source.replace(token, JSON.stringify(content));
  const name = path === "public/index.html" ? "index.html" : path.slice("public/".length);
  await writeFile(resolve(root, "dist/public", name), content);
}
await writeFile(resolve(root, "dist/server/index.js"), source);
for (const name of ["telemetry.js", "stats.js", "stats.css"]) {
  await writeFile(resolve(root, "dist/public", name), await readFile(resolve(root, "public", name)));
}
