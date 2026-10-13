import { simulate, levelAt } from "./model.js";
import { renderBucket, renderTimeline, renderSentence, announce } from "./views.js";
import { attachEditing } from "./edit.js";
import { STEPS } from "./steps.js";

let state = {};
let step = -1;
let revealed = false; // a gate: the answer and what follows stay closed until the reader guesses

const $ = (s) => document.querySelector(s);

// One <section> per step. Scrolling decides which step the figure shows.
// Everything after the question stays hidden until the reader answers it.
const sections = STEPS.map((s, i) => {
  const section = document.createElement("section");
  section.dataset.step = i;
  section.innerHTML = s.html; // author-written HTML, never reader input
  if (s.predict) {
    const row = document.createElement("div");
    row.className = "row";
    row.id = "predict";
    row.innerHTML = "<span>Your guess:</span>" + [0, 1, 2, 3, 4, 5, 6].map((n) => `<button>${n}</button>`).join("") +
      `<button data-skip>Skip</button>`;
    section.append(row);
  }
  if (i > 0) section.hidden = true;
  $("#steps").append(section);
  return section;
});

function goTo(n) {
  if (n === step) return;
  step = n;
  state = structuredClone(STEPS[step].set);
  render();
}

function render() {
  const s = STEPS[step];
  const hideOutcomes = s.hideOutcomes && !revealed;
  const result = simulate(state);
  const level = levelAt(result.curve, state.cursor);
  renderBucket($("#bucket"), { capacity: state.capacity, level });
  renderTimeline($("#timeline"), { ...state, result, hideOutcomes, revealUntil: s.reveal ? state.cursor : Infinity, editable: s.controls.includes("edit") });
  renderSentence($("#sentence"), { ...state, result, level, hideOutcomes });
  announce($("#announce"), $("#sentence").textContent);

  sections.forEach((sec, i) => sec.classList.toggle("active", i === step));
  // Controls not yet introduced keep their space (and can't be focused), so the
  // sticky figure keeps one height and the trigger line below doesn't move.
  for (const c of document.querySelectorAll("[data-control]")) {
    c.style.visibility = s.controls.includes(c.dataset.control) ? "" : "hidden";
  }
  $("#timeline").classList.toggle("editable", s.controls.includes("edit"));
  $("#cursor").value = state.cursor;
  $("#cursor-out").textContent = `${state.cursor.toFixed(1)} s`;
  $("#capacity").value = state.capacity;
  $("#capacity-out").textContent = `${state.capacity} tokens`;
  $("#rate").value = state.rate;
  $("#rate-out").textContent = `${state.rate} / s`;
}

// The step whose section crosses a horizontal line is the active one. On a wide
// screen the line is the middle of the viewport. On a phone the figure sticks to
// the top and the steps are short cards: the line sits 60% of the way down the
// space the figure leaves free, so the active card is always below the figure.
let observer;
function observe() {
  observer?.disconnect();
  const narrow = matchMedia("(max-width: 760px)").matches;
  const covered = narrow ? $(".sticky").offsetHeight : 0;
  const line = Math.round(narrow ? covered + (innerHeight - covered) * 0.6 : innerHeight / 2);
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) goTo(Number(entry.target.dataset.step));
      }
    },
    { rootMargin: `-${line}px 0px -${innerHeight - line - 1}px 0px` },
  );
  sections.forEach((sec) => observer.observe(sec));
}
let resizeTimer;
addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(observe, 150);
});

$("#predict").addEventListener("click", (e) => {
  if (e.target.tagName !== "BUTTON") return;
  revealed = true;
  if (!("skip" in e.target.dataset)) {
    sections[1].querySelector("p").insertAdjacentText("afterbegin", `You said ${e.target.textContent}. `);
    e.currentTarget.replaceChildren(`Your guess: ${e.target.textContent}`);
  } else e.currentTarget.remove();
  sections.forEach((sec) => (sec.hidden = false));
  render();
  sections[1].tabIndex = -1;
  sections[1].focus({ preventScroll: true }); // the buttons are gone: focus moves to the answer
  sections[1].scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
});

for (const key of ["cursor", "capacity", "rate"]) {
  $(`#${key}`).addEventListener("input", (e) => {
    state[key] = Number(e.target.value);
    render();
  });
}

attachEditing($("#timeline"), { state: () => state, render, canEdit: () => STEPS[step].controls.includes("edit") });
$("#add").addEventListener("click", () => { state.requests.push(state.cursor); render(); });
$("#clear").addEventListener("click", () => { state.requests = []; render(); });

goTo(0);
observe();
