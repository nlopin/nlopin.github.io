// Exercise 2 · Live map · the customer's tracking page, over SSE.
import { map as createMap, tileLayer, polyline, circleMarker } from "leaflet";

const SERVER = "https://fleet.lopin.me";
const STATUS_TEXT = { to_pickup: "going to the restaurant", picked_up: "on the way to you", delivered: "delivered" };

const pick = document.querySelector("#pick");
const select = pick.elements.order;
const write = document.querySelector("#write");
const orderId = document.querySelector("#order-id");
const courierText = document.querySelector("#courier");
const orderStatus = document.querySelector("#order-status");
const eta = document.querySelector("#eta");
const connection = document.querySelector("#connection");
const notes = document.querySelector("#notes");

const map = createMap("map").setView([41.392, 2.175], 14);
tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);
const routeLine = polyline([], { color: "#2f6fdf", weight: 5, opacity: 0.5 }).addTo(map);
const pickup = circleMarker([0, 0], { radius: 7, color: "#b35900" });
const dropoff = circleMarker([0, 0], { radius: 7, color: "#1a7f37" });
const courier = circleMarker([0, 0], { radius: 9, color: "#1b1f24", fillColor: "#ff4f8b", fillOpacity: 1 });

let events = null;
let current = null; // the order id being tracked

// --- the list of orders: plain fetch, refreshed on request -------------------------

async function loadOrders() {
  const res = await fetch(`${SERVER}/orders`);
  const orders = await res.json();
  select.replaceChildren(...orders.map((o) => {
    const option = new Option(`${o.id} · ${o.courier}${o.bot ? " (bot)" : ""} · ${o.dropoff}`, o.id);
    option.selected = o.id === current;
    return option;
  }));
}
document.querySelector("#refresh").addEventListener("click", loadOrders);
loadOrders();

pick.addEventListener("submit", (event) => {
  event.preventDefault();
  track(select.value);
});

// --- one order, live --------------------------------------------------------------------

function track(id) {
  events?.close();
  current = id;
  notes.replaceChildren();
  events = new EventSource(`${SERVER}/orders/${id}/events`);

  events.addEventListener("open", () => setConnection("live", "Live"));
  events.addEventListener("error", () => {
    if (events.readyState === EventSource.CONNECTING) setConnection("waiting", "Reconnecting…");
    else setConnection("closed", "Closed");
  });

  // the whole order: on the first connection, or after missing too much
  events.addEventListener("order", (e) => {
    const order = JSON.parse(e.data);
    orderId.textContent = order.id;
    courierText.textContent = `${order.courier.name}${order.courier.online ? "" : " (offline)"}`;
    orderStatus.textContent = STATUS_TEXT[order.status];
    eta.textContent = formatEta(order.etaSeconds);
    routeLine.setLatLngs(order.route);
    pickup.setLatLng([order.pickup.lat, order.pickup.lon]).bindTooltip(order.pickup.name).addTo(map);
    dropoff.setLatLng([order.dropoff.lat, order.dropoff.lon]).bindTooltip(order.dropoff.name).addTo(map);
    courier.setLatLng([order.position.lat, order.position.lon]).addTo(map);
    map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
    notes.replaceChildren(...order.messages.map(noteItem));
  });

  events.addEventListener("position", (e) => {
    const { lat, lon, etaSeconds } = JSON.parse(e.data);
    courier.setLatLng([lat, lon]);
    eta.textContent = formatEta(etaSeconds);
  });

  events.addEventListener("status", (e) => {
    const { status } = JSON.parse(e.data);
    orderStatus.textContent = STATUS_TEXT[status];
    if (status === "delivered") eta.textContent = "";
  });

  events.addEventListener("message", (e) => notes.append(noteItem(JSON.parse(e.data))));

  events.addEventListener("courier", (e) => {
    const { online } = JSON.parse(e.data);
    courierText.textContent = courierText.textContent.replace(/ \(offline\)$/, "") + (online ? "" : " (offline)");
  });
}

// --- the customer writes back: SSE is one-way, so this is a POST ------------------------

write.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!current) return;
  const text = new FormData(write).get("text");
  const res = await fetch(`${SERVER}/orders/${current}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (res.ok) write.reset();
  else setConnection(connection.dataset.state, (await res.json()).message ?? `Not sent (${res.status})`);
});

function noteItem({ from, text }) {
  const li = document.createElement("li");
  li.textContent = `${from === "courier" ? "Courier" : "You"}: ${text}`;
  return li;
}

function formatEta(seconds) {
  return `arrives in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function setConnection(state, text) {
  connection.dataset.state = state;
  connection.textContent = text;
}
