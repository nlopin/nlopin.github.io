// Editing the traffic on the timeline, by pointer and by keyboard.
// Both only change the state; render() draws the result.
import { DURATION } from "./model.js";
import { timeFromEvent, requestAt } from "./views.js";

const snap = (t) => Math.round(Math.min(DURATION, Math.max(0, t)) * 20) / 20; // 0.05 s grid

export function attachEditing(svg, { state, render, canEdit = () => true, onEdit = () => {} }) {
  // Pointer: click empty space to add, drag a request to move it,
  // click a request without dragging to remove it.
  let drag = null; // { i, x, moved }

  svg.addEventListener("pointerdown", (e) => {
    if (!canEdit()) return;
    const { requests } = state();
    const hit = requestAt(svg, e, requests);
    if (hit >= 0) {
      drag = { i: hit, x: e.clientX, moved: false };
    } else {
      requests.push(timeFromEvent(svg, e));
      drag = { i: requests.length - 1, x: e.clientX, moved: true };
    }
    onEdit();
    svg.setPointerCapture(e.pointerId); // keep getting moves outside the svg
    render();
  });

  svg.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (!drag.moved && Math.abs(e.clientX - drag.x) < 4) return; // a jitter, not a drag
    state().requests[drag.i] = timeFromEvent(svg, e);
    drag.moved = true;
    render();
  });

  svg.addEventListener("pointerup", () => {
    if (drag && !drag.moved) state().requests.splice(drag.i, 1);
    drag = null;
    render();
  });
  svg.addEventListener("pointercancel", () => (drag = null));

  // Keyboard: each request is focusable. Arrows move it (Shift: by 0.5 s), Delete removes it.
  svg.addEventListener("keydown", (e) => {
    const mark = e.target.closest("[data-i]");
    if (!mark || !canEdit()) return;
    const { requests } = state();
    const i = Number(mark.dataset.i);
    const by = e.shiftKey ? 0.5 : 0.05;
    let focus = i; // which request has focus after the change
    if (e.key === "ArrowLeft") requests[i] = snap(requests[i] - by);
    else if (e.key === "ArrowRight") requests[i] = snap(requests[i] + by);
    else if (e.key === "Delete" || e.key === "Backspace") {
      // Focus moves to the next request in time (or the previous, at the end), not the next index
      const order = requests.map((t, k) => k).sort((a, b) => requests[a] - requests[b]);
      const pos = order.indexOf(i);
      const next = order[pos + 1] ?? order[pos - 1];
      requests.splice(i, 1);
      focus = next == null ? null : next > i ? next - 1 : next;
    } else return;
    e.preventDefault();
    onEdit();
    render(); // the marks are new elements now: put focus back
    if (focus != null) svg.querySelector(`[data-i="${focus}"]`)?.focus();
    else document.querySelector("#add")?.focus(); // nothing left on the timeline
  });
}
