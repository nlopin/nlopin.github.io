// Three views of one state: the bucket, the timeline, a sentence.
// Each is a function of its arguments; none keeps state of its own.
import { DURATION } from "./model.js";

const NS = "http://www.w3.org/2000/svg";
function el(tag, attrs = {}, text) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (text != null) node.textContent = text;
  return node;
}

// Timeline geometry, in viewBox units (0 0 800 250)
const X0 = 50, X1 = 780, TOP = 20, BASE = 160, MARKS = 200;
const x = (t) => X0 + (t / DURATION) * (X1 - X0);
export const timeAtX = (px) => Math.min(DURATION, Math.max(0, ((px - X0) / (X1 - X0)) * DURATION));

export function renderBucket(svg, { capacity, level }) {
  const r = 20, cell = 50, cols = 2;
  const rows = Math.ceil(capacity / cols);
  const bottom = 260, top = bottom - rows * cell - 10; // capacity up to 8 fits the viewBox
  svg.replaceChildren(el("rect", { class: "bucket", x: 10, y: top, width: 120, height: bottom - top, rx: 8 }));
  for (let k = 0; k < capacity; k++) {
    const cx = 45 + (k % cols) * cell, cy = bottom - 30 - Math.floor(k / cols) * cell;
    const fill = Math.min(1, Math.max(0, level - k));
    svg.append(el("circle", { class: "slot", cx, cy, r }));
    if (fill > 0) svg.append(el("circle", { class: "token", cx, cy, r: r * Math.sqrt(fill) }));
  }
  svg.append(el("text", { class: "big", x: 70, y: 295, "text-anchor": "middle" }, `${level.toFixed(1)} / ${capacity}`));
  svg.setAttribute("aria-label", `Bucket: ${level.toFixed(1)} of ${capacity} tokens`);
}

export function renderTimeline(svg, { capacity, requests, cursor, result, hideOutcomes = false, editable = false, revealUntil = Infinity }) {
  const y = (v) => BASE - (v / capacity) * (BASE - TOP);
  svg.replaceChildren();
  for (let s = 0; s <= DURATION; s++) {
    svg.append(el("line", { class: "grid", x1: x(s), x2: x(s), y1: TOP, y2: MARKS + 14 }));
    svg.append(el("text", { class: "tick", x: x(s), y: 240, "text-anchor": "middle" }, `${s} s`));
  }
  svg.append(el("line", { class: "axis", x1: X0, x2: X1, y1: BASE, y2: BASE }));
  svg.append(el("text", { class: "tick", x: X0 - 8, y: TOP + 5, "text-anchor": "end" }, capacity));
  svg.append(el("text", { class: "tick", x: X0 - 8, y: BASE + 5, "text-anchor": "end" }, 0));
  if (!hideOutcomes) { // the level line would give the answer away
    const points = result.curve.map(([t, v]) => `${x(t)},${y(v)}`).join(" ");
    svg.append(el("polyline", { class: "level", points }));
  }

  // In time order, so Tab moves through the requests left to right
  const order = requests.map((t, i) => [t, i]).sort((a, b) => a[0] - b[0]);
  order.forEach(([t, i]) => {
    const cls = hideOutcomes || t > revealUntil ? "pending" : result.outcome[i]; // revealUntil: outcomes appear as time passes them
    const g = el("g", { class: `req ${cls}`, "data-i": i });
    if (editable) { // each request is a control: focusable, named, operable from the keyboard
      const what = cls === "pending" ? "" : cls === "ok" ? ", accepted" : ", refused";
      g.setAttribute("tabindex", 0);
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", `Request at ${t.toFixed(2)} s${what}. Arrow keys move it, Delete removes it.`);
    }
    g.append(el("circle", { cx: x(t), cy: MARKS, r: 7 }));
    if (cls === "refused") g.append(el("path", { class: "x", d: `M${x(t) - 3},${MARKS - 3}l6,6m0,-6l-6,6` })); // not colour alone
    g.append(el("circle", { class: "hit", cx: x(t), cy: MARKS, r: 18 })); // grab cursor area; requestAt() decides what is hit
    svg.append(g);
  });
  svg.append(el("line", { class: "cursor", x1: x(cursor), x2: x(cursor), y1: TOP - 10, y2: MARKS + 14 }));
  svg.setAttribute("role", editable ? "group" : "img");
  svg.setAttribute("aria-label", `Timeline: ${requests.length} requests over ${DURATION} seconds`);
}

export function renderSentence(p, { capacity, requests, cursor, result, level, hideOutcomes = false }) {
  const sent = requests.filter((t) => t <= cursor).length;
  const passed = requests.filter((t, i) => t <= cursor && result.outcome[i] === "ok").length;
  const first = `At ${cursor.toFixed(1)} s the bucket holds ${level.toFixed(1)} of ${capacity} tokens.`;
  const requestsWord = sent === 1 ? "request" : "requests";
  p.textContent = hideOutcomes
    ? `${first} ${sent} ${requestsWord} sent so far.`
    : `${first} ${passed} of ${sent} ${requestsWord} so far got through.`;
}

// A screen reader hears the sentence once the reader stops moving a control,
// not on every tick of a slider. `region` is an empty element with aria-live.
let announceTimer;
export function announce(region, text) {
  clearTimeout(announceTimer);
  announceTimer = setTimeout(() => (region.textContent = text), 700);
}

// The request under the pointer: the nearest one in time, if the pointer is on the
// row of marks and close enough. Chosen by distance, not by which circle is on top,
// so in a tight burst the request you aim at is the one you get.
export function requestAt(svg, e, requests) {
  const ctm = svg.getScreenCTM();
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
  const reach = Math.max(14, 22 / ctm.a); // at least 22 screen pixels, however small the svg
  if (Math.abs(p.y - MARKS) > Math.max(20, 26 / ctm.d)) return -1;
  let best = -1;
  requests.forEach((t, i) => {
    const d = Math.abs(x(t) - p.x);
    if (d <= reach && (best < 0 || d < Math.abs(x(requests[best]) - p.x))) best = i;
  });
  return best;
}

// Pointer position → seconds on the timeline
export function timeFromEvent(svg, e) {
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
  return Math.round(timeAtX(p.x) * 20) / 20;
}
