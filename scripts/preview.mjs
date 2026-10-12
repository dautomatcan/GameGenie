import { createServer } from "node:http";
import worker from "../dist/server/index.js";

const port = Number(process.env.PORT || 8787);
createServer(async (incoming, outgoing) => {
  try {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const request = new Request("http://localhost:" + port + incoming.url, {
      method: incoming.method,
      headers: incoming.headers,
      ...(body.length ? { body } : {})
    });
    const result = await worker.fetch(request, {});
    outgoing.writeHead(result.status, Object.fromEntries(result.headers));
    outgoing.end(Buffer.from(await result.arrayBuffer()));
  } catch (error) {
    outgoing.writeHead(500);
    outgoing.end(error.message);
  }
}).listen(port, "127.0.0.1", () => console.log("Local: http://localhost:" + port));
