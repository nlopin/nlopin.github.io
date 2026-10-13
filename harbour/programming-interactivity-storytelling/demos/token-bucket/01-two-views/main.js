import { simulate, levelAt } from "./model.js";
import { renderBucket, renderTimeline, renderSentence, announce } from "./views.js";

// One state. Every view below is computed from it.
const state = {
  capacity: 4, // tokens the bucket holds
  rate: 1, // tokens added per second
  requests: [1, 1.15, 1.3, 1.45, 1.6, 1.75, 3, 4.5, 6, 7, 7.2, 7.4, 7.6, 9], // seconds
  cursor: 2, // the moment the bucket view shows
};

const $ = (s) => document.querySelector(s);

function render() {
  const result = simulate(state);
  const level = levelAt(result.curve, state.cursor);
  renderBucket($("#bucket"), { capacity: state.capacity, level });
  renderTimeline($("#timeline"), { ...state, result });
  renderSentence($("#sentence"), { ...state, result, level });
  announce($("#announce"), $("#sentence").textContent);
  $("#cursor").value = state.cursor;
  $("#cursor-out").textContent = `${state.cursor.toFixed(1)} s`;
}

$("#cursor").addEventListener("input", (e) => {
  state.cursor = Number(e.target.value);
  render();
});

render();
