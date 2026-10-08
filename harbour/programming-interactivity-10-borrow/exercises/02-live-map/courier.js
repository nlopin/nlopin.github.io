// Exercise 2 · Live map · the courier, over a WebSocket.
// The protocol is in the brief: hello, position, message up;
// welcome, order, status, message, error down.
import { map as createMap, tileLayer, polyline, circleMarker } from "leaflet";

const SERVER = "wss://fleet.lopin.me/courier";
const STATUS_TEXT = { to_pickup: "to the restaurant", picked_up: "to the customer", delivered: "delivered" };

const form = document.querySelector("#start");
const status = document.querySelector("#status");
const orderId = document.querySelector("#order-id");
const routeText = document.querySelector("#route");
const orderStatus = document.querySelector("#order-status");
const notes = document.querySelector("#notes");

const map = createMap("map").setView([41.392, 2.175], 14);
tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);
const routeLine = polyline([], { color: "#2f6fdf", weight: 5, opacity: 0.5 }).addTo(map);
const me = circleMarker([41.392, 2.175], { radius: 9, color: "#1b1f24", fillColor: "#ff4f8b", fillOpacity: 1 }).addTo(map);

let ws = null;
let order = null;
let index = 0; // where we are on order.route
let driving = null;

form.addEventListener("submit", (event) => {
  event.preventDefault();
  form.hidden = true;
  connect(new FormData(form).get("name"));
});

// TODO 1: open a WebSocket to SERVER and keep it in `ws`.
// On open: send the hello. On message: give the parsed JSON to handle().
// On close: stopDriving() and show the close code in the status line.
function connect(name) {
  status.textContent = "Connecting…";
}

// TODO 2: react to each message from the server (the "down" rows of the protocol).
// welcome: say you're connected, then startOrder(message.order, message.resumeAt).
// order: startOrder(message.order, 0). status: show STATUS_TEXT[message.status]
// in orderStatus. message: addNote(message.text). error: console.warn it.
function handle(message) {
}

// Shows an order and starts driving its route from point `at`.
function startOrder(next, at) {
  order = next;
  index = at;
  orderId.textContent = order.id;
  routeText.textContent = `${order.pickup.name} → ${order.dropoff.name}`;
  orderStatus.textContent = STATUS_TEXT[order.status];
  routeLine.setLatLngs(order.route);
  map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
  startDriving();
}

// A fake GPS: step() runs once a second, the speed the server's ETA assumes.
function startDriving() {
  stopDriving();
  step();
  driving = setInterval(step, 1000);
}

function stopDriving() {
  clearInterval(driving);
  driving = null;
}

// TODO 3: one second of driving. order.route is a list of [lat, lon] points.
// Take the point at `index`, move the `me` marker there, and send it to the
// server as a position. Then move `index` on; at the last point, stopDriving():
// the next order arrives a few seconds after the delivery.
function step() {
}

function addNote(text) {
  const li = document.createElement("li");
  li.textContent = text;
  notes.append(li);
}
