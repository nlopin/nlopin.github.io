import { simulate, levelAt } from "./model.js";
import { renderBucket, renderTimeline, renderSentence, announce } from "./views.js";
import { attachEditing } from "./edit.js";
import { mulberry32, traffic } from "./rng.js";

// The traffic is generated from a seed, so the seed is part of the state:
// it reproduces the requests exactly.
const DEFAULTS = { capacity: 4, rate: 1, seed: 7, cursor: 2 };
DEFAULTS.requests = traffic(mulberry32(DEFAULTS.seed));
let state = structuredClone(DEFAULTS);

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
}

function useSeed(seed) {
  state.seed = seed;
  state.requests = traffic(mulberry32(seed));
  render();
}
$("#seed").addEventListener("change", (e) => useSeed(Math.max(1, Math.floor(Number(e.target.value)) || 1)));
$("#next-seed").addEventListener("click", () => useSeed((state.seed ?? 0) + 1));
// For comparison: different on every click and every reload, and no way to get it back.
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
