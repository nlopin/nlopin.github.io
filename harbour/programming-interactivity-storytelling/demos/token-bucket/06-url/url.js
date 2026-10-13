// The state ⇄ a query string. The query string comes from whoever made the
// link, so every value is checked and clamped before it reaches the model.
import { mulberry32, traffic } from "./rng.js";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export function toSearch(state) {
  const p = new URLSearchParams({ cap: state.capacity, rate: state.rate, t: state.cursor.toFixed(1) });
  if (state.seed != null) p.set("seed", state.seed);
  else p.set("req", state.requests.map((t) => t.toFixed(2)).join(","));
  return "?" + p;
}

export function fromSearch(search, defaults) {
  const p = new URLSearchParams(search);
  const num = (key, fallback, min, max) => {
    const v = Number(p.get(key));
    return p.has(key) && Number.isFinite(v) ? clamp(v, min, max) : fallback;
  };
  const state = {
    capacity: Math.round(num("cap", defaults.capacity, 1, 8)),
    rate: num("rate", defaults.rate, 0.25, 4),
    cursor: num("t", defaults.cursor, 0, 10),
  };
  if (p.has("req")) {
    state.seed = null;
    state.requests = p.get("req").split(",").filter(Boolean).map(Number)
      .filter(Number.isFinite).slice(0, 200).map((t) => clamp(t, 0, 10));
  } else {
    state.seed = Math.floor(num("seed", defaults.seed, 1, 2 ** 31));
    state.requests = traffic(mulberry32(state.seed));
  }
  return state;
}
