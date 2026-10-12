# `<window-pong>` · fix-it version · answer key

The broken copy, `../06-window-pong-fix/`, is this folder's code with the three bugs below. This key isn't linked from any page.

## 1. Open the page in two windows: both say they're left.

- **Cause:** Each window builds the list of players with itself first and doesn't sort it, so each one is "first" and takes left.
- **Fix:** Sort by `born`, then `id`, so every window gets the same order.

## 2. Switch one window to another tab for a few seconds and come back: the ball has jumped, or a point has been scored.

- **Cause:** The frame time isn't clamped: after a background pause the first `dt` is seconds long and the ball moves that far in one step.
- **Fix:** `const dt = Math.min(0.05, (now - this.#last) / 1000);`

## 3. Close one window: the other never notices. It doesn't say so, and the ball doesn't come back.

- **Cause:** No `bye` on `pagehide` (`disconnectedCallback` doesn't run when a page closes), and the expiry test is backwards (`peer.seen - now`), so a silent peer is never dropped.
- **Fix:** `window.addEventListener("pagehide", () => this.#send("bye"))`, and `if (now - peer.seen > GONE)`. Either fix alone makes the symptom go away; both are bugs.
