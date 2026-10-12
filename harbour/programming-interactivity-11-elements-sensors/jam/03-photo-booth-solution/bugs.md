# `<photo-booth>` · fix-it version · answer key

The broken copy, `../03-photo-booth-fix/`, is this folder's code with the three bugs below. This key isn't linked from any page.

## 1. The countdown and the flashes run, but no strip appears. The console shows an error from the page's `photo` listener for every photo, then one about a canvas with a width or height of 0.

- **Cause:** The capture canvas is sized from `video.width` / `video.height`, the element's attributes (0 here), not the stream's picture.
- **Fix:** `canvas.width = video.videoWidth; canvas.height = video.videoHeight;`

## 2. `document.querySelector("photo-booth").remove()`: the camera light stays on.

- **Cause:** `disconnectedCallback` no longer calls `stop()`, so the tracks keep running.
- **Fix:** Call `this.stop()` in `disconnectedCallback`.

## 3. Click *Take a strip* twice quickly: the countdown numbers jump, and you get eight photos and two strips.

- **Cause:** Nothing stops a second `shoot()` while the first runs: two loops share the countdown and the camera.
- **Fix:** `if (this.#run) return;` at the start of `shoot()`.
