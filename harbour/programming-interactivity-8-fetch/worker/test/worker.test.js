// Runs the Worker in Node with an in-memory stand-in for Durable Objects.
// node test/worker.test.js
import assert from "node:assert/strict";
import worker, { Market } from "../src/index.js";

// --- a fake MARKET binding: one Market per name, storage in a Map --------------------
const storages = new Map();
const instances = new Map();
function makeEnv({ fresh = false } = {}) {
  if (fresh) instances.clear(); // a new process: objects are rebuilt from storage
  return {
    MARKET: {
      idFromName: (name) => name,
      get: (id) => {
        if (!instances.has(id)) {
          if (!storages.has(id)) storages.set(id, new Map());
          const map = storages.get(id);
          const state = {
            storage: { get: async (k) => structuredClone(map.get(k)), put: async (k, v) => { map.set(k, structuredClone(v)); }, delete: async (k) => map.delete(k) },
            blockConcurrencyWhile: (fn) => fn(),
          };
          instances.set(id, new Market(state));
        }
        return instances.get(id);
      },
    },
  };
}
let env = makeEnv();
const BASE = "https://harbour-api.lopin.me";
const call = (path, init) => worker.fetch(new Request(BASE + path, init), env);
const post = (path, data, headers = {}) => call(path, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(data) });
let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log("✓", name); }

await test("the control page", async () => {
  const r = await call("/");
  assert.equal(r.status, 200);
  assert.match(await r.text(), /Harbour Market API/);
});

await test("no namespace: a 404 that explains the URL", async () => {
  const r = await call("/api/stalls");
  assert.equal(r.status, 404);
  assert.match((await r.json()).message, /your-github-username/);
});

await test("a bad namespace is a 400", async () => {
  assert.equal((await call("/-nope/api/stalls")).status, 400);
});

await test("the starter's placeholder is refused, with a message that says what to do", async () => {
  const r = await call("/YOUR-GITHUB-USERNAME/api/stalls");
  assert.equal(r.status, 400);
  assert.match((await r.json()).message, /your own GitHub username/);
});

await test("GET stalls: 10, JSON, CORS headers", async () => {
  const r = await call("/alice/api/stalls");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("access-control-allow-origin"), "*");
  assert.match(r.headers.get("access-control-expose-headers"), /X-Total-Count/);
  assert.equal(r.headers.get("x-total-count"), "10");
  assert.equal((await r.json()).length, 10);
});

await test("preflight: 204 with methods and headers", async () => {
  const r = await call("/alice/api/stalls/mezcal/reviews", { method: "OPTIONS", headers: { Origin: "http://localhost:8080", "Access-Control-Request-Method": "POST" } });
  assert.equal(r.status, 204);
  assert.match(r.headers.get("access-control-allow-methods"), /POST/);
  assert.match(r.headers.get("access-control-allow-headers"), /Authorization/);
});

await test("the API's errors pass through: 404, 415, 422, 405, 401, 403", async () => {
  assert.equal((await call("/alice/api/stalls/pizza")).status, 404);
  assert.equal((await call("/alice/api/stalls/mezcal/reviews", { method: "POST", body: "{}" })).status, 415);
  const r422 = await post("/alice/api/stalls/mezcal/reviews", { author: "A", rating: "5", text: "short" });
  assert.equal(r422.status, 422);
  assert.ok((await r422.json()).fields.rating);
  const r405 = await call("/alice/api/stalls", { method: "DELETE" });
  assert.equal(r405.status, 405);
  assert.equal(r405.headers.get("allow"), "GET, POST");
  assert.equal((await call("/alice/api/stalls/mezcal", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" })).status, 401);
  assert.equal((await call("/alice/api/stalls/mezcal", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: "Bearer vendor-taco-bike" }, body: "{}" })).status, 403);
});

await test("POST a review: 201 + Location, and it persists across a restart", async () => {
  const r = await post("/alice/api/stalls/mezcal/reviews", { author: "Alice", rating: 5, text: "Persisted between requests." });
  assert.equal(r.status, 201);
  const created = await r.json();
  assert.equal(r.headers.get("location"), `/alice/api/reviews/${created.id}`);
  assert.equal((await call(r.headers.get("location"))).status, 200, "the Location URL works");
  env = makeEnv({ fresh: true }); // the Durable Object is evicted and rebuilt from storage
  const list = await (await call("/alice/api/stalls/mezcal/reviews")).json();
  assert.ok(list.some((x) => x.id === created.id));
});

await test("namespaces are isolated", async () => {
  const bob = await (await call("/bob/api/stalls/mezcal/reviews")).json();
  assert.ok(!bob.some((x) => x.author === "Alice"));
  const alice = await (await call("/Alice/api/stalls/mezcal/reviews")).json(); // case-insensitive
  assert.ok(alice.some((x) => x.author === "Alice"));
});

await test("chaos: settings per namespace, 503s, and ?chaos=1 for one request", async () => {
  const bad = await call("/carol/api/_chaos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ latency: 99999 }) });
  assert.equal(bad.status, 422);
  const ok = await call("/carol/api/_chaos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ latency: 0, fail: 1 }) });
  assert.deepEqual(await ok.json(), { latency: 0, fail: 1 });
  const r = await call("/carol/api/stalls");
  assert.equal(r.status, 503);
  assert.equal(r.headers.get("retry-after"), "2");
  assert.equal((await call("/dave/api/stalls")).status, 200); // other namespaces unaffected
  await call("/carol/api/_chaos", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ latency: 0, fail: 0 }) });
  assert.equal((await call("/carol/api/stalls")).status, 200);
  const t = Date.now();
  const once = await call("/carol/api/stalls?chaos=1&tag=food");
  assert.ok(Date.now() - t >= 1100, "?chaos=1 adds latency");
  assert.ok([200, 503].includes(once.status));
  if (once.status === 200) assert.equal((await once.json()).length, 4, "the chaos param doesn't reach the API");
});

await test("reset: back to the seed data", async () => {
  assert.equal((await call("/alice/api/_reset", { method: "POST" })).status, 204);
  const list = await (await call("/alice/api/stalls/mezcal/reviews")).json();
  assert.ok(!list.some((x) => x.author === "Alice"));
  env = makeEnv({ fresh: true });
  const again = await (await call("/alice/api/stalls/mezcal/reviews")).json();
  assert.ok(!again.some((x) => x.author === "Alice"), "the reset is persisted");
});

await test("the search delay still applies (short queries are slower)", async () => {
  const t1 = Date.now(); await call("/erin/api/stalls?q=t"); const slow = Date.now() - t1;
  const t2 = Date.now(); await call("/erin/api/stalls?q=taco"); const fast = Date.now() - t2;
  assert.ok(slow > fast + 300, `${slow} vs ${fast}`);
});

await test("pagination Link headers point into the namespace", async () => {
  const r = await call("/alice/api/stalls?limit=4&page=1");
  assert.match(r.headers.get("link"), /<\/alice\/api\/stalls\?/);
});

await test("a namespace has limits", async () => {
  const m = env.MARKET.get("frank");
  await m.ready;
  m.api.db.reviews.length = 0;
  for (let i = 0; i < 500; i++) m.api.db.reviews.push({ id: "x" + i, stallId: "mezcal" });
  const r = await post("/frank/api/stalls/mezcal/reviews", { author: "F", rating: 3, text: "One review too many." });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).error, "namespace_full");
});

console.log(`\n${passed} passed`);
