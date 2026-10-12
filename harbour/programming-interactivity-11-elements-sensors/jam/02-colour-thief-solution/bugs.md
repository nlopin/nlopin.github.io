# `<colour-thief>` · fix-it version · answer key

The broken copy, `../02-colour-thief-fix/`, is this folder's code with the three bugs below. This key isn't linked from any page.

## 1. Pick two colours and reload: the palette is empty.

- **Cause:** `attributeChangedCallback` runs for `max` during the upgrade, before `connectedCallback` has loaded the palette, and saves the empty one over it.
- **Fix:** Ignore attribute changes until the palette is loaded (a `#loaded` flag set at the end of `connectedCallback`).

## 2. Swatches appear, but the page's heading never takes the colour, and the Events log stays empty.

- **Cause:** The `pick` event is created without `bubbles: true`; the page's listener is on `document`.
- **Fix:** `new CustomEvent("pick", { bubbles: true, detail: { hex } })`.

## 3. After a reload, Work and Home show the same palette.

- **Cause:** `storageKey` returns one constant, so every thief reads and writes the same entry.
- **Fix:** Build the key from the attribute: ``colour-thief:${this.getAttribute("storage-key") ?? "default"}``.
