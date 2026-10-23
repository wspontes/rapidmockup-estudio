import { createServer } from "node:http"
import { readFile, stat } from "node:fs/promises"
import { extname, join, normalize, resolve } from "node:path"

const root = resolve(process.argv[2] || process.cwd())
const port = +(process.argv[3] || 8099)

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".obj": "text/plain; charset=utf-8",
  ".mtl": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".dds": "application/octet-stream",
  ".hdr": "application/octet-stream",
}

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0])
    if (p === "/") p = "/index.html"
    const file = join(root, normalize(p).replace(/^([/\\])+/, ""))
    if (!file.startsWith(root)) {
      res.writeHead(403).end("forbidden")
      return
    }
    const st = await stat(file)
    if (!st.isFile()) throw new Error("not a file")
    const body = await readFile(file)
    res.writeHead(200, {
      "Content-Type": MIME[extname(file).toLowerCase()] || "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    })
    res.end(body)
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("404")
  }
}).listen(port, () => console.log(`mockup-local em http://localhost:${port}`))
