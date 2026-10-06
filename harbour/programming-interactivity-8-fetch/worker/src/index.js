/* ==========================================================================
   Harbour Market API · hosted on Cloudflare Workers.

     https://harbour-api.lopin.me/<namespace>/api/…

   Every namespace (a student's GitHub username) is its own market: one
   Durable Object each, with its own data, its own chaos settings, and a
   reset. The API's rules are ../project/server/api-core.js, the same file
   the local server and the exercise editors use.

   Course endpoints, per namespace:
     GET  /<ns>/api/_chaos          the current chaos settings
     PUT  /<ns>/api/_chaos          { "latency": 1200, "fail": 0.3 }
     POST /<ns>/api/_reset          back to the seed data
     ?chaos=1 on any request        slow and unreliable for that request only

   On top of the chaos settings, RANDOM_500_RATE (wrangler.toml, server-wide,
   students can't turn it off) answers that share of API requests with a 500
   before they reach the API.

   Teacher routes, with Authorization: Bearer <TEACHER_KEY> (a wrangler secret):
     GET /_markets                  every market: last activity, counts
     GET /<ns>/api/_dump            one market's stored data, whole
   ========================================================================== */
import HarbourAPI from "../../project/server/api-core.js";
import { controlPage } from "./control-page.js";

const NAMESPACE = /^[a-z0-9][a-z0-9-]{0,38}$/; // GitHub usernames, lower-cased
const MAX_BODY = 100_000;
const LIMITS = { reviews: 500, orders: 500, stalls: 60 }; // per namespace, so nobody fills the storage

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers": "Location, X-Total-Count, Link, Retry-After, Allow",
};
const PREFLIGHT = {
  ...CORS,
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "600",
};

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...CORS, ...headers },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/index.html") {
      return new Response(controlPage(url.origin), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    if (url.pathname === "/favicon.ico") return new Response(null, { status: 204 });

    if (url.pathname === "/_markets") {
      const denied = teacherOnly(request, env);
      if (denied) return denied;
      const registry = env.REGISTRY.get(env.REGISTRY.idFromName("all"));
      return registry.fetch(new Request("https://registry.internal/list"));
    }

    const match = url.pathname.match(/^\/([^/]+)(\/api(?:\/.*)?)$/);
    if (!match) {
      return json(404, {
        error: "not_found",
        message: `Every request names your market first: ${url.origin}/<your-github-username>/api/stalls`,
      });
    }
    const namespace = match[1].toLowerCase();
    if (namespace === "your-github-username") {
      return json(400, { error: "placeholder_namespace", message: "Replace YOUR-GITHUB-USERNAME in API (starter/js/api.js) with your own GitHub username." });
    }
    if (!NAMESPACE.test(namespace)) {
      return json(400, { error: "bad_namespace", message: "The first part of the path is your GitHub username: letters, digits and dashes." });
    }
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: PREFLIGHT });

    if (match[2] === "/api/_dump") {
      const denied = teacherOnly(request, env);
      if (denied) return denied;
    }

    const stub = env.MARKET.get(env.MARKET.idFromName(namespace));
    const inner = new URL(match[2] + url.search, "https://market.internal");
    const forwarded = new Request(inner, request);
    forwarded.headers.set("X-Market", namespace);
    forwarded.headers.set("X-Random-500", String(Number(env.RANDOM_500_RATE ?? 0) || 0));
    const response = await stub.fetch(forwarded);
    const headers = new Headers(response.headers);
    for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
    // the API speaks in /api/… paths; from outside, they live under /<namespace>
    const location = headers.get("Location");
    if (location?.startsWith("/api")) headers.set("Location", `/${namespace}${location}`);
    const link = headers.get("Link");
    if (link) headers.set("Link", link.replaceAll("</api", `</${namespace}/api`));
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};

function teacherOnly(request, env) {
  if (!env.TEACHER_KEY) return json(503, { error: "not_configured", message: "Set the secret: npx wrangler secret put TEACHER_KEY" });
  if (request.headers.get("Authorization") !== `Bearer ${env.TEACHER_KEY}`) {
    return json(401, { error: "unauthorized", message: "Teacher route: Authorization: Bearer <TEACHER_KEY>" }, { "WWW-Authenticate": 'Bearer realm="harbour-teacher"' });
  }
  return null;
}

/* ---- one market per namespace ------------------------------------------------ */
export class Market {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.lastReport = 0;
    this.chaos = { latency: 0, fail: 0 };
    this.ready = state.blockConcurrencyWhile(async () => {
      const saved = await state.storage.get("db");
      this.chaos = (await state.storage.get("chaos")) || this.chaos;
      this.api = HarbourAPI.createAPI(saved ? { state: saved } : {});
    });
  }

  async fetch(request) {
    await this.ready;
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const path = url.pathname;

    this.name = request.headers.get("X-Market") || this.name;
    if (path === "/api/_dump") return json(200, { market: this.name, chaos: this.chaos, ...this.api.dump() });
    if (path === "/api/_chaos") return this.chaosEndpoint(request, method);
    if (path === "/api/_reset") {
      if (method !== "POST") return json(405, { error: "method_not_allowed", message: "POST /api/_reset" }, { Allow: "POST" });
      this.api = HarbourAPI.createAPI();
      await this.state.storage.delete("db");
      return new Response(null, { status: 204, headers: CORS });
    }

    const body = method === "GET" || method === "HEAD" ? null : await request.text();
    if (body && body.length > MAX_BODY) return json(413, { error: "too_large", message: "The body is larger than 100 kB." });

    // the server-wide random failure: before the API, so nothing is stored
    const rate = Number(request.headers.get("X-Random-500")) || 0;
    if (rate && Math.random() < rate) {
      await this.report(false);
      return json(500, { error: "internal_error", message: "Something went wrong on the server. Try again." });
    }

    const full = this.full(method, path);
    if (full) return json(409, { error: "namespace_full", message: `This market already has ${LIMITS[full]} ${full}. Reset it: POST /api/_reset.` });

    // chaos: this namespace's settings, or "?chaos=1" for one request
    const query = new URLSearchParams(url.searchParams);
    const chaos = query.has("chaos") ? { latency: 1200, fail: 0.3 } : this.chaos;
    query.delete("chaos");
    this.api.config.failRate = chaos.fail;

    const out = this.api.handle({ method, path, query, headers: Object.fromEntries(request.headers), body });
    const wrote = method !== "GET" && method !== "HEAD" && out.status < 400;
    if (wrote) await this.state.storage.put("db", this.api.dump());
    await this.report(wrote);

    const wait = (chaos.latency || 0) + (out.delay || 0);
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    return new Response(out.body == null ? null : JSON.stringify(out.body, null, 2), {
      status: out.status,
      statusText: out.statusText,
      headers: { ...out.headers, "Cache-Control": "no-store" },
    });
  }

  // Tells the registry this market is alive: at most every 30 s, or after a write
  async report(wrote) {
    const now = Date.now();
    if (!this.env?.REGISTRY || !this.name || (!wrote && now - this.lastReport < 30_000)) return;
    this.lastReport = now;
    const db = this.api.db;
    const info = { name: this.name, lastSeen: new Date(now).toISOString(), reviews: db.reviews.length, orders: db.orders.length, saved: db.saved.size, stalls: db.stalls.length, chaos: this.chaos };
    try {
      await this.env.REGISTRY.get(this.env.REGISTRY.idFromName("all")).fetch(new Request("https://registry.internal/report", { method: "POST", body: JSON.stringify(info) }));
    } catch { /* the registry is a convenience: never fail a student's request for it */ }
  }

  full(method, path) {
    if (method !== "POST") return null;
    const db = this.api.db;
    if (/^\/api\/stalls\/[^/]+\/reviews\/?$/.test(path) && db.reviews.length >= LIMITS.reviews) return "reviews";
    if (/^\/api\/orders\/?$/.test(path) && db.orders.length >= LIMITS.orders) return "orders";
    if (/^\/api\/stalls\/?$/.test(path) && db.stalls.length >= LIMITS.stalls) return "stalls";
    return null;
  }

  async chaosEndpoint(request, method) {
    if (method === "GET") return json(200, this.chaos);
    if (method !== "PUT") return json(405, { error: "method_not_allowed", message: "GET or PUT /api/_chaos" }, { Allow: "GET, PUT" });
    let data;
    try { data = await request.json(); } catch { return json(400, { error: "bad_request", message: 'Send JSON: { "latency": 1200, "fail": 0.3 }' }); }
    const latency = Number(data?.latency ?? 0);
    const fail = Number(data?.fail ?? 0);
    if (!(latency >= 0 && latency <= 5000) || !(fail >= 0 && fail <= 1)) {
      return json(422, { error: "validation_failed", message: "latency: 0–5000 ms, fail: 0–1.", fields: { latency: "0–5000", fail: "0–1" } });
    }
    this.chaos = { latency: Math.round(latency), fail };
    await this.state.storage.put("chaos", this.chaos);
    return json(200, this.chaos);
  }
}

/* ---- the list of markets, for the teacher --------------------------------------- */
export class Registry {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    if (request.method === "POST") {
      const info = await request.json();
      await this.state.storage.put("m:" + info.name, info);
      return new Response(null, { status: 204 });
    }
    const entries = await this.state.storage.list({ prefix: "m:" });
    const markets = [...entries.values()].sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1));
    return json(200, { count: markets.length, markets });
  }
}
