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
  if (!playing) announce($("#announce"), $("#sentence").textContent); // not 60 sentences a second
  $("#cursor").value = state.cursor;
  $("#cursor-out").textContent = `${state.cursor.toFixed(1)} s`;
  $("#capacity").value = state.capacity;
  $("#capacity-out").textContent = `${state.capacity} tokens`;
  $("#rate").value = state.rate;
  $("#rate-out").textContent = `${state.rate} / s`;
  $("#seed").value = state.seed ?? "";
  if (!playing) saveToURL(); // the URL records where the reader stopped
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
  setPlaying(false); // a link shows a moment: don't play past it
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
    if (key === "cursor") setPlaying(false); // the reader took over time
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

// Time: a requestAnimationFrame loop that moves the cursor by the real
// time elapsed since the last frame. Pausing stops scheduling frames.
let playing = false;
let lastFrame = 0;

function frame(now) {
  if (!playing) return;
  const dt = lastFrame ? (now - lastFrame) / 1000 : 0;
  lastFrame = now;
  state.cursor = Math.min(10, state.cursor + dt);
  if (state.cursor >= 10) setPlaying(false);
  render();
  if (playing) requestAnimationFrame(frame);
}

function setPlaying(on) {
  if (on === playing) return;
  if (on && state.cursor >= 10) state.cursor = 0; // play again from the start
  playing = on;
  lastFrame = 0;
  $("#play").textContent = on ? "Pause" : "Play";
  if (on) requestAnimationFrame(frame);
  else render(); // announce and save where it stopped
}

$("#play").addEventListener("click", () => setPlaying(!playing));
// Rendering a frame rebuilds the marks; a focused or pressed mark would vanish under the reader.
$("#timeline").addEventListener("focusin", (e) => {
  if (!playing) return;
  const i = e.target.closest("[data-i]")?.dataset.i;
  setPlaying(false); // renders once more: new marks, so focus the same request again
  if (i != null) $("#timeline").querySelector(`[data-i="${i}"]`)?.focus();
});
$("#timeline").addEventListener("pointerdown", () => setPlaying(false), { capture: true });
$("#step").addEventListener("click", () => {
  setPlaying(false);
  state.cursor = Math.min(10, Math.round((state.cursor + 0.1) * 10) / 10);
  render();
});

render();
// Play on load only if the link didn't ask for a moment (?t=…) and the
// reader hasn't asked for less motion.
const askedForMoment = new URLSearchParams(location.search).has("t");
if (!askedForMoment && !matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(true);
