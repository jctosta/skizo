import { readFileSync, watch } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { basename, dirname } from "node:path";
import type { Io } from "../run";

const EVENTS = "/__skizo/events";
/** Served pages only: the written Preview must make no requests. */
const RELOAD = `<script>new EventSource("${EVENTS}").onmessage=()=>location.reload()</script>`;

/**
 * `preview --watch`: serves `html` on localhost and swaps in `rebuild()` whenever `source` is saved,
 * until `io.signal` aborts (Ctrl-C); then it closes everything and resolves 0.
 * `rebuild` returns the new Preview, or an exit code once it has printed why there is none.
 */
export async function watchPreview(
  source: string,
  html: string,
  rebuild: () => string | number,
  io: Io,
): Promise<number> {
  const pages = new Set<ServerResponse>(); // open event streams, one per open page
  let last = readFileSync(source, "utf8");
  const changed = () => {
    let text;
    try {
      text = readFileSync(source, "utf8");
    } catch {
      return; // mid atomic save: the rename fires another event
    }
    if (text === last) return;
    last = text;
    const next = rebuild();
    if (typeof next !== "string") return; // a failed check: keep serving the last good Preview
    html = next;
    for (const page of pages) page.write("data: reload\n\n");
  };

  // Watch the directory, not the file: an atomic save (temp file + rename) kills a watcher on the file.
  // Event types are unreliable after a rename, so any event naming the file counts (no name: maybe it).
  let timer: NodeJS.Timeout | undefined;
  const watcher = watch(dirname(source), (_event, name) => {
    if (name && name !== basename(source)) return;
    clearTimeout(timer);
    timer = setTimeout(changed, 50);
  });

  let hosts: string[] = []; // set once listening, when the port is known
  const server = createServer((req, res) => {
    // DNS rebinding: a foreign page whose name resolves to 127.0.0.1 still sends its own Host.
    if (!hosts.includes(req.headers.host ?? "")) {
      res.writeHead(403).end();
      return;
    }
    if (req.url === EVENTS) {
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
      res.write(": connected\n\n");
      pages.add(res);
      req.on("close", () => pages.delete(res));
      return;
    }
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(html.replace("</body>", `${RELOAD}\n</body>`));
  });
  await new Promise<void>((listening) => server.listen(0, "127.0.0.1", listening)); // port 0: never clashes
  const { port } = server.address() as AddressInfo;
  hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
  io.stdout(`Preview: http://127.0.0.1:${port}/\n`);

  if (!io.signal?.aborted) await new Promise((stop) => io.signal?.addEventListener("abort", stop, { once: true }));
  watcher.close();
  clearTimeout(timer);
  server.closeAllConnections();
  await new Promise((closed) => server.close(closed));
  return 0;
}
