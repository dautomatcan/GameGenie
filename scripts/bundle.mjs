import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
let source = await readFile(resolve(root, "worker/main.js"), "utf8");
const platforms = JSON.parse(await readFile(resolve(root, "data/platforms.json"), "utf8"));
source = source.replace("__PLATFORMS__", JSON.stringify(platforms));
for (const [token, path] of [
  ["__PAGE__", "public/index.html"],
  ["__CSS__", "public/styles.css"],
  ["__CLIENT__", "public/app.js"]
]) {
  let content = await readFile(resolve(root, path), "utf8");
  if (path === "public/app.js") content = content.replace("__PLATFORMS__", JSON.stringify(platforms));
  source = source.replace(token, JSON.stringify(content));
}
await writeFile(resolve(root, "dist/server/index.js"), source);
