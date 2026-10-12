import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
let source = await readFile(resolve(root, "worker/main.js"), "utf8");
for (const [token, path] of [
  ["__PAGE__", "public/index.html"],
  ["__CSS__", "public/styles.css"],
  ["__CLIENT__", "public/app.js"]
]) {
  source = source.replace(token, JSON.stringify(await readFile(resolve(root, path), "utf8")));
}
await writeFile(resolve(root, "dist/server/index.js"), source);
