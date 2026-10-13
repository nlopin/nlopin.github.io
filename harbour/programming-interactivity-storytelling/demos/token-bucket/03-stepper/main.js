import { simulate, levelAt } from "./model.js";
import { renderBucket, renderTimeline, renderSentence, announce } from "./views.js";
import { attachEditing } from "./edit.js";
import { STEPS } from "./steps.js";

// The model's state, plus where the reader is in the explanation.
let state = {};
let step = 0;
let guess = null;

const $ = (s) => document.querySelector(s);
const has = (control) => STEPS[step].controls.includes(control);

function goTo(n) {
  step = Math.max(0, Math.min(STEPS.length - 1, n));
  state = structuredClone(STEPS[step].set); // each step starts from the author's defaults
  // The text is a live region: write it when the step changes, not on every render,
  // or a screen reader repeats it on every tick of a slider.
  const said = step === 1 && guess != null ? `<p>You said ${guess}.</p>` : "";
  $("#text").innerHTML = said + STEPS[step].html; // author-written HTML, never reader input
  render();
}

function render() {
  const s = STEPS[step];
  const hideOutcomes = s.hideOutcomes && guess == null;
  const result = simulate(state);
  const level = levelAt(result.curve, state.cursor);
  renderBucket($("#bucket"), { capacity: state.capacity, level });
  renderTimeline($("#timeline"), { ...state, result, hideOutcomes, revealUntil: s.reveal ? state.cursor : Infinity, editable: has("edit") });
  renderSentence($("#sentence"), { ...state, result, level, hideOutcomes });
  announce($("#announce"), $("#sentence").textContent);

  // The text, the counter and the controls are views of `step`.
  $("#step-count").textContent = `${step + 1} / ${STEPS.length}`;
  $("#predict").hidden = !s.predict;
  for (const c of document.querySelectorAll("[data-control]")) c.hidden = !has(c.dataset.control);
  $("#timeline").classList.toggle("editable", has("edit"));
  $("#back").disabled = step === 0;
  $("#next").disabled = step === STEPS.length - 1;

  $("#cursor").value = state.cursor;
  $("#cursor-out").textContent = `${state.cursor.toFixed(1)} s`;
  $("#capacity").value = state.capacity;
  $("#capacity-out").textContent = `${state.capacity} tokens`;
  $("#rate").value = state.rate;
  $("#rate-out").textContent = `${state.rate} / s`;
}

// Predict, then reveal: the answer is hidden until the reader commits.
$("#predict").addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;
  guess = Number(e.target.textContent);
  goTo(1);
  $("#text").focus(); // the button just disappeared: keep the reader where the answer is
});

$("#back").addEventListener("click", () => goTo(step - 1));
$("#next").addEventListener("click", () => goTo(step + 1));
$("#reset").addEventListener("click", () => goTo(step));

for (const key of ["cursor", "capacity", "rate"]) {
  $(`#${key}`).addEventListener("input", (e) => {
    state[key] = Number(e.target.value);
    render();
  });
}

// Editing the traffic is allowed only where the step says so.
attachEditing($("#timeline"), { state: () => state, render, canEdit: () => has("edit") });
$("#add").addEventListener("click", () => {
  state.requests.push(state.cursor);
  render();
});
$("#clear").addEventListener("click", () => {
  state.requests = [];
  render();
});

goTo(0);
