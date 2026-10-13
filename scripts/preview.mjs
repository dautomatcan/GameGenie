import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import worker from "../dist/server/index.js";

const port = Number(process.env.PORT || 8787);
const localEnv = {};
try {
  const file = await readFile(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of file.split(/\r?\n/)) {
    const match = line.match(/^\s*(GROQ_API_KEY|RAWG_API_KEY|IGDB_CLIENT_ID|IGDB_CLIENT_SECRET)\s*=\s*(.*?)\s*$/);
    if (match) localEnv[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const runtimeEnv = {
  GROQ_API_KEY: process.env.GROQ_API_KEY || localEnv.GROQ_API_KEY || "",
  RAWG_API_KEY: process.env.RAWG_API_KEY || localEnv.RAWG_API_KEY || "",
  IGDB_CLIENT_ID: process.env.IGDB_CLIENT_ID || localEnv.IGDB_CLIENT_ID || "",
  IGDB_CLIENT_SECRET: process.env.IGDB_CLIENT_SECRET || localEnv.IGDB_CLIENT_SECRET || ""
};
createServer(async (incoming, outgoing) => {
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of incoming) {
      size += chunk.length;
      if (size > 4096) {
        outgoing.writeHead(413, { "content-type": "application/json", "cache-control": "no-store" });
        outgoing.end(JSON.stringify({ error: "Request is too large." }));
        return;
      }
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    const request = new Request("http://localhost:" + port + incoming.url, {
      method: incoming.method,
      headers: incoming.headers,
      ...(body.length ? { body } : {})
    });
    const result = await worker.fetch(request, runtimeEnv);
    outgoing.writeHead(result.status, Object.fromEntries(result.headers));
    outgoing.end(Buffer.from(await result.arrayBuffer()));
  } catch (error) {
    outgoing.writeHead(500);
    outgoing.end("Local preview error.");
  }
}).listen(port, "127.0.0.1", () => {
  console.log("Local: http://localhost:" + port);
  console.log(runtimeEnv.GROQ_API_KEY && runtimeEnv.RAWG_API_KEY ? "AI services configured" : "AI services need GROQ_API_KEY and RAWG_API_KEY in .env.local");
  console.log(runtimeEnv.IGDB_CLIENT_ID && runtimeEnv.IGDB_CLIENT_SECRET ? "IGDB platform verification configured" : "IGDB platform verification not configured");
});
