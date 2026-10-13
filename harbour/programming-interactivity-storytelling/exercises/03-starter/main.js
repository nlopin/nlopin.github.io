// One state. Render functions that read it. Inputs that change it.
// Replace every TODO; keep the structure.
import { compute } from "./model.js";

// Frames 2–4 of your storyboard. Each step sets the figure's starting state
// (the author's defaults) and lists the controls the reader has.
const STEPS = [
  {
    // Frame 2 · the first touch: one control.
    text: "TODO: what the reader reads, and what to try.",
    set: { a: 3, b: 5 },
    controls: ["a"],
  },
  {
    // Frame 3 · the second control. Start the text with "But" or "Therefore".
    text: "TODO: But … / Therefore …",
    set: { a: 3, b: 5 },
    controls: ["a", "b"],
  },
  {
    // Frame 4 · the surprise. Pick `set` so it happens for every reader, every time.
    text: "TODO: the surprise.",
    set: { a: 9, b: 5 },
    controls: ["a", "b"],
  },
];

let step = 0;
let state = {};

const $ = (s) => document.querySelector(s);

function goTo(n) {
  step = Math.max(0, Math.min(STEPS.length - 1, n));
  state = structuredClone(STEPS[step].set);
  $("#text").textContent = STEPS[step].text; // a live region: write it only when the step changes
  render();
}

function render() {
  const s = STEPS[step];
  $("#count").textContent = `${step + 1} / ${STEPS.length}`;
  for (const c of document.querySelectorAll("[data-control]")) {
    c.hidden = !s.controls.includes(c.dataset.control);
  }
  for (const input of document.querySelectorAll("input[data-key]")) {
    input.value = state[input.dataset.key];
    document.querySelector(`[data-for="${input.dataset.key}"]`).textContent = state[input.dataset.key];
  }
  $("#back").disabled = step === 0;
  $("#next").disabled = step === STEPS.length - 1;
  renderFigure($("#figure"), state);
  $("#alt").textContent = describe(state);
}

// TODO: draw the state. This placeholder draws two bars.
const NS = "http://www.w3.org/2000/svg";
function renderFigure(svg, { a, b }) {
  svg.replaceChildren();
  [a, b].forEach((v, i) => {
    const bar = document.createElementNS(NS, "rect");
    bar.setAttribute("x", 40);
    bar.setAttribute("y", 60 + i * 100);
    bar.setAttribute("width", v * 70);
    bar.setAttribute("height", 60);
    bar.setAttribute("class", i ? "b" : "a");
    svg.append(bar);
  });
}

// TODO: the same state in words, from the model's result.
function describe(state) {
  const { bigger, difference } = compute(state);
  return `a is ${state.a}, b is ${state.b}: ${bigger === "neither" ? "equal" : `${bigger} is bigger by ${difference}`}.`;
}

for (const input of document.querySelectorAll("input[data-key]")) {
  input.addEventListener("input", () => {
    state[input.dataset.key] = Number(input.value);
    render();
  });
}
$("#back").addEventListener("click", () => goTo(step - 1));
$("#next").addEventListener("click", () => goTo(step + 1));
$("#reset").addEventListener("click", () => goTo(step));

goTo(0);
