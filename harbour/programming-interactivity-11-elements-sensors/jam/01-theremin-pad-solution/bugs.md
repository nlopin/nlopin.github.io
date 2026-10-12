# `<theremin-pad>` · fix-it version · answer key

The broken copy, `../01-theremin-pad-fix/`, is this folder's code with the three bugs below. This key isn't linked from any page.

## 1. No sound at all, from the very first press. The console has a warning about the `AudioContext`.

- **Cause:** The `AudioContext` is created in `connectedCallback`, on page load: the autoplay policy leaves it `"suspended"`, and nothing resumes it.
- **Fix:** Create it in the `pointerdown` handler (`this.#audio ??= this.#createAudio()`) and call `resume()` there.

## 2. The picture is squashed: the circle under your finger is a flat oval, and the Hz readout is stretched wide and flat.

- **Cause:** The `ResizeObserver` swaps the sizes: the drawing buffer gets `clientHeight` as its width and `clientWidth` as its height, and CSS stretches that buffer back to the element's box. Positions still land under the finger because they're fractions of the buffer; shapes and text are distorted.
- **Fix:** `canvas.width = …clientWidth…; canvas.height = …clientHeight…`.

## 3. After the first note, choosing another wave in the page's menu doesn't change the sound.

- **Cause:** `observedAttributes` lists `"waves"`, so `attributeChangedCallback` never runs for `wave`.
- **Fix:** `static observedAttributes = ["wave"]`.
