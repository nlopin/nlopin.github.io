// The two pages the Worker serves itself: the dispatcher map (projector) and
// the teacher's control page. Leaflet comes from unpkg, pinned, with SRI.
import { LOOPS } from "./sim.js";

const LEAFLET_CSS = `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="anonymous">`;
const LEAFLET_JS = `<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin="anonymous"></script>`;

const BASE_CSS = `
  :root { --bg: #070d1a; --panel: #0b1426; --line: #1f3052; --ink: #e8eefc; --muted: #8599c2; --live: #b6ff3b; --warn: #ffb547; --bad: #ff6b5a; color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.45 system-ui, sans-serif; }
  code, .mono { font-family: ui-monospace, "SF Mono", Menlo, monospace; }
  a { color: #3ee6ff; }
  .pill { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.2rem 0.65rem; border: 1px solid var(--line); border-radius: 99px; font: 600 12px ui-monospace, Menlo, monospace; text-transform: uppercase; letter-spacing: 0.06em; }
  .pill::before { content: ""; width: 0.55rem; height: 0.55rem; border-radius: 50%; background: currentColor; }
  .pill.live { color: var(--live); } .pill.wait { color: var(--warn); } .pill.down { color: var(--bad); }
`;

export function dispatcherPage() {
  const stops = LOOPS.flatMap((loop) => loop.stops);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ctext y=%22.9em%22 font-size=%2290%22%3E🛵%3C/text%3E%3C/svg%3E">
<title>Fleet · dispatcher</title>
${LEAFLET_CSS}
<style>${BASE_CSS}
  body { display: grid; grid-template-columns: minmax(0, 1fr) 22rem; height: 100vh; }
  #map { height: 100vh; background: #0b1426; }
  aside { border-left: 1px solid var(--line); padding: 1rem; overflow-y: auto; }
  h1 { font-size: 1.3rem; margin: 0 0 0.4rem; }
  .row { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; margin-bottom: 0.8rem; color: var(--muted); }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { text-align: left; padding: 0.35rem 0.3rem; border-bottom: 1px solid var(--line); }
  th { color: var(--muted); font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; }
  td.id { font-family: ui-monospace, Menlo, monospace; font-weight: 700; }
  tr.bot td { color: var(--muted); }
  tr.off td { opacity: 0.5; }
  .api { margin-top: 1.5rem; color: var(--muted); font-size: 13px; }
  .api code { color: var(--ink); }
  /* OSM's standard tiles, darkened for a projector */
  .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9); }
  .leaflet-tooltip.name { background: #0b1426; color: #fff; border: 1px solid #1f3052; font: 600 12px system-ui, sans-serif; padding: 2px 6px; }
  .leaflet-tooltip.name::before { display: none; }
  @media (max-width: 800px) { body { grid-template-columns: 1fr; height: auto; } #map { height: 70vh; } aside { border-left: 0; } }
</style>
</head>
<body>
<div id="map"></div>
<aside>
  <h1>Fleet</h1>
  <div class="row"><span id="conn" class="pill wait">connecting</span><span id="count"></span></div>
  <table>
    <thead><tr><th>order</th><th>courier</th><th>status</th><th>eta</th></tr></thead>
    <tbody id="orders"></tbody>
  </table>
  <div class="api">
    <p><code id="wss">/courier</code> · WebSocket, a courier</p>
    <p><code>GET /orders</code> · the active orders</p>
    <p><code>GET /orders/:id/events</code> · SSE, one order</p>
    <p><code>POST /orders/:id/messages</code> · write to the courier</p>
    <p><code>GET /fleet/events</code> · SSE, this map</p>
  </div>
</aside>
${LEAFLET_JS}
<script>
const STOPS = ${JSON.stringify(stops)};
const map = L.map("map", { zoomControl: false }).setView([41.392, 2.175], 14);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);
document.getElementById("wss").textContent = (location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/courier";
for (const s of STOPS) {
  L.circleMarker([s.lat, s.lon], { radius: 5, color: s.kind === "restaurant" ? "#ffb547" : "#3ee6ff", weight: 2, fillOpacity: 0.2 })
    .bindTooltip(s.name).addTo(map);
}

const hue = (text) => [...text].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
const markers = new Map();
function draw(couriers) {
  const seen = new Set();
  for (const c of couriers) {
    seen.add(c.id);
    const color = c.bot ? "#a9b6d3" : "hsl(" + hue(c.name) + " 90% 60%)";
    let m = markers.get(c.id);
    if (!m) {
      m = L.circleMarker([c.lat, c.lon], { radius: c.bot ? 6 : 9, weight: 2 }).addTo(map);
      if (!c.bot) m.bindTooltip("", { permanent: true, direction: "right", className: "name", offset: [8, 0] });
      markers.set(c.id, m);
    }
    m.setLatLng([c.lat, c.lon]);
    m.setStyle({ color, fillColor: color, fillOpacity: c.online ? 0.85 : 0.1, dashArray: c.online ? null : "3 3" });
    if (!c.bot) m.setTooltipContent(c.name + (c.online ? "" : " · offline"));
  }
  for (const [id, m] of markers) if (!seen.has(id)) { m.remove(); markers.delete(id); }
  const humans = couriers.filter((c) => !c.bot);
  document.getElementById("count").textContent =
    humans.filter((c) => c.online).length + " couriers online · " + (couriers.length - humans.length) + " bots";
}

const conn = document.getElementById("conn");
const events = new EventSource("/fleet/events");
events.addEventListener("open", () => { conn.className = "pill live"; conn.textContent = "live"; });
events.addEventListener("error", () => {
  const closed = events.readyState === EventSource.CLOSED;
  conn.className = closed ? "pill down" : "pill wait";
  conn.textContent = closed ? "closed" : "reconnecting";
});
events.addEventListener("fleet", (e) => draw(JSON.parse(e.data).couriers));

const STATUS = { to_pickup: "to pickup", picked_up: "on the way", delivered: "delivered" };
const fmt = (s) => Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
async function refreshOrders() {
  try {
    const res = await fetch("/orders");
    if (!res.ok) return;
    const rows = (await res.json()).map((o) => {
      const tr = document.createElement("tr");
      tr.className = (o.bot ? "bot" : "") + (o.online ? "" : " off");
      for (const [text, cls] of [[o.id, "id"], [o.courier], [STATUS[o.status]], [o.status === "delivered" ? "–" : fmt(o.etaSeconds)]]) {
        const td = document.createElement("td");
        td.textContent = text;
        if (cls) td.className = cls;
        tr.append(td);
      }
      return tr;
    });
    document.getElementById("orders").replaceChildren(...rows);
  } catch {}
}
refreshOrders();
setInterval(refreshOrders, 3000);
</script>
</body>
</html>`;
}

export function teacherPage() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ctext y=%22.9em%22 font-size=%2290%22%3E🛵%3C/text%3E%3C/svg%3E">
<title>Fleet · teacher</title>
<style>${BASE_CSS}
  main { max-width: 40rem; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
  h1 { margin: 0 0 1rem; }
  section { border: 1px solid var(--line); border-radius: 10px; padding: 1rem 1.2rem; margin: 1rem 0; background: var(--panel); }
  h2 { font-size: 1rem; margin: 0 0 0.6rem; }
  p { margin: 0.4rem 0; color: var(--muted); }
  label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 0.3rem; }
  input { font: inherit; color: var(--ink); background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 0.45rem 0.6rem; width: 100%; }
  input[type=number] { width: 6rem; }
  button { font: 600 14px system-ui, sans-serif; padding: 0.55rem 1rem; border-radius: 6px; border: 1px solid var(--line); background: #13213d; color: var(--ink); cursor: pointer; }
  button.danger { background: #3a1212; border-color: #6b2323; }
  button.big { font-size: 18px; padding: 0.9rem 1.4rem; background: var(--warn); color: #1a1000; border: 0; }
  .inline { display: flex; gap: 0.6rem; align-items: end; flex-wrap: wrap; }
  #out { white-space: pre-wrap; font: 13px ui-monospace, Menlo, monospace; color: var(--muted); min-height: 1.5rem; }
  dl { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.6rem; margin: 0; }
  dt { font-size: 12px; color: var(--muted); } dd { margin: 0; font: 700 1.4rem ui-monospace, Menlo, monospace; }
</style>
</head>
<body>
<main>
  <h1>Fleet · teacher</h1>
  <section>
    <label for="key">Teacher key (kept in this browser)</label>
    <input id="key" type="password" autocomplete="off">
  </section>
  <section>
    <h2>Now</h2>
    <dl id="stats"></dl>
  </section>
  <section>
    <h2>Drop every connection</h2>
    <p>Closes every WebSocket (code 1012) and every SSE stream, as a server restart would. Couriers and orders stay: EventSource reconnects on its own and replays what it missed; a WebSocket client reconnects only if its code does.</p>
    <p><button class="big" data-action="drop">Drop all connections</button></p>
  </section>
  <section>
    <h2>Bots</h2>
    <div class="inline"><div><label for="bots">Simulated couriers, 0–30</label><input id="bots" type="number" min="0" max="30" value="6"></div><button data-action="bots">Set</button></div>
  </section>
  <section>
    <h2>Reset</h2>
    <p>Forgets every courier and order. Students' pages get new orders when they reconnect.</p>
    <p><button class="danger" data-action="reset">Reset the fleet</button></p>
  </section>
  <div id="out" role="status"></div>
</main>
<script>
const keyInput = document.getElementById("key");
try { keyInput.value = localStorage.getItem("fleet-key") ?? ""; } catch {}
keyInput.addEventListener("change", () => { try { localStorage.setItem("fleet-key", keyInput.value); } catch {} stats(); });
const out = document.getElementById("out");
const call = (method, path, body) => fetch(path, {
  method,
  headers: { Authorization: "Bearer " + keyInput.value, ...(body ? { "Content-Type": "application/json" } : {}) },
  body: body ? JSON.stringify(body) : undefined,
});
const ACTIONS = {
  drop: () => call("POST", "/_drop"),
  reset: () => confirm("Forget every courier and order?") && call("POST", "/_reset"),
  bots: () => call("PUT", "/_bots", { count: Number(document.getElementById("bots").value) }),
};
document.addEventListener("click", async (event) => {
  const action = event.target.closest("button")?.dataset.action;
  if (!action) return;
  const res = await ACTIONS[action]();
  if (!res) return;
  out.textContent = res.status + " " + JSON.stringify(await res.json());
  stats();
});
async function stats() {
  if (!keyInput.value) return;
  const res = await call("GET", "/_stats");
  if (!res.ok) { out.textContent = res.status + " " + (await res.json()).message; return; }
  const s = await res.json();
  document.getElementById("bots").value = s.bots;
  document.getElementById("stats").replaceChildren(...[
    ["couriers", s.couriers], ["online", s.online], ["bots", s.bots],
    ["WebSockets", s.sockets], ["SSE streams", s.streams], ["orders", s.orders],
  ].flatMap(([k, v]) => { const dt = document.createElement("dt"), dd = document.createElement("dd"); dt.textContent = k; dd.textContent = v; const d = document.createElement("div"); d.append(dt, dd); return [d]; }));
}
stats();
setInterval(stats, 3000);
</script>
</body>
</html>`;
}
