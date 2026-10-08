// One Durable Object holds the whole fleet: every courier, every order, every
// open connection. State lives in memory only: a redeploy forgets it all.
//
// Couriers talk over a WebSocket (positions up; orders, statuses, messages down).
// Order trackers and the dispatcher map listen over SSE.
import {
  LOOPS, slotCount, orderRoute, nextSlot, progressIndex, etaSeconds, statusAt,
  randomId, CUSTOMER_NOTES, BOT_NAMES,
} from "./sim.js";

const encoder = new TextEncoder();
const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
};
const STATUSES = ["to_pickup", "picked_up", "delivered"];
const EVENTS_KEPT = 120;        // per order, for Last-Event-ID replay
const RETRY_MS = 2000;          // the reconnection delay EventSource is told to use
const HEARTBEAT_TICKS = 15;     // an SSE comment every 15 s keeps proxies from closing idle streams
const BOT_PICKUP_TICKS = 4;     // a bot waits at the restaurant
const NEXT_ORDER_TICKS = 3;     // seconds between a delivery and the next order
const HELLO_TIMEOUT_MS = 10_000;
const MIN_POSITION_MS = 150;    // faster position updates are ignored
const ORDER_TTL_MS = 30 * 60_000;
const COURIER_TTL_MS = 30 * 60_000;
export const MAX_COURIERS = 150;
export const MAX_BOTS = 30;
const MAX_NAME = 24;
const MAX_TEXT = 200;

const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
const frame = ({ id, type, data }) => `${id === undefined ? "" : `id: ${id}\n`}event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;

export class Fleet {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.now = () => Date.now();
    this.random = Math.random;
    this.couriers = new Map(); // id → courier
    this.orders = new Map();   // id → order
    this.sockets = new Set();  // { ws, courier, openedAt }
    this.streams = new Set();  // every open SSE stream
    this.fleetSubs = new Set();
    this.ticks = 0;
    this.timer = null;
    this.setBots(Number(env.BOTS ?? 6));
  }

  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    let m;
    if (path === "/courier") return this.connectCourier(request);
    if (path === "/fleet/events" && method === "GET") return this.fleetEvents();
    if (path === "/orders" && method === "GET") return json(200, this.listOrders());
    if ((m = path.match(/^\/orders\/([A-Z0-9]{4})(\/events|\/messages)?$/))) {
      const order = this.orders.get(m[1]);
      if (!order) return json(404, { error: "not_found", message: `No order ${m[1]}. GET /orders lists the active ones.` });
      if (!m[2] && method === "GET") return json(200, this.snapshot(order));
      if (m[2] === "/events" && method === "GET") {
        return this.orderEvents(order, request.headers.get("Last-Event-ID") ?? url.searchParams.get("lastEventId"));
      }
      if (m[2] === "/messages" && method === "POST") return this.customerMessage(order, request);
      return json(405, { error: "method_not_allowed" });
    }
    if (path === "/_drop" && method === "POST") return json(200, this.dropAll());
    if (path === "/_reset" && method === "POST") return json(200, this.reset());
    if (path === "/_bots" && method === "PUT") {
      const body = await request.json().catch(() => null);
      const count = body?.count;
      if (!Number.isInteger(count) || count < 0 || count > MAX_BOTS) {
        return json(422, { error: "invalid", message: `count: an integer from 0 to ${MAX_BOTS}` });
      }
      this.setBots(count);
      return json(200, { bots: count });
    }
    if (path === "/_stats" && method === "GET") return json(200, this.stats());
    return json(404, { error: "not_found" });
  }

  // ---------------------------------------------------------------- orders

  freeSlot() {
    const used = new Map();
    for (const c of this.couriers.values()) {
      const key = `${c.loop}:${c.k}`;
      used.set(key, (used.get(key) ?? 0) + 1);
    }
    let best = [], fewest = Infinity;
    LOOPS.forEach((_, loop) => {
      for (let k = 0; k < slotCount(loop); k++) {
        const n = used.get(`${loop}:${k}`) ?? 0;
        if (n < fewest) { fewest = n; best = []; }
        if (n === fewest) best.push({ loop, k });
      }
    });
    return best[Math.floor(this.random() * best.length)];
  }

  assignOrder(courier, slot = this.freeSlot()) {
    const { loop, k } = slot;
    const { pickup, dropoff, route, pickupIndex } = orderRoute(loop, k);
    let id;
    do id = randomId(4, this.random); while (this.orders.has(id));
    const order = {
      id, courierId: courier.id, loop, k, pickup, dropoff, route, pickupIndex,
      status: "to_pickup", createdAt: this.now(), deliveredAt: null,
      seq: 0, events: [], subs: new Set(),
    };
    this.orders.set(id, order);
    Object.assign(courier, { loop, k, orderId: id, index: 0, lat: route[0][0], lon: route[0][1], waitTicks: 0 });
    return order;
  }

  nextOrder(courier) {
    const order = this.assignOrder(courier, { loop: courier.loop, k: nextSlot(courier.loop, courier.k) });
    this.send(courier, { type: "order", order: this.courierView(order) });
  }

  // Record an event for an order's trackers, and send it to the open ones.
  emit(order, type, data) {
    const event = { id: ++order.seq, type, data };
    order.events.push(event);
    if (order.events.length > EVENTS_KEPT) order.events.shift();
    const text = frame(event);
    for (const sub of order.subs) sub.write(text);
  }

  // A courier is at route index `index`, at [lat, lon].
  advance(courier, index, lat, lon) {
    const order = this.orders.get(courier.orderId);
    courier.lat = lat;
    courier.lon = lon;
    if (!order || order.status === "delivered") return;
    courier.index = index;
    this.emit(order, "position", { lat, lon, etaSeconds: etaSeconds(order.route, index), at: this.now() });
    const target = statusAt(order, index);
    // a jump from to_pickup straight to delivered still passes picked_up
    while (STATUSES.indexOf(order.status) < STATUSES.indexOf(target)) {
      this.setStatus(order, courier, STATUSES[STATUSES.indexOf(order.status) + 1]);
    }
  }

  setStatus(order, courier, status) {
    order.status = status;
    this.emit(order, "status", { status, at: this.now() });
    this.send(courier, { type: "status", orderId: order.id, status });
    if (status === "picked_up") {
      if (courier.bot) courier.waitTicks = BOT_PICKUP_TICKS;
      if (this.random() < 0.6) {
        this.messageToCourier(order, courier, CUSTOMER_NOTES[Math.floor(this.random() * CUSTOMER_NOTES.length)]);
      }
    }
    if (status === "delivered") {
      order.deliveredAt = this.now();
      courier.waitTicks = NEXT_ORDER_TICKS;
    }
  }

  messageToCourier(order, courier, text) {
    const at = this.now();
    this.emit(order, "message", { from: "customer", text, at });
    this.send(courier, { type: "message", orderId: order.id, from: "customer", text, at });
  }

  async customerMessage(order, request) {
    const body = await request.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text || text.length > MAX_TEXT) {
      return json(422, { error: "invalid", fields: { text: `1 to ${MAX_TEXT} characters` } });
    }
    if (order.status === "delivered") return json(409, { error: "delivered", message: "This order was already delivered." });
    this.messageToCourier(order, this.couriers.get(order.courierId), text);
    return json(201, { from: "customer", text });
  }

  // ---------------------------------------------------------------- views

  courierView(order) {
    const { id, pickup, dropoff, route, pickupIndex, status } = order;
    return { id, pickup, dropoff, route, pickupIndex, status };
  }

  position(order) {
    const c = this.couriers.get(order.courierId);
    if (c && c.orderId === order.id) return { lat: c.lat, lon: c.lon, index: c.index };
    const last = order.route.length - 1;
    return { lat: order.route[last][0], lon: order.route[last][1], index: last };
  }

  snapshot(order) {
    const c = this.couriers.get(order.courierId);
    const { lat, lon, index } = this.position(order);
    return {
      id: order.id,
      courier: { name: c?.name ?? "gone", bot: Boolean(c?.bot), online: Boolean(c?.online) },
      pickup: order.pickup,
      dropoff: order.dropoff,
      route: order.route,
      pickupIndex: order.pickupIndex,
      status: order.status,
      position: { lat, lon },
      etaSeconds: order.status === "delivered" ? 0 : etaSeconds(order.route, index),
      messages: order.events.filter((e) => e.type === "message").map((e) => e.data),
    };
  }

  listOrders() {
    const list = [];
    for (const order of this.orders.values()) {
      if (order.status === "delivered" && this.now() - order.deliveredAt > 120_000) continue;
      const c = this.couriers.get(order.courierId);
      list.push({
        id: order.id,
        courier: c?.name ?? "gone",
        bot: Boolean(c?.bot),
        online: Boolean(c?.online),
        status: order.status,
        pickup: order.pickup.name,
        dropoff: order.dropoff.name,
        etaSeconds: order.status === "delivered" ? 0 : etaSeconds(order.route, this.position(order).index),
        trackers: order.subs.size,
      });
    }
    return list.sort((a, b) => a.bot - b.bot || a.courier.localeCompare(b.courier));
  }

  fleetSnapshot() {
    return {
      at: this.now(),
      couriers: [...this.couriers.values()].map((c) => {
        const order = this.orders.get(c.orderId);
        return {
          id: c.bot ? c.id : c.id.slice(0, 6), // the full id resumes a courier: don't broadcast it
          name: c.name, bot: c.bot, online: c.online,
          lat: c.lat, lon: c.lon,
          orderId: c.orderId, status: order?.status ?? null,
          etaSeconds: order && order.status !== "delivered" ? etaSeconds(order.route, c.index) : 0,
        };
      }),
    };
  }

  stats() {
    let humans = 0, online = 0, bots = 0;
    for (const c of this.couriers.values()) {
      if (c.bot) bots++;
      else { humans++; if (c.online) online++; }
    }
    return { couriers: humans, online, bots, orders: this.orders.size, sockets: this.sockets.size, streams: this.streams.size };
  }

  // ---------------------------------------------------------------- SSE

  openStream(subs, onOpen) {
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const sub = {
      write: (text) => writer.write(encoder.encode(text)).catch(() => this.closeStream(sub)),
      end: () => writer.close().catch(() => {}),
      subs,
    };
    subs.add(sub);
    this.streams.add(sub);
    sub.write(`retry: ${RETRY_MS}\n\n`);
    onOpen(sub);
    this.startTicking();
    return new Response(readable, { headers: SSE_HEADERS });
  }

  closeStream(sub) {
    sub.subs.delete(sub);
    this.streams.delete(sub);
  }

  orderEvents(order, lastEventId) {
    return this.openStream(order.subs, (sub) => {
      const last = lastEventId === null || lastEventId === "" ? NaN : Number(lastEventId);
      const oldest = order.events[0]?.id ?? order.seq + 1;
      if (Number.isInteger(last) && last >= oldest - 1 && last <= order.seq) {
        // a reconnect: replay only what this client missed
        for (const event of order.events) if (event.id > last) sub.write(frame(event));
      } else {
        // a first connection, or too far behind: the whole state at once
        sub.write(frame({ id: order.seq, type: "order", data: this.snapshot(order) }));
      }
    });
  }

  fleetEvents() {
    return this.openStream(this.fleetSubs, (sub) => {
      sub.write(frame({ type: "fleet", data: this.fleetSnapshot() }));
    });
  }

  // ---------------------------------------------------------------- WebSocket

  connectCourier(request) {
    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return json(426, { error: "upgrade_required", message: "Connect with a WebSocket: new WebSocket(\"wss://…/courier\")" });
    }
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();
    const conn = { ws: server, courier: null, openedAt: this.now() };
    this.sockets.add(conn);
    server.addEventListener("message", (event) => this.onMessage(conn, event.data));
    server.addEventListener("close", () => this.onClose(conn));
    server.addEventListener("error", () => this.onClose(conn));
    this.startTicking();
    return new Response(null, { status: 101, webSocket: client });
  }

  reply(conn, data) {
    try { conn.ws.send(JSON.stringify(data)); } catch { this.onClose(conn); }
  }

  send(courier, data) {
    const conn = courier?.conn;
    if (conn) this.reply(conn, data);
  }

  onMessage(conn, raw) {
    if (raw === "ping") {
      try { conn.ws.send("pong"); } catch { this.onClose(conn); }
      return;
    }
    let msg;
    try { msg = JSON.parse(raw); } catch {
      return this.reply(conn, { type: "error", error: "bad_json", message: "Send JSON text, or the text \"ping\"." });
    }
    if (msg?.type === "hello") return this.hello(conn, msg);
    if (!conn.courier) {
      return this.reply(conn, { type: "error", error: "hello_first", message: "Send { \"type\": \"hello\", \"name\": \"…\" } first." });
    }
    if (msg.type === "position") return this.onPosition(conn.courier, msg);
    if (msg.type === "message") return this.courierMessage(conn, msg);
    return this.reply(conn, { type: "error", error: "unknown_type", message: "Types: hello, position, message." });
  }

  hello(conn, msg) {
    if (conn.courier) return this.reply(conn, { type: "error", error: "already_hello", message: "One hello per connection." });
    const known = typeof msg.courierId === "string" ? this.couriers.get(msg.courierId) : undefined;
    let courier;
    if (known && !known.bot) {
      courier = known;
      if (courier.conn && courier.conn !== conn) {
        // the same courier opened a second connection: the newest one wins
        const old = courier.conn;
        old.courier = null;
        this.sockets.delete(old);
        try { old.ws.close(4000, "Replaced by a newer connection"); } catch {}
      }
    } else {
      let humans = 0;
      for (const c of this.couriers.values()) if (!c.bot) humans++;
      if (humans >= MAX_COURIERS) {
        this.reply(conn, { type: "error", error: "full", message: "The fleet is full." });
        try { conn.ws.close(1013, "Try again later"); } catch {}
        return;
      }
      const name = typeof msg.name === "string" && msg.name.trim() ? msg.name.trim().slice(0, MAX_NAME) : "Courier";
      courier = { id: `c_${randomId(10, this.random)}`, name, bot: false };
      this.couriers.set(courier.id, courier);
      this.assignOrder(courier);
    }
    conn.courier = courier;
    courier.conn = conn;
    courier.online = true;
    courier.lastSeen = this.now();
    const order = this.orders.get(courier.orderId);
    if (known && order) this.emit(order, "courier", { online: true, at: this.now() });
    this.reply(conn, { type: "welcome", courierId: courier.id, name: courier.name, resumeAt: courier.index, order: this.courierView(order) });
  }

  onPosition(courier, msg) {
    const { lat, lon } = msg;
    if (![lat, lon].every(Number.isFinite) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return this.send(courier, { type: "error", error: "bad_position", message: "position: { lat, lon } in degrees" });
    }
    const now = this.now();
    if (now - (courier.lastPositionAt ?? 0) < MIN_POSITION_MS) return;
    courier.lastPositionAt = now;
    courier.lastSeen = now;
    const order = this.orders.get(courier.orderId);
    if (!order || order.status === "delivered") {
      courier.lat = lat;
      courier.lon = lon;
      return;
    }
    const { index } = progressIndex(order.route, courier.index, [lat, lon]);
    this.advance(courier, index, lat, lon);
  }

  courierMessage(conn, msg) {
    const text = typeof msg.text === "string" ? msg.text.trim() : "";
    if (!text || text.length > MAX_TEXT) {
      return this.reply(conn, { type: "error", error: "bad_message", message: `message: { text } of 1 to ${MAX_TEXT} characters` });
    }
    const order = this.orders.get(conn.courier.orderId);
    if (order) this.emit(order, "message", { from: "courier", text, at: this.now() });
  }

  onClose(conn) {
    if (!this.sockets.delete(conn)) return;
    const courier = conn.courier;
    if (courier && courier.conn === conn) {
      courier.conn = null;
      courier.online = false;
      courier.lastSeen = this.now();
      const order = this.orders.get(courier.orderId);
      if (order) this.emit(order, "courier", { online: false, at: this.now() });
    }
  }

  // ---------------------------------------------------------------- the clock

  startTicking() {
    if (this.timer || this.env.NO_TIMERS) return;
    this.timer = setInterval(() => this.tick(), 1000);
  }

  tick() {
    this.ticks++;
    const now = this.now();
    for (const courier of this.couriers.values()) {
      const order = this.orders.get(courier.orderId);
      if (courier.waitTicks > 0) {
        courier.waitTicks--;
        if (courier.waitTicks === 0 && order?.status === "delivered") this.nextOrder(courier);
        continue;
      }
      if (courier.bot && order && order.status !== "delivered") {
        const index = Math.min(courier.index + 1, order.route.length - 1);
        const [lat, lon] = order.route[index];
        this.advance(courier, index, lat, lon);
      }
    }
    if (this.fleetSubs.size) {
      const text = frame({ id: this.ticks, type: "fleet", data: this.fleetSnapshot() });
      for (const sub of this.fleetSubs) sub.write(text);
    }
    if (this.ticks % HEARTBEAT_TICKS === 0) {
      for (const sub of this.streams) sub.write(": heartbeat\n\n");
    }
    for (const conn of this.sockets) {
      if (!conn.courier && now - conn.openedAt > HELLO_TIMEOUT_MS) {
        try { conn.ws.close(1008, "No hello within 10 s"); } catch {}
        this.onClose(conn);
      }
    }
    if (this.ticks % 60 === 0) this.prune(now);
    if (!this.sockets.size && !this.streams.size && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  prune(now) {
    for (const [id, c] of this.couriers) {
      if (!c.bot && !c.online && now - c.lastSeen > COURIER_TTL_MS) this.couriers.delete(id);
    }
    const current = new Set([...this.couriers.values()].map((c) => c.orderId));
    for (const [id, order] of this.orders) {
      if (current.has(id) || order.subs.size) continue;
      if (now - (order.deliveredAt ?? order.createdAt) > ORDER_TTL_MS) this.orders.delete(id);
    }
  }

  // ---------------------------------------------------------------- teacher

  setBots(count) {
    const bots = [...this.couriers.values()].filter((c) => c.bot);
    for (const bot of bots.slice(count)) this.couriers.delete(bot.id);
    for (let i = bots.length; i < count; i++) {
      const bot = { id: `bot_${i + 1}`, name: `Bot · ${BOT_NAMES[i % BOT_NAMES.length]}`, bot: true, online: true };
      this.couriers.set(bot.id, bot);
      const order = this.assignOrder(bot);
      // spread the bots along their routes instead of starting them all at a stop
      const index = Math.floor(this.random() * order.pickupIndex);
      Object.assign(bot, { index, lat: order.route[index][0], lon: order.route[index][1] });
    }
  }

  // Close every connection, as a server restart would. State is kept, so
  // couriers can resume and trackers can replay what they missed.
  dropAll() {
    const sockets = this.sockets.size, streams = this.streams.size;
    for (const conn of [...this.sockets]) {
      try { conn.ws.close(1012, "Server restart"); } catch {}
      this.onClose(conn);
    }
    for (const sub of [...this.streams]) {
      sub.end();
      this.closeStream(sub);
    }
    return { closed: { sockets, streams } };
  }

  reset() {
    const closed = this.dropAll().closed;
    const bots = [...this.couriers.values()].filter((c) => c.bot).length;
    this.couriers.clear();
    this.orders.clear();
    this.setBots(bots);
    return { closed, bots };
  }
}
