# `<clap-switch>` · fix-it version · answer key

The broken copy, `../05-clap-switch-fix/`, is this folder's code with the three bugs below. This key isn't linked from any page.

## 1. Three claps switch it too, not only two.

- **Cause:** The switch flips as soon as the count reaches `claps`, before the sequence is over; the third clap starts a new sequence.
- **Fix:** Count the sequence when it's over: after each clap, a timeout of `SETTLE` ms checks `this.#count === this.claps`.

## 2. The page lights up on two claps, but the bulb inside the element stays grey, and `clap-switch[on]` in the page's CSS never matches.

- **Cause:** `on` is stored in a private field, not reflected to an attribute, so neither `:host([on])` nor the page's selector can see it.
- **Fix:** `get on() { return this.hasAttribute("on"); }` and `set on(v) { this.toggleAttribute("on", Boolean(v)); }`.

## 3. Move the threshold slider: the red line on the meter stays where it was.

- **Cause:** `observedAttributes` is missing, so `attributeChangedCallback` never runs and the marker isn't moved.
- **Fix:** `static observedAttributes = ["threshold"]`.
