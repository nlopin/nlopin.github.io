import { simulate, levelAt } from "./model.js";
import { renderBucket, renderTimeline, renderSentence, announce } from "./views.js";
import { attachEditing } from "./edit.js";
import { mulberry32, traffic } from "./rng.js";
import { toSearch, fromSearch } from "./url.js";

// The traffic is generated from a seed, so the seed is part of the state:
// it reproduces the requests exactly.
const DEFAULTS = { capacity: 4, rate: 1, seed: 7, cursor: 2 };
DEFAULTS.requests = traffic(mulberry32(DEFAULTS.seed));
let state = fromSearch(location.search, DEFAULTS);

const $ = (s) => document.querySelector(s);

function render() {
  const result = simulate(state);
  const level = levelAt(result.curve, state.cursor);
  renderBucket($("#bucket"), { capacity: state.capacity, level });
  renderTimeline($("#timeline"), { ...state, result, editable: true });
  renderSentence($("#sentence"), { ...state, result, level });
  announce($("#announce"), $("#sentence").textContent);
  $("#cursor").value = state.cursor;
  $("#cursor-out").textContent = `${state.cursor.toFixed(1)} s`;
  $("#capacity").value = state.capacity;
  $("#capacity-out").textContent = `${state.capacity} tokens`;
  $("#rate").value = state.rate;
  $("#rate-out").textContent = `${state.rate} / s`;
  $("#seed").value = state.seed ?? "";
  saveToURL();
}

// The address bar is one more view of the state. Updates are batched:
// a slider fires dozens of events a second, and Safari throttles replaceState.
let urlTimer;
function saveToURL() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(() => history.replaceState(null, "", toSearch(state)), 200);
}

// Links in the text open a state, and Back returns to the previous one.
function open(search) {
  clearTimeout(urlTimer);
  state = fromSearch(search, DEFAULTS);
  render();
}
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="?"]');
  if (!a) return;
  e.preventDefault();
  history.pushState(null, "", a.getAttribute("href"));
  open(location.search);
});
addEventListener("popstate", () => open(location.search));

$("#copy").addEventListener("click", async () => {
  const url = new URL(toSearch(state), location.href).href;
  try {
    await navigator.clipboard.writeText(url);
    $("#copied").textContent = "Copied.";
  } catch {
    $("#copied").textContent = url; // no clipboard access: show it instead
  }
});

function useSeed(seed) {
  state.seed = seed;
  state.requests = traffic(mulberry32(seed));
  render();
}
$("#seed").addEventListener("change", (e) => useSeed(Math.max(1, Math.floor(Number(e.target.value)) || 1)));
$("#next-seed").addEventListener("click", () => useSeed((state.seed ?? 0) + 1));
// For comparison: different on every click and every reload; only the URL (req=…) keeps it.
$("#unseeded").addEventListener("click", () => {
  state.seed = null;
  state.requests = traffic(Math.random);
  render();
});

for (const key of ["cursor", "capacity", "rate"]) {
  $(`#${key}`).addEventListener("input", (e) => {
    state[key] = Number(e.target.value);
    render();
  });
}

// Hand-edited traffic no longer comes from a seed.
const edited = () => (state.seed = null);
attachEditing($("#timeline"), { state: () => state, render, onEdit: edited });
$("#add").addEventListener("click", () => {
  edited();
  state.requests.push(state.cursor);
  render();
});
$("#clear").addEventListener("click", () => {
  edited();
  state.requests = [];
  render();
});
$("#reset").addEventListener("click", () => {
  state = structuredClone(DEFAULTS);
  render();
});

render();
