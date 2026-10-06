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

    const stub = env.MARKET.get(env.MARKET.idFromName(namespace));
    const inner = new URL(match[2] + url.search, "https://market.internal");
    const response = await stub.fetch(new Request(inner, request));
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

/* ---- one market per namespace ------------------------------------------------ */
export class Market {
  constructor(state) {
    this.state = state;
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

    if (path === "/api/_chaos") return this.chaosEndpoint(request, method);
    if (path === "/api/_reset") {
      if (method !== "POST") return json(405, { error: "method_not_allowed", message: "POST /api/_reset" }, { Allow: "POST" });
      this.api = HarbourAPI.createAPI();
      await this.state.storage.delete("db");
      return new Response(null, { status: 204, headers: CORS });
    }

    const body = method === "GET" || method === "HEAD" ? null : await request.text();
    if (body && body.length > MAX_BODY) return json(413, { error: "too_large", message: "The body is larger than 100 kB." });

    const full = this.full(method, path);
    if (full) return json(409, { error: "namespace_full", message: `This market already has ${LIMITS[full]} ${full}. Reset it: POST /api/_reset.` });

    // chaos: this namespace's settings, or "?chaos=1" for one request
    const query = new URLSearchParams(url.searchParams);
    const chaos = query.has("chaos") ? { latency: 1200, fail: 0.3 } : this.chaos;
    query.delete("chaos");
    this.api.config.failRate = chaos.fail;

    const out = this.api.handle({ method, path, query, headers: Object.fromEntries(request.headers), body });
    if (method !== "GET" && method !== "HEAD" && out.status < 400) await this.state.storage.put("db", this.api.dump());

    const wait = (chaos.latency || 0) + (out.delay || 0);
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    return new Response(out.body == null ? null : JSON.stringify(out.body, null, 2), {
      status: out.status,
      statusText: out.statusText,
      headers: { ...out.headers, "Cache-Control": "no-store" },
    });
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
