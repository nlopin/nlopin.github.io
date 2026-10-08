// The delivery simulation, as pure functions: orders from the route loops,
// progress along a route, ETA. No I/O here; fleet.js holds the state.
import routes from "./routes.json" with { type: "json" };

export const LOOPS = routes.loops;
export const STEP_M = routes.stepMetres; // metres between two route points
export const ARRIVED_POINTS = 2; // within 2 points (20 m) of a stop counts as there

// A loop's stops alternate restaurant, customer. Leg i goes from stop i to
// stop i + 1. Order slot k: from the previous customer to restaurant k,
// then to customer k. So a courier that finishes slot k starts slot k + 1
// exactly where it is.
export function slotCount(loop) {
  return LOOPS[loop].stops.length / 2;
}

export function orderRoute(loop, k) {
  const { stops, legs } = LOOPS[loop];
  const n = stops.length;
  const toPickup = legs[(2 * k - 1 + n) % n];
  const toDropoff = legs[2 * k];
  return {
    pickup: stops[2 * k],
    dropoff: stops[2 * k + 1],
    // the leg to the dropoff starts at the pickup: don't repeat that point
    route: [...toPickup, ...toDropoff.slice(1)],
    pickupIndex: toPickup.length - 1,
  };
}

export function nextSlot(loop, k) {
  return (k + 1) % slotCount(loop);
}

const R = 6371008.8;
const rad = (d) => (d * Math.PI) / 180;
export function distance([lat1, lon1], [lat2, lon2]) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Where along the route is a reported position? Search near the last known
// index only, so a route that passes the same corner twice doesn't jump.
// Progress never goes backwards.
export function progressIndex(route, from, position, ahead = 60) {
  let best = from, bestD = Infinity;
  const end = Math.min(route.length - 1, from + ahead);
  for (let i = Math.max(0, from); i <= end; i++) {
    const d = distance(route[i], position);
    if (d < bestD) { bestD = d; best = i; }
  }
  return { index: best, offRouteMetres: Math.round(bestD) };
}

// One route point per second: the remaining points are the remaining seconds.
export function etaSeconds(route, index) {
  return Math.max(0, route.length - 1 - index);
}

// The status an order should have at this index.
export function statusAt(order, index) {
  if (index >= order.route.length - 1 - ARRIVED_POINTS) return "delivered";
  if (index >= order.pickupIndex - ARRIVED_POINTS) return "picked_up";
  return "to_pickup";
}

const ID_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function randomId(length, random = Math.random) {
  let id = "";
  for (let i = 0; i < length; i++) id += ID_CHARS[Math.floor(random() * ID_CHARS.length)];
  return id;
}

export const CUSTOMER_NOTES = [
  "Ring twice, the bell is quiet.",
  "Leave it with the concierge, please.",
  "Third floor, no lift. Sorry!",
  "Can you bring extra napkins?",
  "I'm in the courtyard, call me when you're here.",
  "Door code is 4721.",
];

export const BOT_NAMES = ["Jordi", "Laia", "Pau", "Núria", "Marc", "Aina", "Oriol", "Clara", "Biel", "Martina", "Arnau", "Júlia"];
