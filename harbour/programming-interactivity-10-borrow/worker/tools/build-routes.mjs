// Builds src/routes.json: two delivery loops through Barcelona, along streets.
// Each loop alternates restaurant → customer → restaurant …, and its last leg
// returns to the first stop, so a courier can deliver forever.
// Routing: the public OSRM bike router (OpenStreetMap data, ODbL).
// node tools/build-routes.mjs
import { writeFile } from "node:fs/promises";

const ROUTER = "https://routing.openstreetmap.de/routed-bike/route/v1/driving/";
const STEP_M = 10; // one point every 10 m: one point per second at 36 km/h

const loops = [
  { name: "Eixample · Gràcia", stops: [
    { kind: "restaurant", name: "Plaça de Catalunya", at: [41.3870, 2.1700] },
    { kind: "customer", name: "Provença · Rambla de Catalunya", at: [41.3951, 2.1608] },
    { kind: "restaurant", name: "Plaça del Sol", at: [41.4010, 2.1568] },
    { kind: "customer", name: "Sagrada Família", at: [41.4036, 2.1744] },
    { kind: "restaurant", name: "Mercat de la Concepció", at: [41.3958, 2.1680] },
    { kind: "customer", name: "Sant Antoni", at: [41.3786, 2.1620] },
  ] },
  { name: "Ciutat Vella · Poblenou", stops: [
    { kind: "restaurant", name: "Mercat de Santa Caterina", at: [41.3862, 2.1782] },
    { kind: "customer", name: "Barceloneta", at: [41.3790, 2.1900] },
    { kind: "restaurant", name: "Rambla del Poblenou", at: [41.3990, 2.1990] },
    { kind: "customer", name: "Glòries", at: [41.4036, 2.1875] },
    { kind: "restaurant", name: "Arc de Triomf", at: [41.3910, 2.1806] },
    { kind: "customer", name: "El Born", at: [41.3845, 2.1830] },
  ] },
];

const R = 6371008.8;
const rad = (d) => (d * Math.PI) / 180;
function distance([lat1, lon1], [lat2, lon2]) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Points every STEP_M metres along a polyline, first and last point included.
function resample(line) {
  const out = [line[0]];
  let carry = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    const d = distance(a, b);
    let t = STEP_M - carry;
    while (t <= d) {
      const f = t / d;
      out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
      t += STEP_M;
    }
    carry = d - (t - STEP_M);
  }
  const last = line.at(-1);
  if (distance(out.at(-1), last) > 1) out.push(last);
  return out.map(([lat, lon]) => [Math.round(lat * 1e5) / 1e5, Math.round(lon * 1e5) / 1e5]);
}

async function leg(from, to) {
  const url = `${ROUTER}${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
  const res = await fetch(url, { headers: { "User-Agent": "programming-interactivity course (lopin.me)" } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  const { routes } = await res.json();
  return resample(routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]));
}

const result = { source: "Routes: OSRM bike profile on OpenStreetMap data, © OpenStreetMap contributors, ODbL", stepMetres: STEP_M, loops: [] };
for (const loop of loops) {
  const legs = [];
  for (let i = 0; i < loop.stops.length; i++) {
    const from = loop.stops[i].at, to = loop.stops[(i + 1) % loop.stops.length].at;
    legs.push(await leg(from, to));
    await new Promise((r) => setTimeout(r, 1100)); // the public router allows about one request a second
  }
  result.loops.push({ name: loop.name, stops: loop.stops.map(({ kind, name, at }) => ({ kind, name, lat: at[0], lon: at[1] })), legs });
  console.log(loop.name, legs.map((l) => `${(l.length * STEP_M / 1000).toFixed(1)} km`).join(" · "));
}
await writeFile(new URL("../src/routes.json", import.meta.url), JSON.stringify(result) + "\n");
