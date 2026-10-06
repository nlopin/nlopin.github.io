#!/usr/bin/env node
/* ==========================================================================
   Harbour Market · a small HTTP server with no dependencies.

     npm start                         http://localhost:3000
     node server.js --port 4000        another port
     node server.js --latency 1500     every response waits 1.5 s
     node server.js --fail 0.3         30 % of API requests answer 503
     node server.js --cors             allow pages from any origin to call the API
     node server.js --cors http://localhost:8080   …or from one origin only
     node server.js --static ../solution           serve another front end

   It serves two things:
     /api/…   the Harbour Market API (logic in api-core.js, docs in api.html)
     /…       the static files of the market front end (../starter)
   ========================================================================== */
"use strict";
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { createAPI } = require("./api-core.js");

/* ---- options ------------------------------------------------------------ */
const args = process.argv.slice(2);
function option(name, fallback) {
  const i = args.indexOf("--" + name);
  if (i < 0) return fallback;
  const next = args[i + 1];
  return next === undefined || next.startsWith("--") ? true : next;
}
const PORT = Number(option("port", process.env.PORT || 3000));
const LATENCY = Number(option("latency", 0));
const FAIL = Number(option("fail", 0));
const CORS = option("cors", false); // false · true (any origin) · "http://origin"
// The front end to serve: --static, or the first of these that exists:
// ../starter (a student's copy), ../../.private/solution (the teacher's reference)
const FALLBACKS = ["../starter", "../../.private/solution"];
const STATIC = path.resolve(__dirname, String(option("static", FALLBACKS.find((p) => fs.existsSync(path.join(__dirname, p))) || "../starter")));
const SOCKET = option("socket", null); // a Unix socket path instead of a port (for testing)

const api = createAPI({ failRate: FAIL });

const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".ico": "image/x-icon", ".webp": "image/webp", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8",
};

/* ---- logging ------------------------------------------------------------- */
const colour = (status) => (status >= 500 ? 31 : status >= 400 ? 33 : status >= 300 ? 36 : 32);
function log(method, url, status, ms) {
  const tty = process.stdout.isTTY;
  const s = tty ? `\x1b[${colour(status)}m${status}\x1b[0m` : String(status);
  console.log(`${method.padEnd(6)} ${url}  ${s}  ${ms} ms`);
}

/* ---- CORS ---------------------------------------------------------------- */
function corsHeaders(req) {
  const origin = req.headers.origin;
  if (!CORS || !origin) return {};
  if (CORS !== true && CORS !== origin) return {}; // not on the list: no header, the browser blocks the response
  return {
    "Access-Control-Allow-Origin": CORS === true ? "*" : origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Expose-Headers": "Location, X-Total-Count, Link, Retry-After",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

/* ---- the API --------------------------------------------------------------- */
function serveAPI(req, res, url, started) {
  // A preflight: the browser asks before a non-simple cross-origin request
  if (req.method === "OPTIONS") {
    const h = corsHeaders(req);
    res.writeHead(h["Access-Control-Allow-Origin"] ? 204 : 403, h);
    res.end();
    log(req.method, url.pathname, res.statusCode, Date.now() - started);
    return;
  }
  const chunks = [];
  let size = 0;
  req.on("data", (c) => {
    size += c.length;
    if (size > 100_000) { req.destroy(); return; } // 100 kB is plenty for this API
    chunks.push(c);
  });
  req.on("end", () => {
    const out = api.handle({
      method: req.method,
      path: url.pathname,
      query: url.searchParams,
      headers: req.headers,
      body: chunks.length ? Buffer.concat(chunks).toString("utf8") : null,
    });
    const wait = LATENCY + (out.delay || 0);
    setTimeout(() => {
      const headers = Object.assign({ "Cache-Control": "no-store" }, out.headers, corsHeaders(req));
      res.writeHead(out.status, out.statusText, headers);
      res.end(out.body == null ? undefined : JSON.stringify(out.body, null, 2));
      log(req.method, url.pathname + url.search, out.status, Date.now() - started);
    }, wait);
  });
}

/* ---- static files -------------------------------------------------------------- */
function serveFile(req, res, url, started) {
  let rel;
  try { rel = decodeURIComponent(url.pathname); } catch { rel = "/"; }
  let file = path.join(STATIC, path.normalize(rel));
  if (!file.startsWith(STATIC)) { res.writeHead(403); res.end(); return; } // no ../ escapes
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) file = path.join(file, "index.html");
    fs.readFile(file, (err2, data) => {
      if (err2) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 · no such file: " + rel);
      } else {
        res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-cache" });
        res.end(data);
      }
      if (!/\.(css|js|svg|png|jpg|ico|webp|woff2)$/.test(rel)) log(req.method, rel, res.statusCode, Date.now() - started);
    });
  });
}

const server = http.createServer((req, res) => {
  const started = Date.now();
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api" || url.pathname.startsWith("/api/")) serveAPI(req, res, url, started);
  else serveFile(req, res, url, started);
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") console.error(`Port ${PORT} is taken. Is the server already running in another terminal? Or: node ${path.relative(process.cwd(), __filename)} --port ${PORT + 1}`);
  else console.error(e);
  process.exit(1);
});

server.listen(SOCKET || PORT, () => {
  const where = SOCKET ? SOCKET : `http://localhost:${PORT}`;
  console.log(`\n  🏮 Harbour Market · ${where}`);
  console.log(`     API      ${SOCKET ? "" : where}/api`);
  console.log(`     files    ${path.relative(process.cwd(), STATIC) || "."}`);
  const extras = [LATENCY && `latency ${LATENCY} ms`, FAIL && `fail rate ${FAIL}`, CORS && `CORS ${CORS === true ? "any origin" : CORS}`].filter(Boolean);
  if (extras.length) console.log(`     chaos    ${extras.join(" · ")}`);
  console.log("\n  Ctrl+C stops it. The data is in memory: a restart resets it.\n");
});
