// Runs the Worker in Node with stand-ins for the Workers runtime:
// a Durable Object binding, WebSocketPair, and a Response that allows 101.
// No timers: the test calls tick() itself.
// node test/worker.test.js
import assert from "node:assert/strict";
import { orderRoute, nextSlot, slotCount, progressIndex, distance, LOOPS } from "../src/sim.js";

// --- the runtime pieces Node doesn't have ------------------------------------------
const NativeResponse = Response;
globalThis.Response = class extends NativeResponse {
  constructor(body, init = {}) {
    if (init.status !== 101) { super(body, init); return; }
    super(body, { ...init, status: 200 });
    Object.defineProperty(this, "status", { value: 101 });
    this.webSocket = init.webSocket;
  }
};

class FakeSocket {
  constructor() { this.listeners = {}; this.received = []; this.closed = null; this.peer = null; }
  addEventListener(type, fn) { (this.listeners[type] ??= []).push(fn); }
  dispatch(type, event) { for (const fn of this.listeners[type] ?? []) fn(event); }
  accept() {}
  send(data) {
    if (this.closed) throw new Error("closed");
    this.peer.received.push(data);
    this.peer.dispatch("message", { data });
  }
  close(code = 1000, reason = "") {
    if (this.closed) return;
    this.closed = { code, reason };
    this.peer.closed ??= { code, reason };
    this.peer.dispatch("close", { code, reason });
  }
  // the client's view: JSON messages received so far
  messages() { return this.received.filter((m) => m !== "pong").map((m) => JSON.parse(m)); }
  last(type) { return this.messages().filter((m) => m.type === type).at(-1); }
}
globalThis.WebSocketPair = function () {
  const client = new FakeSocket(), server = new FakeSocket();
  client.peer = server;
  server.peer = client;
  return { 0: client, 1: server };
};

const { default: worker, Fleet } = await import("../src/index.js");

// --- one fake Durable Object namespace ----------------------------------------------
const TEACHER_KEY = "test-teacher-key";
let clock = 1_000_000;
const instances = new Map();
function makeEnv() {
  const env = { BOTS: "6", TEACHER_KEY, NO_TIMERS: "1" };
  env.FLEET = {
    idFromName: (name) => name,
    get: (id) => {
      if (!instances.has(id)) {
        const fleet = new Fleet({}, env);
        fleet.now = () => clock;
        instances.set(id, fleet);
      }
      return instances.get(id);
    },
  };
  return env;
}
const env = makeEnv();
const fleet = () => env.FLEET.get("class");
const BASE = "https://fleet.lopin.me";
const call = (path, init) => worker.fetch(new Request(BASE + path, init), env);
const teacher = (method, path, body) => call(path, {
  method,
  headers: { Authorization: `Bearer ${TEACHER_KEY}`, ...(body ? { "Content-Type": "application/json" } : {}) },
  body: body ? JSON.stringify(body) : undefined,
});
const tick = (n = 1) => { for (let i = 0; i < n; i++) { clock += 1000; fleet().tick(); } };

async function connect(hello) {
  const res = await call("/courier", { headers: { Upgrade: "websocket" } });
  assert.equal(res.status, 101);
  const ws = res.webSocket;
  if (hello) ws.send(JSON.stringify({ type: "hello", ...hello }));
  return ws;
}
// Drive a courier along its route by sending the route's own points.
function drive(ws, order, from, to) {
  for (let i = from; i <= to; i++) {
    clock += 200;
    ws.send(JSON.stringify({ type: "position", lat: order.route[i][0], lon: order.route[i][1] }));
  }
}

// --- SSE: read what has been written so far ------------------------------------------
// A read that loses the race to the timeout is still pending: keep it for the
// next call, or its chunk is lost.
const decoder = new TextDecoder();
const pending = new WeakMap();
async function readSse(reader, ms = 15) {
  let text = "";
  for (;;) {
    if (!pending.has(reader)) pending.set(reader, reader.read());
    const next = await Promise.race([pending.get(reader), new Promise((r) => setTimeout(() => r(null), ms))]);
    if (!next) return { text, done: false };
    pending.delete(reader);
    if (next.done) return { text, done: true };
    text += decoder.decode(next.value);
  }
}
function parseSse(text) {
  return text.split("\n\n").filter((block) => block.includes("data:")).map((block) => {
    const event = { type: "message" };
    for (const line of block.split("\n")) {
      const [, field, value] = line.match(/^(\w+): ?(.*)$/) ?? [];
      if (field === "id") event.id = Number(value);
      if (field === "event") event.type = value;
      if (field === "data") event.data = JSON.parse(value);
    }
    return event;
  });
}
async function track(id, lastEventId) {
  const res = await call(`/orders/${id}/events`, lastEventId === undefined ? {} : { headers: { "Last-Event-ID": String(lastEventId) } });
  assert.equal(res.status, 200);
  return res.body.getReader();
}

let passed = 0;
async function test(name, fn) { await fn(); passed++; console.log("✓", name); }

// --- the routes ------------------------------------------------------------------------
await test("routes: each order starts where the previous one ended", () => {
  LOOPS.forEach((_, loop) => {
    for (let k = 0; k < slotCount(loop); k++) {
      const a = orderRoute(loop, k), b = orderRoute(loop, nextSlot(loop, k));
      assert.deepEqual(b.route[0], a.route.at(-1));
      assert.ok(distance(a.route[a.pickupIndex], [a.pickup.lat, a.pickup.lon]) < 80, "the pickup is on the route");
      assert.ok(distance(a.route.at(-1), [a.dropoff.lat, a.dropoff.lon]) < 80, "the route ends at the dropoff");
      assert.ok(a.route.length > 100, "an order takes minutes, not seconds");
    }
  });
});

await test("progressIndex: near the last index, never backwards", () => {
  const { route } = orderRoute(0, 0);
  assert.equal(progressIndex(route, 10, route[30]).index, 30);
  assert.equal(progressIndex(route, 50, route[20]).index, 50);
});

// --- pages, CORS, teacher routes ---------------------------------------------------------
await test("the dispatcher and teacher pages", async () => {
  const page = await call("/");
  assert.equal(page.status, 200);
  assert.match(await page.text(), /EventSource\("\/fleet\/events"\)/);
  assert.match(await (await call("/teacher")).text(), /Drop all connections/);
});

await test("unknown paths are 404; /courier without an upgrade is 426", async () => {
  assert.equal((await call("/nope")).status, 404);
  const r = await call("/courier");
  assert.equal(r.status, 426);
  assert.match((await r.json()).message, /WebSocket/);
});

await test("CORS: every response, and preflights", async () => {
  const r = await call("/orders");
  assert.equal(r.headers.get("access-control-allow-origin"), "*");
  const pre = await call("/orders/ABCD/messages", { method: "OPTIONS" });
  assert.equal(pre.status, 204);
  assert.match(pre.headers.get("access-control-allow-headers"), /Content-Type/);
});

await test("teacher routes need the key", async () => {
  assert.equal((await call("/_stats")).status, 401);
  assert.equal((await call("/_drop", { method: "POST", headers: { Authorization: "Bearer wrong" } })).status, 401);
  const s = await (await teacher("GET", "/_stats")).json();
  assert.equal(s.bots, 6);
});

await test("bots: six orders on start, and the count can change", async () => {
  const orders = await (await call("/orders")).json();
  assert.equal(orders.length, 6);
  assert.ok(orders.every((o) => o.bot && o.status === "to_pickup"));
  assert.equal((await teacher("PUT", "/_bots", { count: 31 })).status, 422);
  assert.equal((await teacher("PUT", "/_bots", { count: 2 })).status, 200);
  assert.equal((await (await teacher("GET", "/_stats")).json()).bots, 2);
});

await test("bots move one route point per tick", async () => {
  const bot = fleet().couriers.get("bot_1");
  const before = bot.index;
  tick(3);
  assert.equal(bot.index, before + 3);
});

// --- a courier over WebSocket ---------------------------------------------------------------
let ana, anaId, anaOrder;
await test("hello: a welcome with an id and an order with its route", async () => {
  ana = await connect({ name: "Ana" });
  const w = ana.last("welcome");
  assert.match(w.courierId, /^c_/);
  assert.equal(w.name, "Ana");
  assert.equal(w.resumeAt, 0);
  assert.ok(w.order.route.length > 100);
  assert.equal(w.order.status, "to_pickup");
  anaId = w.courierId;
  anaOrder = w.order;
  const listed = (await (await call("/orders")).json()).find((o) => o.id === anaOrder.id);
  assert.equal(listed.courier, "Ana");
  assert.equal(listed.bot, false);
});

await test("the protocol's errors, and ping/pong", async () => {
  const ws = await connect();
  ws.send(JSON.stringify({ type: "position", lat: 41, lon: 2 }));
  assert.equal(ws.last("error").error, "hello_first");
  ws.send("{nope");
  assert.equal(ws.last("error").error, "bad_json");
  ws.send("ping");
  assert.equal(ws.received.at(-1), "pong");
  ws.send(JSON.stringify({ type: "hello", name: "Bo" }));
  ws.send(JSON.stringify({ type: "hello", name: "Bo" }));
  assert.equal(ws.last("error").error, "already_hello");
  ws.send(JSON.stringify({ type: "position", lat: "41", lon: 2 }));
  assert.equal(ws.last("error").error, "bad_position");
  ws.send(JSON.stringify({ type: "teleport" }));
  assert.equal(ws.last("error").error, "unknown_type");
  ws.close();
});

await test("an order id is case-insensitive in the URL", async () => {
  const r = await call(`/orders/${anaOrder.id.toLowerCase()}`);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).courier.name, "Ana");
});

let tracker, lastId;
await test("SSE: a new tracker gets the whole order first, then each position", async () => {
  tracker = await track(anaOrder.id);
  let { text } = await readSse(tracker);
  assert.match(text, /^retry: 2000\n\n/);
  const [first] = parseSse(text);
  assert.equal(first.type, "order");
  assert.equal(first.data.courier.name, "Ana");
  assert.equal(first.data.route.length, anaOrder.route.length);
  drive(ana, anaOrder, 1, 5);
  const events = parseSse((await readSse(tracker)).text);
  assert.deepEqual(events.map((e) => e.type), ["position", "position", "position", "position", "position"]);
  assert.ok(events.every((e, i) => i === 0 || e.id === events[i - 1].id + 1), "ids count up");
  assert.equal(events.at(-1).data.etaSeconds, anaOrder.route.length - 1 - 5);
  lastId = events.at(-1).id;
});

await test("SSE: a reconnect with Last-Event-ID gets only what it missed", async () => {
  await tracker.cancel();
  drive(ana, anaOrder, 6, 8);
  const again = await track(anaOrder.id, lastId);
  const events = parseSse((await readSse(again)).text);
  assert.deepEqual(events.map((e) => e.id), [lastId + 1, lastId + 2, lastId + 3]);
  assert.ok(events.every((e) => e.type === "position"));
  tracker = again;
});

await test("SSE: an unknown or future Last-Event-ID gets the whole order", async () => {
  const r = await track(anaOrder.id, 999_999);
  assert.equal(parseSse((await readSse(r)).text)[0].type, "order");
  await r.cancel();
});

await test("the customer writes, the courier receives it over the WebSocket", async () => {
  const bad = await call(`/orders/${anaOrder.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: " " }) });
  assert.equal(bad.status, 422);
  const r = await call(`/orders/${anaOrder.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "Ring twice" }) });
  assert.equal(r.status, 201);
  const m = ana.last("message");
  assert.equal(m.from, "customer");
  assert.equal(m.text, "Ring twice");
  ana.send(JSON.stringify({ type: "message", text: "Two minutes away" }));
  const events = parseSse((await readSse(tracker)).text).filter((e) => e.type === "message");
  assert.deepEqual(events.map((e) => [e.data.from, e.data.text]), [["customer", "Ring twice"], ["courier", "Two minutes away"]]);
});

await test("statuses come from the position: picked up, then delivered", async () => {
  drive(ana, anaOrder, 9, anaOrder.pickupIndex);
  assert.equal(ana.last("status").status, "picked_up");
  drive(ana, anaOrder, anaOrder.pickupIndex + 1, anaOrder.route.length - 1);
  assert.equal(ana.last("status").status, "delivered");
  const types = parseSse((await readSse(tracker)).text).map((e) => e.type);
  assert.ok(types.includes("status"));
  const late = await call(`/orders/${anaOrder.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: "Where?" }) });
  assert.equal(late.status, 409);
});

await test("three seconds after a delivery: the next order, starting where the last one ended", () => {
  tick(2);
  assert.equal(ana.last("order"), undefined);
  tick(1);
  const next = ana.last("order").order;
  assert.notEqual(next.id, anaOrder.id);
  assert.deepEqual(next.route[0], anaOrder.route.at(-1));
  anaOrder = next;
});

await test("the fleet stream: a snapshot, then one event a tick; ids are not leaked", async () => {
  const r = await call("/fleet/events");
  const reader = r.body.getReader();
  let events = parseSse((await readSse(reader)).text);
  assert.equal(events[0].type, "fleet");
  const me = events[0].data.couriers.find((c) => c.name === "Ana");
  assert.equal(me.online, true);
  assert.notEqual(me.id, anaId, "the full courier id resumes a courier");
  tick(1);
  events = parseSse((await readSse(reader)).text);
  assert.equal(events.length, 1);
  await reader.cancel();
});

// --- drop every connection, then resume ------------------------------------------------------
await test("drop: every WebSocket gets 1012, every SSE stream ends", async () => {
  drive(ana, anaOrder, 1, 4);
  const t = await track(anaOrder.id);
  const seen = parseSse((await readSse(t)).text);
  lastId = seen.at(-1).id;
  const r = await (await teacher("POST", "/_drop")).json();
  assert.ok(r.closed.sockets >= 1 && r.closed.streams >= 1);
  assert.equal(ana.closed.code, 1012);
  assert.equal((await readSse(t)).done, true);
  assert.equal(fleet().couriers.get(anaId).online, false);
  tracker = t;
});

await test("resume: the same courier id gets the same order and where it was", async () => {
  ana = await connect({ name: "Ana", courierId: anaId });
  const w = ana.last("welcome");
  assert.equal(w.courierId, anaId);
  assert.equal(w.order.id, anaOrder.id);
  assert.equal(w.resumeAt, 4);
  const replay = parseSse((await readSse(await track(anaOrder.id, lastId))).text);
  assert.deepEqual(replay.map((e) => [e.type, e.data.online]), [["courier", false], ["courier", true]]);
});

await test("a second connection for the same courier replaces the first", async () => {
  const second = await connect({ courierId: anaId });
  assert.equal(ana.closed.code, 4000);
  assert.equal(second.last("welcome").order.id, anaOrder.id);
  ana = second;
});

await test("an unknown courier id is a new courier", async () => {
  const ws = await connect({ name: "Cleo", courierId: "c_nothere" });
  assert.notEqual(ws.last("welcome").courierId, "c_nothere");
  ws.close();
});

await test("a connection without a hello is closed after 10 s", async () => {
  const ws = await connect();
  tick(11);
  assert.equal(ws.closed.code, 1008);
});

await test("reset forgets every courier; a resume then gets a new id", async () => {
  await teacher("POST", "/_reset");
  const s = await (await teacher("GET", "/_stats")).json();
  assert.deepEqual([s.couriers, s.sockets, s.streams, s.bots], [0, 0, 0, 2]);
  const ws = await connect({ name: "Ana", courierId: anaId });
  assert.notEqual(ws.last("welcome").courierId, anaId);
});

console.log(`\n${passed} passed`);
