/*
  Fleet · the course's live delivery server, on Cloudflare Workers.
  https://fleet.lopin.me

  GET  /                        the dispatcher map: every courier, live (SSE)
  GET  /teacher                 the control page: bots, drop every connection, reset
  GET  /courier                 WebSocket: one courier (see README for the messages)
  GET  /orders                  the active orders, JSON
  GET  /orders/:id              one order: route, status, position, ETA
  GET  /orders/:id/events       SSE: one order's events, with Last-Event-ID replay
  POST /orders/:id/messages     { "text": "…" }: the customer writes to the courier
  GET  /fleet/events            SSE: every courier's position, once a second

  Teacher routes, with Authorization: Bearer <TEACHER_KEY> (a wrangler secret):
  POST /_drop                   close every WebSocket and SSE stream; state is kept
  POST /_reset                  forget every courier and order
  PUT  /_bots { "count": n }    0–30 simulated couriers
  GET  /_stats                  counts of couriers, connections and streams

  One Durable Object instance ("class") holds everything.
*/
import { Fleet } from "./fleet.js";
import { dispatcherPage, teacherPage } from "./pages.js";

export { Fleet };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Last-Event-ID",
  "Access-Control-Max-Age": "86400",
};

const json = (status, data, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", ...CORS, ...headers } });
const html = (body) =>
  new Response(body, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" } });

function withCors(response) {
  if (response.status === 101) return response; // a WebSocket upgrade: pass it through untouched
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function teacherOnly(request, env) {
  if (!env.TEACHER_KEY) return json(503, { error: "not_configured", message: "Set the secret: npx wrangler secret put TEACHER_KEY" });
  if (request.headers.get("Authorization") !== `Bearer ${env.TEACHER_KEY}`) {
    return json(401, { error: "unauthorized", message: "Teacher route: Authorization: Bearer <TEACHER_KEY>" }, { "WWW-Authenticate": 'Bearer realm="fleet-teacher"' });
  }
  return null;
}

const PUBLIC = /^\/(courier|orders|orders\/[A-Z0-9]{4}(\/events|\/messages)?|fleet\/events)$/;
const TEACHER = /^\/_(drop|reset|bots|stats)$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = (url.pathname.replace(/\/+$/, "") || "/")
      .replace(/^\/orders\/([a-z0-9]{4})(?=\/|$)/i, (_, id) => `/orders/${id.toUpperCase()}`);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (path === "/" && request.method === "GET") return html(dispatcherPage());
    if (path === "/teacher" && request.method === "GET") return html(teacherPage());
    if (path === "/health") return json(200, { ok: true });
    if (TEACHER.test(path)) {
      const denied = teacherOnly(request, env);
      if (denied) return denied;
    } else if (!PUBLIC.test(path)) {
      return json(404, { error: "not_found", message: "See https://fleet.lopin.me/ for the routes." });
    }
    const fleet = env.FLEET.get(env.FLEET.idFromName("class"));
    const forwarded = new Request(new URL(path + url.search, url.origin), request);
    return withCors(await fleet.fetch(forwarded));
  },
};
