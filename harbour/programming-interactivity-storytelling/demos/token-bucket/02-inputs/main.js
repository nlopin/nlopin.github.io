import { simulate, levelAt } from "./model.js";
import { renderBucket, renderTimeline, renderSentence, announce } from "./views.js";
import { attachEditing } from "./edit.js";

const DEFAULTS = {
  capacity: 4,
  rate: 1,
  requests: [1, 1.15, 1.3, 1.45, 1.6, 1.75, 3, 4.5, 6, 7, 7.2, 7.4, 7.6, 9],
  cursor: 2,
};
let state = structuredClone(DEFAULTS);

const $ = (s) => document.querySelector(s);
// Inside the slides (?embed): no title, tighter spacing
if (new URLSearchParams(location.search).has("embed")) document.documentElement.classList.add("embed");

function render() {
  const result = simulate(state);
  const level = levelAt(result.curve, state.cursor);
  renderBucket($("#bucket"), { capacity: state.capacity, level });
  renderTimeline($("#timeline"), { ...state, result, editable: true });
  renderSentence($("#sentence"), { ...state, result, level });
  announce($("#announce"), $("#sentence").textContent);
  // The inputs are views too: they show the state, whoever changed it.
  $("#cursor").value = state.cursor;
  $("#cursor-out").textContent = `${state.cursor.toFixed(1)} s`;
  $("#capacity").value = state.capacity;
  $("#capacity-out").textContent = `${state.capacity} tokens`;
  $("#rate").value = state.rate;
  $("#rate-out").textContent = `${state.rate} / s`;
}

// Sliders: one input, one field of the state
for (const key of ["cursor", "capacity", "rate"]) {
  $(`#${key}`).addEventListener("input", (e) => {
    state[key] = Number(e.target.value);
    render();
  });
}

// The timeline: click, drag, arrow keys, Delete (edit.js)
attachEditing($("#timeline"), { state: () => state, render });

$("#add").addEventListener("click", () => {
  state.requests.push(state.cursor);
  render();
});
$("#clear").addEventListener("click", () => {
  state.requests = [];
  render();
});
$("#reset").addEventListener("click", () => {
  state = structuredClone(DEFAULTS);
  render();
});

render();
